import type { FastifyPluginAsync } from 'fastify';
import { loginVotanteSchema, loginAdminSchema } from './auth.schemas.js';
import { loginVotante, loginAdmin, logout } from './auth.service.js';
import { obtenerIp } from '../../utils/request.js';

/**
 * Rutas de autenticacion.
 *   POST /api/auth/login/votante
 *   POST /api/auth/login/admin
 *   POST /api/auth/logout
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  // ─── Login votante ───────────────────────────────────────────
  app.post('/login/votante', async (req, reply) => {
    const input = loginVotanteSchema.parse(req.body);
    const resultado = await loginVotante(app, input, obtenerIp(req));
    return reply.code(200).send(resultado);
  });

  // ─── Login admin ─────────────────────────────────────────────
  app.post('/login/admin', async (req, reply) => {
    const input = loginAdminSchema.parse(req.body);
    const resultado = await loginAdmin(app, input, obtenerIp(req));
    return reply.code(200).send(resultado);
  });

  // ─── Logout (votante o admin) ────────────────────────────────
  app.post(
    '/logout',
    { preHandler: [app.autenticar] },
    async (req, reply) => {
      await logout(req.user, obtenerIp(req));
      return reply.code(200).send({ mensaje: 'Sesión cerrada correctamente' });
    },
  );
};
