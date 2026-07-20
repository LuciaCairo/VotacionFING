"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  crearEleccionRequest,
  type CrearEleccionInput,
} from "@/lib/api/elecciones";
import type { EleccionDetalleDTO } from "@/lib/api/elecciones";
import type { ApiError, NetworkError } from "@/lib/api/errors";

/**
 * POST /api/admin/elecciones: crea la elección y despliega su contrato en
 * BFA. Invalida el listado del Home (misma queryKey que `useElecciones`)
 * para que la nueva elección aparezca en "Elecciones Creadas" al volver.
 */
export function useCrearEleccion() {
  const queryClient = useQueryClient();

  return useMutation<
    EleccionDetalleDTO,
    ApiError | NetworkError,
    CrearEleccionInput
  >({
    mutationFn: crearEleccionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "elecciones"] });
    },
  });
}
