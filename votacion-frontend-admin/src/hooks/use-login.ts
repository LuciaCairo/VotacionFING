"use client";

import { useMutation } from "@tanstack/react-query";
import { loginAdminRequest, type LoginAdminResponse } from "@/lib/api/auth";
import { ApiError, NetworkError } from "@/lib/api/errors";
import type { LoginAdminInput } from "@/lib/validations/auth";

export function useLoginAdmin() {
  return useMutation<
    LoginAdminResponse,
    ApiError | NetworkError,
    LoginAdminInput
  >({
    mutationFn: loginAdminRequest,
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
 *   - 401 (NoAutenticadoError) -> credenciales incorrectas, mensaje genérico
 *     (nunca revela si falló el correo o la contraseña).
 *   - 403 (ProhibidoError) -> cuenta bloqueada tras 5 intentos fallidos.
 *     El backend NO manda segundos restantes ni timestamp de desbloqueo,
 *     así que no armamos una cuenta regresiva: mostramos el mensaje tal
 *     cual lo manda el servidor.
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
