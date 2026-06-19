import { prisma } from '../../config/prisma.js';

/**
 * Forma de cada elección en la respuesta de GET /api/admin/elecciones,
 * según el estado al que pertenece (la documentación define formas
 * levemente distintas por grupo).
 */
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