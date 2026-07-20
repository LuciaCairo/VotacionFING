import { z } from "zod";

/**
 * Mínimo de listas "reales" (sin contar el voto en blanco, que el backend
 * agrega solo — ver ListaCreacionInput en lib/api/elecciones.ts) para poder
 * crear la elección. Espejado de `crearEleccionSchema` en el backend
 * (`listas: z.array(...).min(2, ...)`).
 */
export const MINIMO_LISTAS = 2;

/**
 * El backend rechaza este nombre exacto (case-sensitive) para no chocar con
 * la lista que agrega solo al desplegar el contrato — ver VOTO_EN_BLANCO en
 * admin.service.ts. Acá comparamos case-insensitive: es más estricto que el
 * backend (nunca deja pasar algo que el backend rechazaría) y evita que el
 * admin cree, sin darse cuenta, una lista "voto en blanco" en minúsculas que
 * conviviría rara con la real.
 */
const NOMBRE_VOTO_EN_BLANCO = "voto en blanco";

const MAX_LARGO_NOMBRE_LISTA = 100;

/**
 * Valida el nombre de una lista contra las reglas reales del backend
 * (obligatorio, largo máximo, nombre reservado) más la regla de duplicados
 * del propio formulario (comparando contra las listas ya agregadas). No hay
 * default silencioso: un nombre vacío es un error, no se completa con
 * "LISTA" como hacía el mock.
 */
export function validarNombreLista(
  nombre: string,
  nombresExistentes: string[],
): string | null {
  const limpio = nombre.trim();

  if (!limpio) return "El nombre de la lista es obligatorio.";
  if (limpio.length > MAX_LARGO_NOMBRE_LISTA) {
    return `El nombre no puede superar ${MAX_LARGO_NOMBRE_LISTA} caracteres.`;
  }
  if (limpio.toLowerCase() === NOMBRE_VOTO_EN_BLANCO) {
    return 'El nombre "Voto en blanco" está reservado. No se puede utilizar';
  }
  if (nombresExistentes.some((n) => n.trim().toLowerCase() === limpio.toLowerCase())) {
    return "Ya agregaste una lista con ese nombre.";
  }

  return null;
}

/**
 * Campos escalares del formulario (nombre de la elección + fechas). El
 * array `listas` se maneja aparte con `validarNombreLista` y el chequeo de
 * `MINIMO_LISTAS`, no como un campo más de este schema — se edita a través
 * del diálogo de agregar/editar, no de inputs registrados en el form.
 *
 * Las fechas llegan acá como el valor crudo de <input type="datetime-local">
 * (sin timezone); la conversión a ISO 8601 pasa recién al armar el body del
 * POST (ver app/admin/elecciones/nueva/page.tsx).
 */
export const crearEleccionFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre de la elección es obligatorio")
      .max(150, "El nombre no puede superar 150 caracteres"),
    fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria"),
    fechaCierre: z.string().min(1, "La fecha de cierre es obligatoria"),
  })
  .superRefine((values, ctx) => {
    if (!values.fechaInicio || !values.fechaCierre) return;

    const inicio = new Date(values.fechaInicio);
    const cierre = new Date(values.fechaCierre);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(cierre.getTime())) return;

    if (inicio.getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaInicio"],
        message: "La fecha de inicio no puede ser en el pasado.",
      });
    }

    if (cierre.getTime() <= inicio.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaCierre"],
        message: "La fecha de cierre debe ser posterior a la fecha de inicio.",
      });
    }
  });

export type CrearEleccionFormValues = z.infer<typeof crearEleccionFormSchema>;
