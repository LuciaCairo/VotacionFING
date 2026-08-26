import { randomUUID } from 'node:crypto';

/** Genera un id unico para el token (jti), usado por la lista negra. */
export function nuevoJti(): string {
  return randomUUID();
}
