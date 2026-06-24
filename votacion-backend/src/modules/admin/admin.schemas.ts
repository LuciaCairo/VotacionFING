import { z } from 'zod';

const listaInputSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre de la lista no puede estar vacío')
    .max(100, 'El nombre de la lista no puede superar 100 caracteres'),
});

export const crearEleccionSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre de la elección es obligatorio')
    .max(150, 'El nombre no puede superar 150 caracteres'),
  fecha_inicio: z.string().datetime({ message: 'fecha_inicio debe ser una fecha ISO 8601 válida' }),
  fecha_cierre: z.string().datetime({ message: 'fecha_cierre debe ser una fecha ISO 8601 válida' }),
  listas: z
    .array(listaInputSchema)
    .min(2, 'La elección debe tener al menos 2 listas'),
});

export type CrearEleccionInput = z.infer<typeof crearEleccionSchema>;

export const eleccionIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int('El id debe ser un entero')
    .positive('El id debe ser un entero positivo'),
});

export type EleccionIdParam = z.infer<typeof eleccionIdParamSchema>;
