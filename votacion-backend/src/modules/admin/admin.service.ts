import { ethers } from 'ethers';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import {
  desplegarContrato,
  contratoTieneCodigo,
  obtenerNombreEleccion,
  obtenerFechaApertura,
  obtenerFechaCierre,
  obtenerCantidadListas,
  obtenerListaPorIndice,
  obtenerVotos,
  yaVotoEnContrato,
  obtenerSaldoBackend,
} from '../../services/blockchain.service.js';
import { registrarLog } from '../../services/log.service.js';
import {
  ValidacionError,
  InternoError,
  NoEncontradoError,
  ConflictoError,
  ServicioNoDisponibleError,
} from '../../utils/errors.js';
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

// ─── GET /api/admin/elecciones/:id ───────────────────────────

/**
 * Devuelve el detalle de una elección para el admin: a diferencia de
 * GET /api/votante/elecciones/:id, no calcula ya_voto (no hay votante) y
 * sí puede devolver elecciones en estado "creada" — el admin necesita ver
 * el detalle de lo que todavía no publicó.
 */
export async function obtenerDetalleEleccionAdmin(eleccionId: number) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      fechaCierre: true,
      estado: true,
      contratoAddress: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: { id: true, nombre: true, esBlanco: true, indice: true, color: true },
      },
    },
  });

  if (!eleccion) {
    throw new NoEncontradoError(`No existe una elección con id ${eleccionId}.`);
  }

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
      es_blanco: l.esBlanco,
      indice: l.indice,
      color: l.color,
    })),
  };
}

// ─── GET /api/admin/padron ───────────────────────────────────

/**
 * Devuelve el padrón de votantes con sus datos públicos (sin password).
 * Solo incluye votantes `activo: true` — mismo criterio que el resto de la
 * app usa para definir "el padrón" (ver `totalPadron` en
 * eleccion.service.ts y el check de login en auth.service.ts). Un votante
 * inactivo no puede loguearse ni votar, así que tampoco pertenece al
 * padrón que ve el admin acá (si hace falta auditar inactivos también, para
 * eso está `descargarPadronCsv`, que sí los incluye con su columna `activo`).
 * Si se pasa `busqueda`, filtra además por coincidencia parcial
 * case-insensitive en legajo o nombre_completo. Ordenado por
 * nombre_completo ASC.
 */
export async function listarPadron(busqueda?: string) {
  const termino = busqueda?.trim();

  const where = {
    activo: true,
    ...(termino
      ? {
          OR: [
            { legajo: { contains: termino, mode: 'insensitive' as const } },
            { nombreCompleto: { contains: termino, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const votantes = await prisma.votante.findMany({
    where,
    orderBy: { nombreCompleto: 'asc' },
    select: {
      id: true,
      legajo: true,
      nombreCompleto: true,
      carrera: true,
      correo: true,
    },
  });

  return {
    total: votantes.length,
    votantes: votantes.map((v) => ({
      id: v.id,
      legajo: v.legajo,
      nombre_completo: v.nombreCompleto,
      carrera: v.carrera,
      correo: v.correo,
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

// ─── GET /api/admin/elecciones/:id/participacion/descargar ──

const ZONA_HORARIA_LOCAL = 'America/Argentina/Mendoza';

/**
 * Formatea una fecha en hora local de Mendoza (UTC-3, sin horario de verano)
 * como 'YYYY-MM-DD HH:mm:ss'. Todo el resto de la app manda fechas como ISO
 * UTC y deja que el frontend las convierta a hora local para mostrarlas (ver
 * `formatFechaHora` en ambos frontends) — acá no hay frontend de por medio
 * (el CSV se abre directo en Excel), así que la conversión hay que hacerla
 * server-side explícitamente contra la zona horaria de la institución, en vez
 * de asumir que el proceso de Node corre en esa misma zona horaria.
 */
function formatFechaHoraLocal(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_LOCAL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(fecha);
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${obtener('year')}-${obtener('month')}-${obtener('day')} ${obtener('hour')}:${obtener('minute')}:${obtener('second')}`;
}

/**
 * Genera un CSV RFC 4180 (BOM UTF-8) con el padrón completo (mismo criterio
 * `activo: true` que `listarPadron`) cruzado contra quién votó en una
 * elección finalizada: legajo, nombre, carrera, correo, voto (Sí/No) y
 * fecha_voto. Nunca expone a qué lista votó cada persona — Participacion no
 * tiene esa relación (ver modelo en schema.prisma, preserva el anonimato).
 */
export async function descargarParticipacionEleccionCsv(id: number): Promise<string> {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id },
    select: { estado: true },
  });

  if (!eleccion) {
    throw new NoEncontradoError(`No existe una elección con id ${id}.`);
  }
  if (eleccion.estado !== 'finalizada') {
    throw new ConflictoError(
      'La elección todavía no finalizó; no se puede exportar la participación.',
    );
  }

  const votantes = await prisma.votante.findMany({
    where: { activo: true },
    orderBy: { nombreCompleto: 'asc' },
    select: {
      legajo: true,
      nombreCompleto: true,
      carrera: true,
      correo: true,
      participaciones: {
        where: { idEleccion: id },
        select: { fechaVoto: true },
      },
    },
  });

  const encabezado = 'legajo,nombre_completo,carrera,correo,voto,fecha_voto';

  const filas = votantes.map((v) => {
    const participacion = v.participaciones[0];
    return [
      escaparCampoCSV(v.legajo),
      escaparCampoCSV(v.nombreCompleto),
      escaparCampoCSV(v.carrera),
      escaparCampoCSV(v.correo),
      escaparCampoCSV(participacion ? 'Sí' : 'No'),
      escaparCampoCSV(participacion ? formatFechaHoraLocal(participacion.fechaVoto) : ''),
    ].join(',');
  });

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

// ─── GET /api/admin/elecciones/:id/integridad ─────────────────
// HU-24: auditoría de integridad, BD vs. contrato en BFA.

interface EleccionParaIntegridad {
  id: number;
  nombre: string;
  estado: string;
  fechaInicio: Date;
  fechaCierre: Date;
  contratoAddress: string | null;
  totalVotos: number | null;
  snapshotAt: Date | null;
  listas: { nombre: string; indice: number; resultados: { votos: number }[] }[];
  participaciones: { id: number; hashBlockchain: string }[];
}

/** Datos leídos del contrato. `tieneCodigo: false` corta la lectura del resto. */
interface DatosBfa {
  tieneCodigo: boolean;
  nombre?: string;
  fechaApertura?: number;
  fechaCierre?: number;
  cantidadListas?: number;
  nombresListas?: string[];
  votos?: number[];
  hashesVotaron?: Map<string, boolean>;
}

interface IntegridadCheck {
  campo: string;
  ok: boolean;
  bd?: string | number | boolean | null;
  bfa?: string | number | boolean | null;
  /** true solo en el check de consistencia interna (estado vs. fechas): no compara contra BFA. */
  interno?: boolean;
}

interface IntegridadSeccion {
  estado: 'verificada' | 'discrepancias' | 'con_advertencias' | 'no_aplica';
  checks: IntegridadCheck[];
}

/**
 * "no_aplica" si no hay ningun check comparable (BD vs BFA) en la seccion.
 * Los checks `interno` (no comparan contra BFA) nunca producen "discrepancias"
 * por si solos, pero si alguno falla se refleja como "con_advertencias" en vez
 * de quedar silenciado detras de un "verificada"/"no_aplica".
 */
function estadoDeChecks(checks: IntegridadCheck[]): IntegridadSeccion['estado'] {
  const comparables = checks.filter((c) => !c.interno);
  const base: IntegridadSeccion['estado'] =
    comparables.length === 0
      ? 'no_aplica'
      : comparables.every((c) => c.ok)
        ? 'verificada'
        : 'discrepancias';

  if (base === 'discrepancias') return 'discrepancias';

  const hayAdvertencia = checks.some((c) => c.interno && !c.ok);
  return hayAdvertencia ? 'con_advertencias' : base;
}

const SIN_CODIGO = 'no verificable (el contrato no tiene código en la blockchain)';

function construirSeccionEleccion(e: EleccionParaIntegridad, bfa: DatosBfa): IntegridadSeccion {
  const checks: IntegridadCheck[] = [
    {
      campo: 'Contrato desplegado (código presente en la address)',
      ok: bfa.tieneCodigo,
      bd: e.contratoAddress,
      bfa: bfa.tieneCodigo ? 'código presente' : 'sin código',
    },
  ];

  const fechaInicioUnix = Math.floor(e.fechaInicio.getTime() / 1000);
  const fechaCierreUnix = Math.floor(e.fechaCierre.getTime() / 1000);

  checks.push(
    {
      campo: 'nombre',
      ok: bfa.tieneCodigo && e.nombre === bfa.nombre,
      bd: e.nombre,
      bfa: bfa.tieneCodigo ? (bfa.nombre ?? null) : SIN_CODIGO,
    },
    {
      campo: 'fecha_inicio (unix)',
      ok: bfa.tieneCodigo && fechaInicioUnix === bfa.fechaApertura,
      bd: fechaInicioUnix,
      bfa: bfa.tieneCodigo ? (bfa.fechaApertura ?? null) : SIN_CODIGO,
    },
    {
      campo: 'fecha_cierre (unix)',
      ok: bfa.tieneCodigo && fechaCierreUnix === bfa.fechaCierre,
      bd: fechaCierreUnix,
      bfa: bfa.tieneCodigo ? (bfa.fechaCierre ?? null) : SIN_CODIGO,
    },
  );

  // Consistencia interna: el estado (creada/publicada/finalizada) no existe
  // en el contrato, así que esto NO es una comparación contra BFA.
  const ahora = new Date();
  const estadoCoherente =
    (e.estado === 'creada' && e.fechaInicio > ahora) ||
    (e.estado === 'publicada' && e.fechaInicio <= ahora && e.fechaCierre > ahora) ||
    (e.estado === 'finalizada' && e.fechaCierre <= ahora);
  checks.push({
    campo: 'Consistencia interna: estado vs. fechas (NO compara contra BFA — el estado no existe en el contrato)',
    ok: estadoCoherente,
    bd: `${e.estado} (inicio ${e.fechaInicio.toISOString()}, cierre ${e.fechaCierre.toISOString()}, ahora ${ahora.toISOString()})`,
    interno: true,
  });

  return { estado: estadoDeChecks(checks), checks };
}

function construirSeccionListas(e: EleccionParaIntegridad, bfa: DatosBfa): IntegridadSeccion {
  if (!bfa.tieneCodigo) {
    return {
      estado: 'discrepancias',
      checks: [{ campo: 'cantidad_listas', ok: false, bd: e.listas.length, bfa: SIN_CODIGO }],
    };
  }

  const checks: IntegridadCheck[] = [
    {
      campo: 'cantidad_listas',
      ok: e.listas.length === bfa.cantidadListas,
      bd: e.listas.length,
      bfa: bfa.cantidadListas ?? null,
    },
  ];

  const cantidadMaxima = Math.max(e.listas.length, bfa.nombresListas?.length ?? 0);
  for (let indice = 0; indice < cantidadMaxima; indice++) {
    const listaBd = e.listas.find((l) => l.indice === indice);
    const nombreBfa = bfa.nombresListas?.[indice];
    checks.push({
      campo: `lista[${indice}].nombre`,
      ok: listaBd !== undefined && nombreBfa !== undefined && listaBd.nombre === nombreBfa,
      bd: listaBd?.nombre ?? null,
      bfa: nombreBfa ?? null,
    });
  }

  return { estado: estadoDeChecks(checks), checks };
}

function construirSeccionResultados(e: EleccionParaIntegridad, bfa: DatosBfa): IntegridadSeccion {
  // Solo aplica a elecciones finalizadas con snapshot ya tomado.
  if (e.estado !== 'finalizada' || !e.snapshotAt) {
    return { estado: 'no_aplica', checks: [] };
  }

  if (!bfa.tieneCodigo) {
    return {
      estado: 'discrepancias',
      checks: [{ campo: 'total_votos', ok: false, bd: e.totalVotos, bfa: SIN_CODIGO }],
    };
  }

  const votosBfa = bfa.votos ?? [];
  const totalBfa = votosBfa.reduce((acc, v) => acc + v, 0);

  const checks: IntegridadCheck[] = e.listas.map((lista) => {
    const votosBd = lista.resultados[0]?.votos ?? null;
    const votosContrato = votosBfa[lista.indice] ?? null;
    return {
      campo: `votos["${lista.nombre}"] (índice ${lista.indice})`,
      ok: votosBd !== null && votosContrato !== null && votosBd === votosContrato,
      bd: votosBd,
      bfa: votosContrato,
    };
  });

  checks.push({
    campo: 'total_votos',
    ok: e.totalVotos !== null && e.totalVotos === totalBfa,
    bd: e.totalVotos,
    bfa: totalBfa,
  });

  return { estado: estadoDeChecks(checks), checks };
}

function construirSeccionParticipacion(e: EleccionParaIntegridad, bfa: DatosBfa): IntegridadSeccion {
  // Igual que resultados: solo aplica a elecciones finalizadas. Mientras la
  // eleccion sigue abierta, obtenerTodosLosVotos() todavia no es comparable
  // (revierte hasta el cierre) y el conteo de participaciones en BD sigue
  // cambiando voto a voto, asi que no hay nada estable para auditar todavia.
  if (e.estado !== 'finalizada') {
    return { estado: 'no_aplica', checks: [] };
  }

  if (!bfa.tieneCodigo) {
    return {
      estado: 'discrepancias',
      checks: [
        { campo: 'cantidad_participaciones vs. total de votos en el contrato', ok: false, bd: e.participaciones.length, bfa: SIN_CODIGO },
      ],
    };
  }

  const checks: IntegridadCheck[] = [];

  if (bfa.votos !== undefined) {
    const totalVotosBfa = bfa.votos.reduce((acc, v) => acc + v, 0);
    checks.push({
      campo: 'cantidad_participaciones vs. total de votos en el contrato',
      ok: e.participaciones.length === totalVotosBfa,
      bd: e.participaciones.length,
      bfa: totalVotosBfa,
    });
  } else {
    // La elección todavía no cerró en el contrato: obtenerTodosLosVotos()
    // revierte hasta pasar fechaCierre, así que este check no es comparable.
    checks.push({
      campo: 'cantidad_participaciones vs. total de votos en el contrato',
      ok: true,
      bd: e.participaciones.length,
      bfa: 'no legible todavía: el contrato exige que la elección haya cerrado',
      interno: true,
    });
  }

  for (const p of e.participaciones) {
    const votoEnContrato = bfa.hashesVotaron?.get(p.hashBlockchain) ?? false;
    checks.push({
      campo: `yaVotoEstaPersona — participación #${p.id}`,
      ok: votoEnContrato,
      bd: p.hashBlockchain,
      bfa: votoEnContrato,
    });
  }

  return { estado: estadoDeChecks(checks), checks };
}

/**
 * Verifica la integridad de TODOS los datos de una elección comparando la
 * BD contra el contrato en BFA (HU-24). Cuatro secciones: eleccion, listas,
 * resultados (no_aplica si todavía no hay snapshot) y participacion.
 *
 * Si el nodo de BFA no responde, se corta con 503: nunca se devuelve
 * "verificada" cuando no se pudo comparar contra la blockchain. Que el
 * contrato exista pero sin código, en cambio, SÍ es una respuesta válida
 * de BFA — se refleja como discrepancia, no como error de conectividad.
 */
export async function verificarIntegridadEleccion(
  eleccionId: number,
  adminPayload: JwtPayload,
  ip: string,
) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      nombre: true,
      estado: true,
      fechaInicio: true,
      fechaCierre: true,
      contratoAddress: true,
      totalVotos: true,
      snapshotAt: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: { nombre: true, indice: true, resultados: { select: { votos: true } } },
      },
      participaciones: { select: { id: true, hashBlockchain: true } },
    },
  });

  if (!eleccion) {
    throw new NoEncontradoError(`No existe una elección con id ${eleccionId}.`);
  }

  if (!eleccion.contratoAddress) {
    throw new ConflictoError(
      'La elección no tiene contrato desplegado en BFA; no se puede verificar su integridad.',
    );
  }
  const contratoAddress = eleccion.contratoAddress;

  // Una address con formato invalido (mal cargada en BD, typo, etc.) hace que
  // ethers la trate como nombre ENS y dispare un error de resolucion/red que
  // no tiene nada que ver con que BFA este caido — se distingue aparte para
  // no confundir "direccion mal guardada" con "no se pudo conectar a BFA".
  if (!ethers.isAddress(contratoAddress)) {
    throw new ConflictoError(
      `La dirección del contrato registrada en la base de datos (${contratoAddress}) no tiene un formato válido; no se puede verificar su integridad.`,
    );
  }

  let bfa: DatosBfa;
  try {
    const tieneCodigo = await contratoTieneCodigo(contratoAddress);

    if (!tieneCodigo) {
      bfa = { tieneCodigo: false };
    } else {
      const [nombre, fechaApertura, fechaCierre, cantidadListas] = await Promise.all([
        obtenerNombreEleccion(contratoAddress),
        obtenerFechaApertura(contratoAddress),
        obtenerFechaCierre(contratoAddress),
        obtenerCantidadListas(contratoAddress),
      ]);

      // obtenerTodosLosVotos() exige que el contrato ya haya cerrado
      // (eleccionFinalizada) y revierte si se llama antes. Se aísla en su
      // propio try/catch para que una elección todavía abierta no tumbe el
      // resto de la verificación de integridad.
      let votos: number[] | undefined;
      try {
        votos = await obtenerVotos(contratoAddress);
      } catch {
        votos = undefined;
      }

      const nombresListas = await Promise.all(
        Array.from({ length: cantidadListas }, (_, indice) =>
          obtenerListaPorIndice(contratoAddress, indice),
        ),
      );

      const hashesUnicos = [...new Set(eleccion.participaciones.map((p) => p.hashBlockchain))];
      const resultadosHash = await Promise.all(
        hashesUnicos.map((hash) => yaVotoEnContrato(contratoAddress, hash)),
      );
      const hashesVotaron = new Map(hashesUnicos.map((hash, i) => [hash, resultadosHash[i]]));

      bfa = { tieneCodigo: true, nombre, fechaApertura, fechaCierre, cantidadListas, nombresListas, votos, hashesVotaron };
    }
  } catch (err) {
    logger.error({ err, eleccionId }, 'No se pudo conectar a BFA para verificar integridad');
    throw new ServicioNoDisponibleError(
      'No se pudo conectar a la blockchain (BFA) para verificar la integridad. Intentá nuevamente en unos minutos.',
    );
  }

  const secciones = {
    eleccion: construirSeccionEleccion(eleccion, bfa),
    listas: construirSeccionListas(eleccion, bfa),
    resultados: construirSeccionResultados(eleccion, bfa),
    participacion: construirSeccionParticipacion(eleccion, bfa),
  };

  const valoresSecciones = Object.values(secciones);
  const integridadGlobal: IntegridadSeccion['estado'] = valoresSecciones.some(
    (s) => s.estado === 'discrepancias',
  )
    ? 'discrepancias'
    : valoresSecciones.some((s) => s.estado === 'con_advertencias')
      ? 'con_advertencias'
      : 'verificada';

  await registrarLog({
    tipoEvento: 'verificacion_integridad',
    rolUsuario: 'administrador',
    descripcion: `Verificación de integridad de la elección "${eleccion.nombre}" (id ${eleccionId}): ${integridadGlobal}.`,
    idUsuario: adminPayload.sub,
    ip,
  });

  return {
    eleccion_id: eleccion.id,
    verificado_at: new Date().toISOString(),
    integridad_global: integridadGlobal,
    secciones,
  };
}

// ─── GET /api/admin/blockchain/saldo ───────────────────────────

/**
 * Consulta el saldo de gas de la wallet del backend en BFA — la cuenta que
 * paga todos los deploys y votos — y lo clasifica según los umbrales
 * configurados (SALDO_UMBRAL_ADVERTENCIA / SALDO_UMBRAL_CRITICO).
 *
 * Si BFA no responde no hay saldo "de mentira" ni "ok" por default:
 * se corta con 503, igual que en verificarIntegridadEleccion.
 */
export async function consultarSaldoBlockchain() {
  let saldoWei: bigint;
  try {
    saldoWei = await obtenerSaldoBackend();
  } catch (err) {
    logger.error({ err }, 'No se pudo consultar el saldo de la wallet del backend en BFA');
    throw new ServicioNoDisponibleError(
      'No se pudo conectar a la blockchain (BFA) para consultar el saldo. Intentá nuevamente en unos minutos.',
    );
  }

  const saldo = ethers.formatEther(saldoWei);
  const umbralAdvertencia = env.SALDO_UMBRAL_ADVERTENCIA;
  const umbralCritico = env.SALDO_UMBRAL_CRITICO;
  const saldoNumero = Number(saldo);

  const estado: 'ok' | 'advertencia' | 'critico' =
    saldoNumero <= umbralCritico ? 'critico' : saldoNumero <= umbralAdvertencia ? 'advertencia' : 'ok';

  return {
    address: env.BACKEND_ADDRESS,
    saldo,
    unidad: 'BFA',
    estado,
    umbrales: {
      advertencia: umbralAdvertencia.toString(),
      critico: umbralCritico.toString(),
    },
  };
}
