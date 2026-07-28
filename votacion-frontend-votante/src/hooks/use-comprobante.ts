"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerComprobanteRequest } from "@/lib/api/elecciones";

/**
 * Comprobante de un voto ya emitido (GET /api/votante/elecciones/:id/comprobante).
 * Solo tiene sentido pedirlo cuando el detalle de la elección ya informó
 * `ya_voto: true` — `enabled` lo deja frenado hasta ese momento.
 */
export function useComprobante(id: number, habilitado: boolean) {
  return useQuery({
    queryKey: ["votante", "elecciones", id, "comprobante"],
    queryFn: () => obtenerComprobanteRequest(id),
    enabled: Number.isFinite(id) && habilitado,
  });
}
