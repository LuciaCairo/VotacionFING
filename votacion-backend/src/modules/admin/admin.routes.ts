import type { FastifyPluginAsync } from 'fastify';
import { listarEleccionesAgrupadas, crearEleccion, eliminarEleccion, listarPadron, descargarPadronCsv } from './admin.service.js';
import { crearEleccionSchema, eleccionIdParamSchema, padronQuerySchema } from './admin.schemas.js';
import { obtenerIp } from '../../utils/request.js';

/**
 * Rutas de administración. Todas requieren JWT con rol "administrador".
 * El guard se aplica a nivel de plugin con `preHandler` en cada ruta
 * (autenticar + requiereRol('administrador')).
 */
export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Guard reutilizable para todas las rutas de este módulo.
  const soloAdmin = [app.autenticar, app.requiereRol('administrador')];

  // ─── GET /api/admin/padron/descargar ────────────────────────
  app.get('/padron/descargar', { preHandler: soloAdmin }, async (_req, reply) => {
    const csv = await descargarPadronCsv();
    return reply
      .code(200)
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="padron.csv"')
      .send(csv);
  });

  // ─── GET /api/admin/padron ──────────────────────────────────
  app.get('/padron', { preHandler: soloAdmin }, async (req, reply) => {
    const { busqueda } = padronQuerySchema.parse(req.query);
    const resultado = await listarPadron(busqueda);
    return reply.code(200).send(resultado);
  });

  // ─── GET /api/admin/elecciones ──────────────────────────────
  app.get('/elecciones', { preHandler: soloAdmin }, async (_req, reply) => {
    const resultado = await listarEleccionesAgrupadas();
    return reply.code(200).send(resultado);
  });

  // ─── POST /api/admin/elecciones ─────────────────────────────
  app.post('/elecciones', { preHandler: soloAdmin }, async (req, reply) => {
    const input = crearEleccionSchema.parse(req.body);
    const resultado = await crearEleccion(input, req.user, obtenerIp(req));
    return reply.code(201).send(resultado);
  });

  // ─── DELETE /api/admin/elecciones/:id ───────────────────────
  app.delete('/elecciones/:id', { preHandler: soloAdmin }, async (req, reply) => {
    const { id } = eleccionIdParamSchema.parse(req.params);
    await eliminarEleccion(id, req.user, obtenerIp(req));
    return reply.code(200).send({ mensaje: 'Elección eliminada correctamente.' });
  });
};
