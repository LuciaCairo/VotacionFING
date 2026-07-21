import { fetchConTimeout, postJson } from "./http";
import type { LoginVotanteInput } from "@/lib/validations/auth";

/** Forma exacta de la respuesta 200 de POST /api/auth/login/votante. */
export interface LoginVotanteResponse {
  token: string;
  votante: {
    id: number;
    nombre_completo: string;
    legajo: string;
    carrera: string;
  };
}

export function loginVotanteRequest(
  input: LoginVotanteInput,
): Promise<LoginVotanteResponse> {
  return postJson<LoginVotanteResponse>("/api/auth/login/votante", input);
}

/**
 * Cierra la sesión del lado del servidor (agrega el jti del token a la
 * blacklist de Redis). Es "best effort": si falla la llamada de red, el
 * llamador igual debe limpiar la sesión local.
 */
export async function logoutRequest(token: string): Promise<void> {
  await fetchConTimeout("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
