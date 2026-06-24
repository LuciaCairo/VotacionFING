import type { FastifyPluginAsync } from 'fastify';
import { obtenerEleccionesVigentes } from './votante.service.js';

/**
 * Rutas del votante. Todas requieren JWT con rol "votante".
 * Las rutas estáticas (ej: /elecciones/vigentes) se registran antes
 * que las paramétricas (ej: /elecciones/:id) para evitar colisiones.
 */
export const votanteRoutes: FastifyPluginAsync = async (app) => {
  const soloVotante = [app.autenticar, app.requiereRol('votante')];

  // ─── GET /api/votante/elecciones/vigentes ───────────────────
  app.get('/elecciones/vigentes', { preHandler: soloVotante }, async (req, reply) => {
    const resultado = await obtenerEleccionesVigentes(req.user.sub);
    return reply.code(200).send(resultado);
  });
};
