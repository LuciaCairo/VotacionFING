import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { registrarLog } from '../services/log.service.js';

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
  }
}
