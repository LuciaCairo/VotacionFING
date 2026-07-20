import { fetchConTimeout, postJson } from "./http";
import type { LoginAdminInput } from "@/lib/validations/auth";

/** Forma exacta de la respuesta 200 de POST /api/auth/login/admin. */
export interface LoginAdminResponse {
  token: string;
  admin: {
    id: number;
    correo: string;
  };
}

export function loginAdminRequest(
  input: LoginAdminInput,
): Promise<LoginAdminResponse> {
  return postJson<LoginAdminResponse>("/api/auth/login/admin", input);
}

/**
 * Cierra la sesión del lado del servidor (agrega el jti del token a la
 * blacklist de Redis). Es "best effort": si falla la llamada de red, el
 * llamador igual debe limpiar la sesión local.
 *
 * Usa `fetchConTimeout` (mismo wrapper con `AbortController` que el resto de
 * la app) en vez de `fetch` crudo: sin esto, un backend inalcanzable dejaba
 * este `await` colgado indefinidamente y "Cerrar sesión" no reaccionaba.
 */
export async function logoutRequest(token: string): Promise<void> {
  await fetchConTimeout("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
