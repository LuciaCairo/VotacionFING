import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

/**
 * Esquema de validacion de variables de entorno.
 * Si falta o es invalida alguna variable critica, el proceso falla
 * al arrancar (fail-fast) en lugar de romper en runtime.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Base de datos
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_VOTANTE: z.coerce.number().int().positive().default(1800),
  JWT_EXPIRES_ADMIN: z.coerce.number().int().positive().default(3600),

  // Blockchain BFA
  BFA_RPC_URL: z.string().url(),
  BFA_CHAIN_ID: z.coerce.number().int().positive().default(99118822),
  BACKEND_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'BACKEND_PRIVATE_KEY debe ser un hex de 32 bytes (0x + 64 chars)'),
  BACKEND_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, 'BACKEND_ADDRESS debe ser una address valida'),
  BFA_DEPLOY_GAS_LIMIT: z.coerce.number().int().positive().default(3_000_000),

  // Umbrales de saldo de la wallet del backend
  SALDO_UMBRAL_ADVERTENCIA: z.coerce.number().positive().default(0.5),
  SALDO_UMBRAL_CRITICO: z.coerce.number().positive().default(0.1),

  // Seguridad / login
  LOGIN_MAX_INTENTOS: z.coerce.number().int().positive().default(5),
  LOGIN_BLOQUEO_SEGUNDOS: z.coerce.number().int().positive().default(600),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Soporte
  SOPORTE_CONTACTO: z.string().default('soporte@fing.uncuyo.edu.ar'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
}).refine((data) => data.SALDO_UMBRAL_ADVERTENCIA > data.SALDO_UMBRAL_CRITICO, {
  message: 'SALDO_UMBRAL_ADVERTENCIA debe ser mayor que SALDO_UMBRAL_CRITICO',
  path: ['SALDO_UMBRAL_ADVERTENCIA'],
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // No usamos el logger aca porque todavia no esta inicializado.
  console.error('Variables de entorno invalidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isDev: raw.NODE_ENV === 'development',
  corsOrigins: raw.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
} as const;

export type Env = typeof env;
