import { z } from "zod";

/**
 * Body de POST /api/auth/login/votante.
 * Nombres de campo ("legajo") y reglas espejadas del backend
 * (votacion-backend/src/modules/auth/auth.schemas.ts) para que la
 * validación del cliente nunca esté más floja que la del servidor.
 */
export const loginVotanteSchema = z.object({
  legajo: z
    .string()
    .min(1, "El legajo es obligatorio")
    .max(20, "El legajo no puede tener más de 20 caracteres"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginVotanteInput = z.infer<typeof loginVotanteSchema>;
