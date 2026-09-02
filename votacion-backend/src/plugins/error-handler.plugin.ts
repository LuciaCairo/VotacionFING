import fp from 'fastify-plugin';
import type { FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

/**
 * Manejador de errores global. Traduce las distintas clases de error
 * a la respuesta JSON estandar { error: mensaje } con su codigo HTTP,
 * sin filtrar detalles internos al cliente.
 */
export default fp(async (app) => {
  app.setErrorHandler((error: FastifyError, req, reply) => {
    // Errores de dominio controlados.
    if (error instanceof AppError) {
      const body: Record<string, unknown> = { error: error.message };
      if (error.extra) Object.assign(body, error.extra);
      return reply.code(error.statusCode).send(body);
    }

    // Errores de validacion de Zod -> 400.
    if (error instanceof ZodError) {
      const primero = error.errors[0];
      const mensaje = primero ? primero.message : 'Datos invalidos';
      return reply.code(400).send({ error: mensaje });
    }

    // Validacion de esquema del propio Fastify -> 400.
    if (error.validation) {
      return reply.code(400).send({ error: 'Datos invalidos en la solicitud' });
    }

    // Violacion de restriccion unica de Prisma -> 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.code(409).send({ error: 'El registro ya existe (conflicto de unicidad)' });
    }

    // JWT invalido / ausente -> 401.
    if (error.statusCode === 401) {
      return reply.code(401).send({ error: 'No autenticado' });
    }

    // Cualquier otro error: log completo del lado servidor, mensaje generico al cliente.
    logger.error({ err: error, url: req.url, method: req.method }, 'Error no controlado');
    return reply.code(500).send({ error: 'Error interno del servidor' });
  });

  // 404 uniforme.
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: 'Recurso no encontrado' });
  });
});
