import { z } from 'zod';

/** Body de POST /api/auth/login/votante */
export const loginVotanteSchema = z.object({
  legajo: z.string().min(1, 'El legajo es obligatorio').max(20),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

/** Body de POST /api/auth/login/admin */
export const loginAdminSchema = z.object({
  correo: z.string().email('Correo invalido').max(100),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

export type LoginVotanteInput = z.infer<typeof loginVotanteSchema>;
export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
