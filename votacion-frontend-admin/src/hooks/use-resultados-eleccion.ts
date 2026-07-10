"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerResultadosRequest } from "@/lib/api/elecciones";

/** Resultados de una elección finalizada (GET /api/elecciones/:id/resultados). */
export function useResultadosEleccion(id: number) {
  return useQuery({
    queryKey: ["elecciones", id, "resultados"],
    queryFn: () => obtenerResultadosRequest(id),
    enabled: Number.isFinite(id),
  });
}
