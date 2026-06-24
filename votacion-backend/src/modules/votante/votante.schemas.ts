import { z } from 'zod';

export const eleccionIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int('El id debe ser un entero')
    .positive('El id debe ser un entero positivo'),
});
