"use client";

import { useQuery } from "@tanstack/react-query";
import { listarEleccionesFinalizadasRequest } from "@/lib/api/elecciones";

export function useEleccionesFinalizadas() {
  return useQuery({
    queryKey: ["votante", "elecciones", "finalizadas"],
    queryFn: listarEleccionesFinalizadasRequest,
  });
}
