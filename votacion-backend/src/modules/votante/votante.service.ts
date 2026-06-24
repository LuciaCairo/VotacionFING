import { prisma } from '../../config/prisma.js';
import { NoEncontradoError } from '../../utils/errors.js';

// ─── GET /api/votante/elecciones/:id ─────────────────────────

/**
 * Devuelve el detalle de una elección con todas sus listas ordenadas por
 * índice (igual que en el contrato). Solo visible si está publicada o
 * finalizada — las elecciones en estado creada devuelven 404.
 * Incluye ya_voto por consistencia con /vigentes.
 */
export async function obtenerDetalleEleccion(eleccionId: number, votanteId: number) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      fechaCierre: true,
      estado: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: { id: true, nombre: true, esBlanco: true, indice: true, color: true },
      },
    },
  });

  if (!eleccion || eleccion.estado === 'creada') {
    throw new NoEncontradoError('La elección no existe o no está disponible.');
  }

  const participacion = await prisma.participacion.findUnique({
    where: {
      uq_participacion_votante_eleccion: { idVotante: votanteId, idEleccion: eleccionId },
    },
    select: { id: true },
  });

  return {
    id: eleccion.id,
    nombre: eleccion.nombre,
    fecha_inicio: eleccion.fechaInicio.toISOString(),
    fecha_cierre: eleccion.fechaCierre.toISOString(),
    estado: eleccion.estado,
    ya_voto: participacion !== null,
    listas: eleccion.listas.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      es_blanco: l.esBlanco,
      indice: l.indice,
      color: l.color,
    })),
  };
}

// ─── GET /api/votante/elecciones/vigentes ────────────────────

/**
 * Devuelve las elecciones que el votante puede ver en este momento.
 * Criterio defensivo: estado publicada Y fecha actual dentro del rango,
 * por si el job de transición automática no corrió aún.
 *
 * ya_voto se calcula desde PARTICIPACION en BD — no consulta BFA —
 * y solo indica si el votante participó; nunca revela por qué lista.
 *
 * Se evita N+1 con dos queries: una para elecciones vigentes y otra
 * para todas las participaciones de este votante en esas elecciones.
 */
export async function obtenerEleccionesVigentes(votanteId: number) {
  const ahora = new Date();

  const elecciones = await prisma.eleccion.findMany({
    where: {
      estado: 'publicada',
      fechaInicio: { lte: ahora },
      fechaCierre: { gte: ahora },
    },
    orderBy: { fechaCierre: 'asc' }, // las que cierran antes, primero
    select: { id: true, nombre: true, fechaInicio: true, fechaCierre: true },
  });

  if (elecciones.length === 0) {
    return { vigentes: [] };
  }

  const participaciones = await prisma.participacion.findMany({
    where: {
      idVotante: votanteId,
      idEleccion: { in: elecciones.map((e) => e.id) },
    },
    select: { idEleccion: true },
  });

  const yaVotoSet = new Set(participaciones.map((p) => p.idEleccion));

  return {
    vigentes: elecciones.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      fecha_inicio: e.fechaInicio.toISOString(),
      fecha_cierre: e.fechaCierre.toISOString(),
      ya_voto: yaVotoSet.has(e.id),
    })),
  };
}
