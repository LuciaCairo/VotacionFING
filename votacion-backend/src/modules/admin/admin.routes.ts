import type { FastifyPluginAsync } from 'fastify';
import { listarEleccionesAgrupadas } from './admin.service.js';

/**
 * Rutas de administración. Todas requieren JWT con rol "administrador".
 * El guard se aplica a nivel de plugin con `preHandler` en cada ruta
 * (autenticar + requiereRol('administrador')).
 */
export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Guard reutilizable para todas las rutas de este módulo.
  const soloAdmin = [app.autenticar, app.requiereRol('administrador')];

  // ─── GET /api/admin/elecciones ──────────────────────────────
  app.get('/elecciones', { preHandler: soloAdmin }, async (_req, reply) => {
    const resultado = await listarEleccionesAgrupadas();
    return reply.code(200).send(resultado);
  });
};