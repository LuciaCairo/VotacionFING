"use client";

import { useMutation } from "@tanstack/react-query";
import { loginVotanteRequest, type LoginVotanteResponse } from "@/lib/api/auth";
import { ApiError, NetworkError } from "@/lib/api/errors";
import type { LoginVotanteInput } from "@/lib/validations/auth";

export function useLoginVotante() {
  return useMutation<
    LoginVotanteResponse,
    ApiError | NetworkError,
    LoginVotanteInput
  >({
    mutationFn: loginVotanteRequest,
  });
}

export type LoginErrorKind =
  | "invalid_credentials"
  | "locked"
  | "network"
  | "unknown";

export interface ClassifiedLoginError {
  kind: LoginErrorKind;
  message: string;
}

/**
 * Traduce el error crudo de la mutation a uno de los estados que la UI
 * necesita distinguir. Ver votacion-backend/src/modules/auth/auth.service.ts:
 *   - 401 (NoAutenticadoError) -> mensaje genérico "Credenciales incorrectas".
 *     El backend usa el MISMO mensaje tanto si el legajo no existe, la
 *     contraseña no coincide, o la cuenta está deshabilitada (`activo:
 *     false`) — la UI nunca debe intentar distinguir estos casos.
 *   - 403 (ProhibidoError) -> cuenta bloqueada tras 5 intentos fallidos
 *     (mismo umbral y mismo mensaje que el admin: no hay variante propia
 *     de votante). El backend NO manda segundos restantes ni timestamp de
 *     desbloqueo, así que no armamos una cuenta regresiva.
 *   - fetch sin respuesta (NetworkError) -> sin conexión.
 *   - cualquier otro status (400/429/500/503) -> banner genérico con el
 *     mensaje del servidor si vino, para no perder información útil.
 */
export function classifyLoginError(
  error: ApiError | NetworkError | null,
): ClassifiedLoginError | null {
  if (!error) return null;

  if (error instanceof NetworkError) {
    return { kind: "network", message: error.message };
  }

  if (error.status === 401) {
    return { kind: "invalid_credentials", message: error.message };
  }

  if (error.status === 403) {
    return { kind: "locked", message: error.message };
  }

  return { kind: "unknown", message: error.message };
}
