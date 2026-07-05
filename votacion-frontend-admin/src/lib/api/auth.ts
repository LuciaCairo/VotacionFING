import { postJson } from "./http";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Cierra la sesión del lado del servidor (agrega el jti del token a la
 * blacklist de Redis). Es "best effort": si falla la llamada de red, el
 * llamador igual debe limpiar la sesión local.
 */
export async function logoutRequest(token: string): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
