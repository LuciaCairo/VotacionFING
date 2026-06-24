import type { FastifyPluginAsync } from 'fastify';
import { obtenerEleccionesVigentes, obtenerDetalleEleccion } from './votante.service.js';
import { eleccionIdParamSchema } from './votante.schemas.js';

/**
 * Rutas del votante. Todas requieren JWT con rol "votante".
 * Las rutas estáticas (ej: /elecciones/vigentes) se registran antes
 * que las paramétricas (ej: /elecciones/:id) para evitar colisiones.
 */
export const votanteRoutes: FastifyPluginAsync = async (app) => {
  const soloVotante = [app.autenticar, app.requiereRol('votante')];

  // ─── GET /api/votante/elecciones/vigentes ───────────────────
  // Ruta estática registrada ANTES que la paramétrica /:id para evitar colisión.
  app.get('/elecciones/vigentes', { preHandler: soloVotante }, async (req, reply) => {
    const resultado = await obtenerEleccionesVigentes(req.user.sub);
    return reply.code(200).send(resultado);
  });

  // ─── GET /api/votante/elecciones/:id ────────────────────────
  app.get('/elecciones/:id', { preHandler: soloVotante }, async (req, reply) => {
    const { id } = eleccionIdParamSchema.parse(req.params);
    const resultado = await obtenerDetalleEleccion(id, req.user.sub);
    return reply.code(200).send(resultado);
  });
};
