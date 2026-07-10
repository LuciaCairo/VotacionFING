"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listarPadronRequest } from "@/lib/api/padron";

/**
 * Padrón completo, filtrado por `busqueda` si no está vacío (ver
 * listarPadronRequest). `queryKey` incluye el término para que cada
 * búsqueda se cachee por separado, y `placeholderData: keepPreviousData`
 * mantiene la tabla anterior visible mientras se re-busca en vez de saltar
 * al skeleton en cada tecla (la pantalla distingue ese caso con
 * `query.isFetching`).
 */
export function usePadron(busqueda: string) {
  return useQuery({
    queryKey: ["admin", "padron", busqueda],
    queryFn: () => listarPadronRequest(busqueda || undefined),
    placeholderData: keepPreviousData,
  });
}
