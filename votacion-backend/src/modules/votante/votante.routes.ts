import type { FastifyPluginAsync } from 'fastify';
import {
  obtenerEleccionesVigentes,
  obtenerDetalleEleccion,
  emitirVoto,
  obtenerComprobante,
} from './votante.service.js';
import { eleccionIdParamSchema, votarBodySchema } from './votante.schemas.js';

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

  // ─── GET /api/votante/elecciones/:id/comprobante ────────────
  app.get('/elecciones/:id/comprobante', { preHandler: soloVotante }, async (req, reply) => {
    const { id } = eleccionIdParamSchema.parse(req.params);
    const resultado = await obtenerComprobante(id, req.user.sub);
    return reply.code(200).send(resultado);
  });

  // ─── POST /api/votante/elecciones/:id/votar ─────────────────
  app.post('/elecciones/:id/votar', { preHandler: soloVotante }, async (req, reply) => {
    const { id } = eleccionIdParamSchema.parse(req.params);
    const { indice_lista } = votarBodySchema.parse(req.body);
    const resultado = await emitirVoto(id, req.user.sub, indice_lista, req.ip ?? null);
    return reply.code(201).send(resultado);
  });
};
