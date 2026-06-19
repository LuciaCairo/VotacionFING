import type { TipoEvento, RolUsuario } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

interface RegistrarLogParams {
  tipoEvento: TipoEvento;
  rolUsuario: RolUsuario;
  descripcion?: string;
  idUsuario?: number | null;
  ip?: string | null;
}

/**
 * Persiste un evento critico en la tabla LOG.
 * Nunca debe recibir passwords, hashes de voto ni datos sensibles
 * en `descripcion`.
 *
 * Es "best-effort": si falla el guardado del log no debe tumbar la
 * operacion principal, solo se reporta por el logger de aplicacion.
 */
export async function registrarLog(params: RegistrarLogParams): Promise<void> {
  const { tipoEvento, rolUsuario, descripcion, idUsuario, ip } = params;
  try {
    await prisma.log.create({
      data: {
        tipoEvento,
        rolUsuario,
        descripcion: descripcion ?? null,
        idUsuario: idUsuario ?? null,
        ip: ip ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, tipoEvento }, 'No se pudo registrar el evento en LOG');
  }
}
