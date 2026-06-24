import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { desplegarContrato } from '../../services/blockchain.service.js';
import { registrarLog } from '../../services/log.service.js';
import { ValidacionError, InternoError, NoEncontradoError, ConflictoError } from '../../utils/errors.js';
import type { JwtPayload } from '../../types/auth.js';
import type { CrearEleccionInput } from './admin.schemas.js';

// ─── Nombre fijo del voto en blanco ─────────────────────────
// El contrato NO lo agrega automáticamente: se incluye explicitamente
// al final del array _listas antes de desplegar.
const VOTO_EN_BLANCO = 'Voto en blanco';

// ─── DTOs de respuesta ───────────────────────────────────────

interface ListaResumenDTO {
  id: number;
  nombre: string;
  indice: number;
  color: string | null;
}

interface EleccionResumenDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: string;
  contrato_address: string | null;
  listas: ListaResumenDTO[];
}

interface EleccionesAgrupadas {
  creada: EleccionResumenDTO[];
  publicada: EleccionResumenDTO[];
  finalizada: EleccionResumenDTO[];
}

// ─── GET /api/admin/elecciones ───────────────────────────────

/**
 * Devuelve todas las elecciones agrupadas por estado (creada / publicada /
 * finalizada). Dentro de cada grupo, orden por fecha_inicio DESC (las más
 * recientes o próximas primero). Solo lee BD — no consulta blockchain.
 */
export async function listarEleccionesAgrupadas(): Promise<EleccionesAgrupadas> {
  const elecciones = await prisma.eleccion.findMany({
    orderBy: { fechaInicio: 'desc' },
    include: {
      listas: {
        orderBy: { indice: 'asc' },
        select: { id: true, nombre: true, indice: true, color: true },
      },
    },
  });

  const agrupadas: EleccionesAgrupadas = { creada: [], publicada: [], finalizada: [] };

  for (const e of elecciones) {
    agrupadas[e.estado].push({
      id: e.id,
      nombre: e.nombre,
      fecha_inicio: e.fechaInicio.toISOString(),
      fecha_cierre: e.fechaCierre.toISOString(),
      estado: e.estado,
      contrato_address: e.contratoAddress ?? null,
      listas: e.listas,
    });
  }

  return agrupadas;
}

// ─── GET /api/admin/padron ───────────────────────────────────

/**
 * Devuelve el padrón de votantes con sus datos públicos (sin password).
 * Si se pasa `busqueda`, filtra por coincidencia parcial case-insensitive
 * en legajo o nombre_completo. Ordenado por nombre_completo ASC.
 */
export async function listarPadron(busqueda?: string) {
  const termino = busqueda?.trim();

  const where = termino
    ? {
        OR: [
          { legajo: { contains: termino, mode: 'insensitive' as const } },
          { nombreCompleto: { contains: termino, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const votantes = await prisma.votante.findMany({
    where,
    orderBy: { nombreCompleto: 'asc' },
    select: {
      id: true,
      legajo: true,
      nombreCompleto: true,
      carrera: true,
    },
  });

  return {
    total: votantes.length,
    votantes: votantes.map((v) => ({
      id: v.id,
      legajo: v.legajo,
      nombre_completo: v.nombreCompleto,
      carrera: v.carrera,
    })),
  };
}

// ─── GET /api/admin/padron/descargar ────────────────────────

// Escapa un campo según RFC 4180: si contiene coma, comilla doble o salto
// de línea lo envuelve en comillas dobles y duplica las comillas internas.
function escaparCampoCSV(valor: string): string {
  if (valor.includes(',') || valor.includes('"') || valor.includes('\n') || valor.includes('\r')) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Genera el padrón completo como CSV RFC 4180 con BOM UTF-8.
 * Incluye correo y activo (a diferencia de la vista de pantalla).
 * Nunca incluye passwordHash.
 */
export async function descargarPadronCsv(): Promise<string> {
  const votantes = await prisma.votante.findMany({
    orderBy: { nombreCompleto: 'asc' },
    select: {
      legajo: true,
      nombreCompleto: true,
      carrera: true,
      correo: true,
      activo: true,
    },
  });

  const encabezado = 'legajo,nombre_completo,carrera,correo,activo';

  const filas = votantes.map((v) =>
    [
      escaparCampoCSV(v.legajo),
      escaparCampoCSV(v.nombreCompleto),
      escaparCampoCSV(v.carrera),
      escaparCampoCSV(v.correo),
      escaparCampoCSV(String(v.activo)),
    ].join(','),
  );

  // BOM UTF-8 (﻿) para que Excel interprete correctamente los acentos.
  return '﻿' + [encabezado, ...filas].join('\r\n');
}

// ─── DELETE /api/admin/elecciones/:id ───────────────────────

/**
 * Elimina una elección de la BD siempre que no haya comenzado.
 * El criterio es defensivo: comprueba estado === 'creada' Y fecha_inicio
 * futura, por si el job de apertura automática no corrió todavía.
 * El contrato en BFA no se toca — es inmutable y queda huérfano sin votos.
 * Las listas se eliminan automáticamente por ON DELETE CASCADE.
 */
export async function eliminarEleccion(
  id: number,
  adminPayload: JwtPayload,
  ip: string,
): Promise<void> {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id },
    select: { id: true, nombre: true, estado: true, fechaInicio: true },
  });

  if (!eleccion) {
    throw new NoEncontradoError(`No existe una elección con id ${id}.`);
  }

  const ahora = new Date();
  if (eleccion.estado !== 'creada' || eleccion.fechaInicio <= ahora) {
    throw new ConflictoError(
      'No se puede eliminar una elección que ya comenzó o cuya fecha de inicio ya pasó.',
    );
  }

  await prisma.eleccion.delete({ where: { id } });

  await registrarLog({
    tipoEvento: 'eleccion_eliminada',
    rolUsuario: 'administrador',
    descripcion: `Elección "${eleccion.nombre}" (id ${id}) eliminada.`,
    idUsuario: adminPayload.sub,
    ip,
  });
}

// ─── POST /api/admin/elecciones ──────────────────────────────

/**
 * Crea una elección nueva:
 *  1. Valida negocio (fechas, listas únicas).
 *  2. Despliega el contrato en BFA (operación no reversible).
 *  3. Guarda la elección + listas en BD dentro de una transacción.
 *  4. Registra el evento en LOG.
 *
 * Orden deploy→BD: si la BD falla, el contrato queda huérfano (inofensivo).
 * Si se invirtiese y el deploy fallara, habría un registro en BD sin contrato
 * (estado inválido).
 */
export async function crearEleccion(
  input: CrearEleccionInput,
  adminPayload: JwtPayload,
  ip: string,
) {
  const { nombre, fecha_inicio, fecha_cierre, listas } = input;

  const inicio = new Date(fecha_inicio);
  const cierre = new Date(fecha_cierre);
  const ahora = new Date();

  // ── Validaciones de negocio ──────────────────────────────
  if (inicio.getTime() <= ahora.getTime()) {
    throw new ValidacionError('La fecha de inicio no puede ser en el pasado.');
  }
  if (cierre.getTime() <= inicio.getTime()) {
    throw new ValidacionError('La fecha de cierre debe ser posterior a la fecha de inicio.');
  }

  const nombresListas = listas.map((l) => l.nombre);

  const hayDuplicados = new Set(nombresListas).size !== nombresListas.length;
  if (hayDuplicados) {
    throw new ValidacionError(
      'No puede haber dos listas con el mismo nombre en la misma elección.',
    );
  }

  if (nombresListas.includes(VOTO_EN_BLANCO)) {
    throw new ValidacionError(`El nombre "${VOTO_EN_BLANCO}" está reservado.`);
  }

  const eleccionActiva = await prisma.eleccion.findFirst({
    where: { nombre, estado: { in: ['creada', 'publicada'] } },
    select: { id: true },
  });
  if (eleccionActiva) {
    throw new ValidacionError(
      `Ya existe una elección con el nombre "${nombre}" en estado activo (creada o publicada).`,
    );
  }

  // ── Array para el contrato: listas del admin + voto en blanco ──
  // El índice de cada elemento corresponde a su posición en votosPorLista[].
  const listasContrato = [...nombresListas, VOTO_EN_BLANCO];

  const fechaAperturaUnix = Math.floor(inicio.getTime() / 1000);
  const fechaCierreUnix = Math.floor(cierre.getTime() / 1000);

  // ── 1. Deploy en BFA (primero; si falla, nada se escribe en BD) ──
  // desplegarContrato lanza InternoError si el bytecode no está o falla el deploy.
  const { address: contratoAddress } = await desplegarContrato({
    nombreEleccion: nombre,
    listas: listasContrato,
    fechaAperturaUnix,
    fechaCierreUnix,
  });

  // ── 2. Guardar en BD dentro de una transacción ──────────────
  // Si esto falla, el contrato ya está en BFA (huérfano, inofensivo).
  let eleccion;
  try {
    eleccion = await prisma.$transaction(async (tx) => {
      return tx.eleccion.create({
        data: {
          nombre,
          fechaInicio: inicio,
          fechaCierre: cierre,
          contratoAddress,
          estado: 'creada',
          listas: {
            create: listasContrato.map((nombreLista, indice) => ({
              nombre: nombreLista,
              // El índice 0-based coincide exactamente con la posición
              // del elemento en el array _listas del contrato.
              indice,
              esBlanco: nombreLista === VOTO_EN_BLANCO,
              color: nombreLista === VOTO_EN_BLANCO ? '#FFFFFF' : (listas[indice]?.color ?? null),
            })),
          },
        },
        include: {
          listas: {
            orderBy: { indice: 'asc' },
          },
        },
      });
    });
  } catch (err) {
    logger.error(
      { err, contratoAddress },
      'Deploy exitoso pero fallo la escritura en BD. Contrato huerfano en BFA.',
    );
    throw new InternoError(
      'El contrato fue desplegado en BFA pero no se pudo guardar la eleccion en la base de datos.',
    );
  }

  // ── 3. Registro en LOG (best-effort; no falla la operacion principal) ──
  await registrarLog({
    tipoEvento: 'eleccion_creada',
    rolUsuario: 'administrador',
    descripcion: `Eleccion "${nombre}" creada (id ${eleccion.id}), contrato ${contratoAddress}`,
    idUsuario: adminPayload.sub,
    ip,
  });

  return {
    id: eleccion.id,
    nombre: eleccion.nombre,
    fecha_inicio: eleccion.fechaInicio.toISOString(),
    fecha_cierre: eleccion.fechaCierre.toISOString(),
    estado: eleccion.estado,
    contrato_address: eleccion.contratoAddress,
    listas: eleccion.listas.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      indice: l.indice,
      es_blanco: l.esBlanco,
      color: l.color,
    })),
  };
}
