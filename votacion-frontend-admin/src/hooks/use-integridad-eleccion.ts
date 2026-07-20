"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerIntegridadRequest } from "@/lib/api/elecciones";

/** Verificación BD vs. blockchain de una elección (GET /api/admin/elecciones/:id/integridad). */
export function useIntegridadEleccion(id: number) {
  return useQuery({
    queryKey: ["admin", "elecciones", id, "integridad"],
    queryFn: () => obtenerIntegridadRequest(id),
    enabled: Number.isFinite(id),
  });
}
