import { z } from "zod";

/**
 * Body de POST /api/auth/login/admin.
 * Nombres de campo ("correo") y reglas espejadas del backend
 * (votacion-backend/src/modules/auth/auth.schemas.ts) para que la
 * validación del cliente nunca esté más floja que la del servidor.
 */
export const loginAdminSchema = z.object({
  correo: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Ingresá un correo electrónico válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
