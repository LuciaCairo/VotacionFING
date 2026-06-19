import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { redis, claveBlacklist } from '../config/redis.js';
import type { Rol } from '../types/auth.js';

/**
 * Plugin de autenticacion.
 *
 * Registra @fastify/jwt y agrega decoradores:
 *   - autenticar: valida el token y que no este en la lista negra (Redis).
 *   - requiereRol(rol): factory de guard que ademas exige un rol concreto.
 *
 * El control de acceso por rol se aplica endpoint por endpoint segun la
 * documentacion (cada ruta declara su rol).
 */
declare module 'fastify' {
  interface FastifyInstance {
    autenticar: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requiereRol: (
      rol: Rol,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  /**
   * Verifica el JWT y comprueba que su jti no este en la lista negra.
   * Un token revocado por logout queda en Redis hasta su expiracion.
   */
  app.decorate('autenticar', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'No autenticado' });
    }

    const { jti } = req.user;
    const enListaNegra = await redis.exists(claveBlacklist(jti));
    if (enListaNegra) {
      return reply.code(401).send({ error: 'Sesion expirada. Volve a iniciar sesion.' });
    }
  });

  /**
   * Guard que exige un rol especifico. Se combina con `autenticar`
   * en el preHandler de cada ruta protegida.
   */
  app.decorate('requiereRol', (rol: Rol) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.user?.rol !== rol) {
        return reply.code(403).send({ error: 'No tenes permisos para acceder a este recurso' });
      }
    };
  });
});
