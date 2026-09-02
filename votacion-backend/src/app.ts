import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

import authPlugin from './plugins/auth.plugin.js';
import errorHandlerPlugin from './plugins/error-handler.plugin.js';

// Rutas por modulo (se iran agregando endpoint por endpoint).
import { authRoutes } from './modules/auth/auth.routes.js';
import { votanteRoutes } from './modules/votante/votante.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { eleccionRoutes } from './modules/eleccion/eleccion.routes.js';

/**
 * Construye la instancia de Fastify con todos los plugins y rutas.
 * Separado de la escucha (server.ts) para facilitar testing.
 */
export async function buildApp() {
  const app = Fastify({
    // `loggerInstance` (no `logger`, que en Fastify v5 solo acepta un objeto
    // de configuracion, no una instancia ya creada) es la clave real para que
    // Fastify use nuestro logger de Pino (con redaccion de passwords/tokens/
    // claves) en vez de crear uno propio sin esa redaccion.
    loggerInstance: logger,
    // No hay reverse proxy real delante todavia. `true` confia en CUALQUIER
    // cantidad de saltos en X-Forwarded-For (incluido el valor que manda el
    // propio cliente), lo que permite falsificar la IP usada por el rate
    // limit y los logs de auditoria. Cuando se despliegue detras de un
    // proxy real, cambiar esto a la IP/CIDR especifica de ese proxy (nunca
    // `true`) para que solo se confie en el salto conocido.
    trustProxy: false,
    bodyLimit: 1 * 1024 * 1024, // 1 MB
  });

  // ─── Plugins core ──────────────────────────────────────────
  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  });

  // Cabeceras de seguridad HTTP (HSTS, X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy, etc.). CSP desactivada a proposito: esta API solo
  // devuelve JSON/CSV, nunca HTML, asi que la CSP por defecto de helmet
  // (pensada para paginas) no protege nada real aca y solo agrega ruido.
  await app.register(helmet, { contentSecurityPolicy: false });

  // Rate limit global suave. El bloqueo especifico de login (5 intentos)
  // se maneja aparte con Redis dentro del modulo auth.
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Demasiadas solicitudes. Intentá más tarde.' }),
  });

  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);

  // ─── Health check ──────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Rutas de la API ───────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(votanteRoutes, { prefix: '/api/votante' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(eleccionRoutes, { prefix: '/api/elecciones' });

  return app;
}
