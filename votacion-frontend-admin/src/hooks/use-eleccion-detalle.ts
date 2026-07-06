"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerEleccionRequest } from "@/lib/api/elecciones";

/** Detalle de una elección puntual (GET /api/admin/elecciones/:id), no la cache del listado. */
export function useEleccionDetalle(id: number) {
  return useQuery({
    queryKey: ["admin", "elecciones", id],
    queryFn: () => obtenerEleccionRequest(id),
    enabled: Number.isFinite(id),
  });
}
