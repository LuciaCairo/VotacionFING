import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { desplegarContrato } from '../../services/blockchain.service.js';
import { registrarLog } from '../../services/log.service.js';
import { ValidacionError, InternoError } from '../../utils/errors.js';
import type { JwtPayload } from '../../types/auth.js';
import type { CrearEleccionInput } from './admin.schemas.js';

// ─── Nombre fijo del voto en blanco ─────────────────────────
// El contrato NO lo agrega automáticamente: se incluye explicitamente
// al final del array _listas antes de desplegar.
const VOTO_EN_BLANCO = 'Voto en blanco';

// ─── DTOs de respuesta ───────────────────────────────────────

interface EleccionCreadaDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  cantidad_listas: number;
}

interface EleccionPublicadaOFinalizadaDTO extends EleccionCreadaDTO {
  votos_emitidos: number;
}

interface EleccionesAgrupadas {
  creadas: EleccionCreadaDTO[];
  publicadas: EleccionPublicadaOFinalizadaDTO[];
  finalizadas: EleccionPublicadaOFinalizadaDTO[];
}

// ─── GET /api/admin/elecciones ───────────────────────────────

/**
 * Devuelve todas las elecciones agrupadas por estado (creada / publicada /
 * finalizada), con la cantidad de listas y, para publicadas y finalizadas,
 * la cantidad de votos emitidos.
 *
 * `votos_emitidos` se calcula contando PARTICIPACION en la BD (cuántos
 * votantes ya votaron), no consultando el contrato: es solo un conteo de
 * participación, no el detalle por lista (eso lo da /resultados, que sí
 * lee de blockchain).
 */
export async function listarEleccionesAgrupadas(): Promise<EleccionesAgrupadas> {
  const elecciones = await prisma.eleccion.findMany({
    orderBy: { fechaInicio: 'desc' },
    include: {
      _count: {
        select: { listas: true, participaciones: true },
      },
    },
  });

  const agrupadas: EleccionesAgrupadas = { creadas: [], publicadas: [], finalizadas: [] };

  for (const e of elecciones) {
    const base = {
      id: e.id,
      nombre: e.nombre,
      fecha_inicio: e.fechaInicio.toISOString(),
      fecha_cierre: e.fechaCierre.toISOString(),
      cantidad_listas: e._count.listas,
    };

    if (e.estado === 'creada') {
      agrupadas.creadas.push(base);
    } else if (e.estado === 'publicada') {
      agrupadas.publicadas.push({ ...base, votos_emitidos: e._count.participaciones });
    } else {
      agrupadas.finalizadas.push({ ...base, votos_emitidos: e._count.participaciones });
    }
  }

  return agrupadas;
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
    })),
  };
}
