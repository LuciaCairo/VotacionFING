"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  eliminarEleccionRequest,
  type EliminarEleccionResponse,
} from "@/lib/api/elecciones";
import type { ApiError, NetworkError } from "@/lib/api/errors";

/**
 * DELETE /api/admin/elecciones/:id. El backend puede rechazar el borrado con
 * 409 si la elección ya comenzó o si su fecha de inicio ya pasó (aunque siga
 * figurando como "creada" porque el job de apertura no corrió todavía) — ese
 * mensaje ya viene listo para mostrar en `ApiError.message`.
 *
 * Invalida el listado del Home (misma queryKey que `useElecciones`) para que
 * la elección eliminada desaparezca de "Elecciones Creadas" al volver.
 */
export function useEliminarEleccion() {
  const queryClient = useQueryClient();

  return useMutation<
    EliminarEleccionResponse,
    ApiError | NetworkError,
    number
  >({
    mutationFn: (id: number) => eliminarEleccionRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "elecciones"] });
    },
  });
}
