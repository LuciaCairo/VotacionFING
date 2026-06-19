import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Cliente Prisma singleton. En desarrollo se reutiliza la instancia
 * entre recargas de tsx watch para no agotar conexiones.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });

if (env.isDev) globalForPrisma.prisma = prisma;
