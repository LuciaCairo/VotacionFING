"use client";

import { useMutation } from "@tanstack/react-query";
import {
  verificarResultadosRequest,
  type VerificacionResultadosDTO,
} from "@/lib/api/elecciones";
import { ApiError, NetworkError } from "@/lib/api/errors";

/**
 * Verificación en vivo de los resultados contra el contrato en BFA
 * (GET /api/elecciones/:id/verificacion). Es una mutación y no una query
 * porque la dispara el votante con un botón, y cada vez tiene que volver a
 * leer la cadena en vez de mostrar algo cacheado.
 */
export function useVerificarResultados(id: number) {
  return useMutation<VerificacionResultadosDTO, ApiError | NetworkError>({
    mutationFn: () => verificarResultadosRequest(id),
  });
}
