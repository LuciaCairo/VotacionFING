"use client";

import { useQuery } from "@tanstack/react-query";
import { listarEleccionesRequest } from "@/lib/api/elecciones";

/**
 * Una sola carga para las 3 secciones (Creadas/Publicadas/Finalizadas): el
 * cambio de tab en la UI es estado local, no dispara un nuevo fetch.
 */
export function useElecciones() {
  return useQuery({
    queryKey: ["admin", "elecciones"],
    queryFn: listarEleccionesRequest,
  });
}
