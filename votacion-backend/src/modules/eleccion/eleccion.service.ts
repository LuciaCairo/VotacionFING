import { prisma } from '../../config/prisma.js';
import { ConflictoError, NoEncontradoError } from '../../utils/errors.js';

/** Redondea a 2 decimales (evita arrastrar el error de punto flotante). */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── GET /api/elecciones/:id/resultados ──────────────────────

/**
 * Devuelve los resultados de una elección finalizada, leídos del snapshot
 * en BD (tabla RESULTADO + campos de snapshot en ELECCION) — nunca de BFA.
 * Estrategia híbrida de resultados (ver README del backend).
 *
 * Endpoint compartido: cualquier usuario autenticado (admin o votante)
 * puede acceder, sin distinción de rol.
 */
export async function obtenerResultados(eleccionId: number) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      fechaCierre: true,
      estado: true,
      snapshotAt: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: {
          id: true,
          nombre: true,
          esBlanco: true,
          indice: true,
          color: true,
          resultados: { select: { votos: true } },
        },
      },
    },
  });

  if (!eleccion) {
    throw new NoEncontradoError('La elección no existe.');
  }

  if (eleccion.estado !== 'finalizada') {
    throw new ConflictoError('Los resultados solo están disponibles para elecciones finalizadas.');
  }

  if (!eleccion.snapshotAt) {
    throw new ConflictoError('Los resultados se están procesando, intentá en unos minutos.');
  }

  // Cruza cada lista con su fila de RESULTADO (0 si faltara, defensivo) y
  // deriva total/ganador/empate de estos votos en vez de los campos
  // cacheados en Eleccion (totalVotos, resultadoTipo, idListaGanadora):
  // así la respuesta es siempre internamente consistente aunque ese
  // cache haya quedado desactualizado o incompleto por algún motivo.
  const listasConVotos = eleccion.listas.map((l) => ({
    nombre: l.nombre,
    esBlanco: l.esBlanco,
    indice: l.indice,
    color: l.color,
    votos: l.resultados[0]?.votos ?? 0,
  }));

  const totalVotos = listasConVotos.reduce((acc, l) => acc + l.votos, 0);

  const listas = listasConVotos.map((l) => ({
    nombre: l.nombre,
    es_blanco: l.esBlanco,
    indice: l.indice,
    color: l.color,
    votos: l.votos,
    porcentaje: totalVotos > 0 ? redondear((l.votos / totalVotos) * 100) : 0,
  }));

  const totalPadron = await prisma.votante.count({ where: { activo: true } });

  const participacion = {
    total_votos: totalVotos,
    total_padron: totalPadron,
    porcentaje: totalPadron > 0 ? redondear((totalVotos / totalPadron) * 100) : 0,
  };

  const maxVotos = Math.max(...listasConVotos.map((l) => l.votos));
  const listasConMax = listasConVotos.filter((l) => l.votos === maxVotos);

  const resultado: {
    tipo: 'ganador_unico' | 'empate';
    lista_ganadora?: { nombre: string; votos: number };
    listas_empatadas?: { nombre: string; votos: number }[];
  } = { tipo: listasConMax.length === 1 ? 'ganador_unico' : 'empate' };

  if (resultado.tipo === 'ganador_unico') {
    resultado.lista_ganadora = { nombre: listasConMax[0].nombre, votos: listasConMax[0].votos };
  } else {
    resultado.listas_empatadas = listasConMax.map((l) => ({ nombre: l.nombre, votos: l.votos }));
  }

  return {
    id: eleccion.id,
    nombre: eleccion.nombre,
    fecha_inicio: eleccion.fechaInicio.toISOString(),
    fecha_cierre: eleccion.fechaCierre.toISOString(),
    listas,
    total_votos: totalVotos,
    participacion,
    resultado,
    snapshot_at: eleccion.snapshotAt.toISOString(),
  };
}
