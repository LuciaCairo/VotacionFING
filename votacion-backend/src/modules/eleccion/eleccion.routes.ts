import type { FastifyPluginAsync } from 'fastify';
import { obtenerResultados, verificarResultadosEnBfa } from './eleccion.service.js';
import { eleccionIdParamSchema } from './eleccion.schemas.js';

/**
 * Rutas compartidas de elección: no viven bajo /admin ni /votante.
 * Requieren JWT válido (app.autenticar) pero no discriminan rol —
 * cualquier usuario autenticado, admin o votante, puede acceder.
 */
export const eleccionRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /api/elecciones/:id/resultados ─────────────────────
  app.get('/:id/resultados', { preHandler: app.autenticar }, async (req, reply) => {
    const { id } = eleccionIdParamSchema.parse(req.params);
    const resultado = await obtenerResultados(id);
    return reply.code(200).send(resultado);
  });

  // ─── GET /api/elecciones/:id/verificacion ───────────────────
  app.get('/:id/verificacion', { preHandler: app.autenticar }, async (req, reply) => {
    const { id } = eleccionIdParamSchema.parse(req.params);
    const resultado = await verificarResultadosEnBfa(id);
    return reply.code(200).send(resultado);
  });
};
