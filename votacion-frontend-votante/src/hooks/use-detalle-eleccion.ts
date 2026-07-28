"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerDetalleEleccionRequest } from "@/lib/api/elecciones";

/** Detalle de una elección, incluida la boleta (GET /api/votante/elecciones/:id). */
export function useDetalleEleccion(id: number) {
  return useQuery({
    queryKey: ["votante", "elecciones", id],
    queryFn: () => obtenerDetalleEleccionRequest(id),
    enabled: Number.isFinite(id),
  });
}
