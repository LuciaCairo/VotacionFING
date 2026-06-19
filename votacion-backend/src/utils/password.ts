import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

/** Hashea una contrasena en texto plano con bcrypt. */
export function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, env.BCRYPT_ROUNDS);
}

/** Compara una contrasena en texto plano contra su hash. */
export function verificarPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}
