import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { redis, claveIntentosLogin, claveBlacklist } from '../../config/redis.js';
import { verificarPassword } from '../../utils/password.js';
import { nuevoJti } from '../../utils/request.js';
import { NoAutenticadoError, ProhibidoError } from '../../utils/errors.js';
import { registrarLog } from '../../services/log.service.js';
import type { JwtPayload, Rol } from '../../types/auth.js';
import type { LoginVotanteInput, LoginAdminInput } from './auth.schemas.js';

/**
 * Controla el bloqueo por intentos fallidos.
 * Tras LOGIN_MAX_INTENTOS fallos, bloquea LOGIN_BLOQUEO_SEGUNDOS.
 * Lanza ProhibidoError (403) si la cuenta esta actualmente bloqueada.
 */
async function verificarBloqueo(rol: 'votante' | 'admin', identificador: string): Promise<void> {
  const clave = claveIntentosLogin(rol, identificador);
  const intentos = Number((await redis.get(clave)) ?? 0);
  if (intentos >= env.LOGIN_MAX_INTENTOS) {
    throw new ProhibidoError('Tu cuenta está bloqueada. Intentá nuevamente en 10 minutos.');
  }
}

/** Suma un intento fallido y arma la ventana de bloqueo si corresponde. */
async function registrarIntentoFallido(rol: 'votante' | 'admin', identificador: string): Promise<void> {
  const clave = claveIntentosLogin(rol, identificador);
  const intentos = await redis.incr(clave);
  // En el primer intento fijamos el TTL de la ventana de bloqueo.
  if (intentos === 1) {
    await redis.expire(clave, env.LOGIN_BLOQUEO_SEGUNDOS);
  }
}

/** Limpia el contador de intentos tras un login exitoso. */
async function limpiarIntentos(rol: 'votante' | 'admin', identificador: string): Promise<void> {
  await redis.del(claveIntentosLogin(rol, identificador));
}

/** Firma un JWT con el payload y la expiracion segun el rol. */
function firmarToken(app: FastifyInstance, sub: number, rol: Rol): string {
  const payload: JwtPayload = { sub, rol, jti: nuevoJti() };
  const expiresIn = rol === 'administrador' ? env.JWT_EXPIRES_ADMIN : env.JWT_EXPIRES_VOTANTE;
  return app.jwt.sign(payload, { expiresIn });
}

// ─── LOGIN VOTANTE ───────────────────────────────────────────

export async function loginVotante(
  app: FastifyInstance,
  input: LoginVotanteInput,
  ip: string,
) {
  const { legajo, password } = input;
  await verificarBloqueo('votante', legajo);

  const votante = await prisma.votante.findUnique({ where: { legajo } });

  // Mensaje generico (no revela si fallo el legajo o la password).
  // Igual ejecutamos una comparacion para mitigar timing attacks cuando no existe.
  const passwordOk = votante
    ? await verificarPassword(password, votante.passwordHash)
    : await verificarPassword(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinv');

  if (!votante || !votante.activo || !passwordOk) {
    await registrarIntentoFallido('votante', legajo);
    await registrarLog({
      tipoEvento: 'login_fallido',
      rolUsuario: 'votante',
      descripcion: `Login fallido para legajo ${legajo}`,
      idUsuario: votante?.id ?? null,
      ip,
    });
    throw new NoAutenticadoError('Credenciales incorrectas');
  }

  await limpiarIntentos('votante', legajo);
  const token = firmarToken(app, votante.id, 'votante');

  await registrarLog({
    tipoEvento: 'login_exitoso',
    rolUsuario: 'votante',
    descripcion: `Login exitoso de votante ${legajo}`,
    idUsuario: votante.id,
    ip,
  });

  return {
    token,
    votante: {
      id: votante.id,
      nombre_completo: votante.nombreCompleto,
      legajo: votante.legajo,
      carrera: votante.carrera,
    },
  };
}

// ─── LOGIN ADMIN ─────────────────────────────────────────────

export async function loginAdmin(
  app: FastifyInstance,
  input: LoginAdminInput,
  ip: string,
) {
  const { correo, password } = input;
  await verificarBloqueo('admin', correo);

  const admin = await prisma.administrador.findUnique({ where: { correo } });

  const passwordOk = admin
    ? await verificarPassword(password, admin.passwordHash)
    : await verificarPassword(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinv');

  if (!admin || !passwordOk) {
    await registrarIntentoFallido('admin', correo);
    await registrarLog({
      tipoEvento: 'login_fallido',
      rolUsuario: 'administrador',
      descripcion: `Login fallido para correo ${correo}`,
      idUsuario: admin?.id ?? null,
      ip,
    });
    throw new NoAutenticadoError('Credenciales incorrectas');
  }

  await limpiarIntentos('admin', correo);
  const token = firmarToken(app, admin.id, 'administrador');

  await registrarLog({
    tipoEvento: 'login_exitoso',
    rolUsuario: 'administrador',
    descripcion: `Login exitoso de admin ${correo}`,
    idUsuario: admin.id,
    ip,
  });

  return {
    token,
    admin: { id: admin.id, correo: admin.correo },
  };
}

// ─── LOGOUT ──────────────────────────────────────────────────

/**
 * Invalida el token agregando su jti a la lista negra de Redis,
 * con TTL igual al tiempo restante hasta su expiracion.
 */
export async function logout(payload: JwtPayload & { exp: number }, ip: string): Promise<void> {
  const ahora = Math.floor(Date.now() / 1000);
  const ttl = Math.max(payload.exp - ahora, 1);
  await redis.set(claveBlacklist(payload.jti), '1', 'EX', ttl);

  await registrarLog({
    tipoEvento: 'sesion_cerrada',
    rolUsuario: payload.rol === 'administrador' ? 'administrador' : 'votante',
    descripcion: 'Cierre de sesion',
    idUsuario: payload.sub,
    ip,
  });
}
