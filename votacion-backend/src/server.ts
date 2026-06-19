import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { redis } from './config/redis.js';
import { iniciarJobs } from './jobs/index.js';

async function main(): Promise<void> {
  const app = await buildApp();

  // Arranca los cron jobs (publicacion y cierre automatico de elecciones).
  iniciarJobs();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`Backend de votacion escuchando en http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    logger.error({ err }, 'No se pudo iniciar el servidor');
    process.exit(1);
  }

  // ─── Cierre ordenado ─────────────────────────────────────────
  const cerrar = async (senal: string) => {
    logger.info(`Recibida senal ${senal}, cerrando...`);
    await app.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void cerrar('SIGINT'));
  process.on('SIGTERM', () => void cerrar('SIGTERM'));
}

void main();
