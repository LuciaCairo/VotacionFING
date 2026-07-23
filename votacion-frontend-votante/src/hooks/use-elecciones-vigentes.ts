"use client";

import { useQuery } from "@tanstack/react-query";
import { listarEleccionesVigentesRequest } from "@/lib/api/elecciones";

export function useEleccionesVigentes() {
  return useQuery({
    queryKey: ["votante", "elecciones", "vigentes"],
    queryFn: listarEleccionesVigentesRequest,
  });
}
