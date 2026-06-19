import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { sincronizarEstadosElecciones } from './eleccion.job.js';

let yaIniciado = false;

/**
 * Inicia los cron jobs del sistema.
 * Job principal: cada minuto sincroniza los estados de las elecciones
 * (publicacion y cierre automatico segun fechas).
 */
export function iniciarJobs(): void {
  if (yaIniciado) return;
  yaIniciado = true;

  // Cada minuto.
  cron.schedule('* * * * *', () => {
    sincronizarEstadosElecciones().catch((err) => {
      logger.error({ err }, 'Error en el job de sincronizacion de elecciones');
    });
  });

  logger.info('Cron jobs iniciados (sincronizacion de elecciones cada minuto)');
}
