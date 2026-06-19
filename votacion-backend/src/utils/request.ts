import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

/**
 * Obtiene la IP real del cliente. Detras de NGINX se usa el header
 * X-Forwarded-For (primer valor de la cadena). Cae a req.ip si no esta.
 */
export function obtenerIp(req: FastifyRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0]!.trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0]!.trim();
  }
  return req.ip;
}

/** Genera un id unico para el token (jti), usado por la lista negra. */
export function nuevoJti(): string {
  return randomUUID();
}
