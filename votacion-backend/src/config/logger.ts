import { pino } from 'pino';
import { env } from './env.js';

/**
 * Logger Pino. En desarrollo usa pino-pretty para salida legible.
 * En produccion emite JSON estructurado.
 *
 * `redact` evita que datos sensibles aparezcan en los logs aunque
 * por error se pasen dentro de un objeto logueado.
 */
export const logger = pino({
  level: env.isDev ? 'debug' : 'info',
  redact: {
    paths: [
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'BACKEND_PRIVATE_KEY',
      'SALT_SECRETO',
      'token',
      '*.token',
      'authorization',
      'req.headers.authorization',
    ],
    censor: '[REDACTADO]',
  },
  transport: env.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
