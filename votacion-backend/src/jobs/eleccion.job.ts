import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { registrarLog } from '../services/log.service.js';
import { obtenerVotos } from '../services/blockchain.service.js';

/**
 * Toma el snapshot de resultados de una eleccion finalizada: lee los votos
 * del contrato en BFA, los guarda en RESULTADO (uno por lista) y calcula
 * ganador/empate en la propia Eleccion. Estrategia hibrida de resultados
 * (ver README): el snapshot sirve para performance/disponibilidad, pero la
 * integridad sigue siendo verificable contra BFA en cualquier momento.
 *
 * Regla de empate: el voto en blanco es una opcion mas y participa del
 * maximo (no se excluye). Si mas de una lista alcanza el maximo -> empate,
 * incluido el caso de cero votos (todas las listas empatan en 0).
 *
 * Si la lectura de BFA falla, no bloquea la finalizacion: la eleccion queda
 * finalizada igual, con snapshotAt = null, y el job reintenta en la
 * proxima corrida (ver sincronizarEstadosElecciones).
 */
async function tomarSnapshotResultados(idEleccion: number): Promise<void> {
  const eleccion = await prisma.eleccion.findUniqueOrThrow({
    where: { id: idEleccion },
    include: { listas: { orderBy: { indice: 'asc' } } },
  });

  if (!eleccion.contratoAddress) {
    logger.error({ idEleccion }, 'No se puede tomar snapshot: la eleccion no tiene contrato');
    return;
  }

  try {
    const votosPorIndice = await obtenerVotos(eleccion.contratoAddress);

    const votosPorLista = eleccion.listas.map((lista) => ({
      lista,
      votos: votosPorIndice[lista.indice] ?? 0,
    }));

    const totalVotos = votosPorLista.reduce((acc, v) => acc + v.votos, 0);
    const maxVotos = Math.max(...votosPorLista.map((v) => v.votos));
    const listasConMax = votosPorLista.filter((v) => v.votos === maxVotos);

    const resultadoTipo = listasConMax.length === 1 ? 'ganador_unico' : 'empate';
    const idListaGanadora = listasConMax.length === 1 ? listasConMax[0].lista.id : null;

    await prisma.$transaction([
      ...votosPorLista.map((v) =>
        prisma.resultado.upsert({
          where: { uq_resultado_eleccion_lista: { idEleccion, idLista: v.lista.id } },
          create: { idEleccion, idLista: v.lista.id, indice: v.lista.indice, votos: v.votos },
          update: { votos: v.votos },
        }),
      ),
      prisma.eleccion.update({
        where: { id: idEleccion },
        data: { totalVotos, resultadoTipo, idListaGanadora, snapshotAt: new Date() },
      }),
    ]);

    logger.info({ idEleccion, totalVotos, resultadoTipo }, 'Snapshot de resultados tomado');
  } catch (err) {
    logger.error({ err, idEleccion }, 'Fallo al tomar el snapshot de resultados; se reintenta en la proxima corrida');
  }
}

/**
 * Transiciones automaticas de estado de las elecciones, segun sus fechas.
 *   creada    -> publicada   cuando llega fecha_inicio
 *   publicada -> finalizada  cuando llega fecha_cierre
 *
 * El voto en blanco NO se toca aca: ya se agrego como lista al crear la
 * eleccion (antes del deploy del contrato), por lo que vive en blockchain.
 *
 * Esta funcion es idempotente: solo afecta elecciones cuyo estado todavia
 * no coincide con sus fechas. Pensada para ejecutarse cada minuto.
 */
export async function sincronizarEstadosElecciones(): Promise<void> {
  const ahora = new Date();

  // ─── publicar: creada -> publicada ─────────────────────────
  const aPublicar = await prisma.eleccion.findMany({
    where: {
      estado: 'creada',
      fechaInicio: { lte: ahora },
      fechaCierre: { gt: ahora },
    },
    select: { id: true, nombre: true },
  });

  for (const e of aPublicar) {
    await prisma.eleccion.update({ where: { id: e.id }, data: { estado: 'publicada' } });
    await registrarLog({
      tipoEvento: 'apertura_automatica',
      rolUsuario: 'sistema',
      descripcion: `Eleccion "${e.nombre}" (id ${e.id}) publicada automaticamente`,
    });
    logger.info({ idEleccion: e.id }, 'Eleccion publicada automaticamente');
  }

  // ─── finalizar: (creada|publicada) -> finalizada ───────────
  // Incluye el caso borde de una eleccion que paso de creada a cierre
  // sin pasar por publicada (ventana muy corta).
  const aFinalizar = await prisma.eleccion.findMany({
    where: {
      estado: { in: ['creada', 'publicada'] },
      fechaCierre: { lte: ahora },
    },
    select: { id: true, nombre: true },
  });

  for (const e of aFinalizar) {
    await prisma.eleccion.update({ where: { id: e.id }, data: { estado: 'finalizada' } });
    await registrarLog({
      tipoEvento: 'cierre_automatico',
      rolUsuario: 'sistema',
      descripcion: `Eleccion "${e.nombre}" (id ${e.id}) finalizada automaticamente`,
    });
    logger.info({ idEleccion: e.id }, 'Eleccion finalizada automaticamente');
    await tomarSnapshotResultados(e.id);
  }

  // ─── snapshot pendiente: reintento para finalizadas sin resultado ──
  // Cubre elecciones cuyo snapshot fallo (BFA no disponible) en una
  // corrida anterior, incluida esta misma si el bloque de arriba fallo.
  const conSnapshotPendiente = await prisma.eleccion.findMany({
    where: { estado: 'finalizada', snapshotAt: null, id: { notIn: aFinalizar.map((e) => e.id) } },
    select: { id: true },
  });

  for (const e of conSnapshotPendiente) {
    await tomarSnapshotResultados(e.id);
  }
}
