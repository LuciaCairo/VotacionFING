import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Cliente Redis (Upstash) para:
 *  - Lista negra de tokens JWT (logout).
 *  - Contador de intentos fallidos de login y bloqueo temporal.
 *
 * Se usa una unica conexion compartida en todo el proceso.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    // Upstash usa TLS (rediss://). ioredis lo detecta por el esquema.
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

redis.on('error', (err) => {
  logger.error({ err }, 'Error de conexion con Redis');
});

redis.on('connect', () => {
  logger.info('Conectado a Redis');
});

if (env.isDev) globalForRedis.redis = redis;

// ─── Helpers de claves ───────────────────────────────────────

/** Clave de la lista negra para un jti (id de token). */
export const claveBlacklist = (jti: string) => `blacklist:${jti}`;

/** Clave del contador de intentos fallidos de login. */
export const claveIntentosLogin = (rol: 'votante' | 'admin', identificador: string) =>
  `login:intentos:${rol}:${identificador}`;
