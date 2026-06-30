import { z } from 'zod';

export const eleccionIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int('El id debe ser un entero')
    .positive('El id debe ser un entero positivo'),
});

export const votarBodySchema = z.object({
  indice_lista: z
    .number({ required_error: 'El índice de lista es requerido' })
    .int('El índice de lista debe ser un entero')
    .min(0, 'El índice de lista debe ser mayor o igual a 0'),
});
