import { ApiError, NetworkError } from "./errors";
import { getAuthHeader } from "@/lib/auth/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TIMEOUT_MS = 15_000;

interface ErrorBody {
  error?: string;
}

/**
 * Fetch contra el backend, con timeout y manejo uniforme de errores.
 *
 * - Si la respuesta es 2xx: devuelve el body parseado como `TResponse`.
 * - Si la respuesta es un error HTTP (4xx/5xx): lanza `ApiError` con el
 *   mensaje que manda el backend en `{ error: string }` (ver
 *   votacion-backend/src/plugins/error-handler.plugin.ts).
 * - Si el fetch nunca llega a tener respuesta (sin conexión, timeout,
 *   backend caído, CORS bloqueado): lanza `NetworkError`.
 */
/**
 * Fetch con timeout, compartido por `request` (respuestas JSON), `getBlob`
 * (respuestas binarias/CSV) y otros callers fuera de este módulo que
 * necesitan pegarle al backend sin arriesgarse a colgar para siempre (ej.
 * logoutRequest en lib/api/auth.ts) — solo resuelve la parte que es igual
 * para todos: llegar a tener una `Response`, o lanzar `NetworkError` si el
 * fetch nunca llega a completarse. No toca el body: cada caller lo lee
 * según el content-type que espera (`.json()` vs `.blob()`).
 */
export async function fetchConTimeout(
  path: string,
  init: RequestInit,
  timeoutMs: number = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch {
    // TypeError (sin red/CORS/DNS) o AbortError (timeout): tratamos todo
    // como "sin conexión con el servidor", que es lo único que el usuario
    // puede accionar (reintentar).
    throw new NetworkError();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<TResponse>(
  path: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<TResponse> {
  const response = await fetchConTimeout(path, init, timeoutMs);
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as ErrorBody | null)?.error ??
      "Ocurrió un error inesperado. Intentá nuevamente.";
    throw new ApiError(response.status, message);
  }

  return data as TResponse;
}

/**
 * POST autenticado (adjunta el header `Authorization` si hay sesión guardada
 * — inofensivo para endpoints públicos como login, donde no hay sesión
 * todavía y `getAuthHeader()` devuelve `{}`).
 *
 * `timeoutMs` permite overridear el timeout default (15s) para endpoints que
 * se sabe que tardan más — ej. POST /api/admin/elecciones, que despliega un
 * contrato en BFA antes de responder.
 */
export function postJson<TResponse>(
  path: string,
  body: unknown,
  options?: { timeoutMs?: number },
): Promise<TResponse> {
  return request<TResponse>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(body),
    },
    options?.timeoutMs,
  );
}

/** GET autenticado: adjunta el header `Authorization` de la sesión guardada (ver lib/auth/session.ts). */
export function getJson<TResponse>(path: string): Promise<TResponse> {
  return request<TResponse>(path, {
    method: "GET",
    headers: { ...getAuthHeader() },
  });
}

/** DELETE autenticado: adjunta el header `Authorization` de la sesión guardada. */
export function deleteJson<TResponse>(path: string): Promise<TResponse> {
  return request<TResponse>(path, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
}

/**
 * GET autenticado que devuelve un archivo binario (ej. el CSV de
 * /api/admin/padron/descargar) en vez de JSON. El body de error sigue
 * siendo JSON (`{ error }`, mismo error-handler plugin del backend), así
 * que en el camino de error sí lo parseamos; en el camino de éxito no —
 * `response.json()` sobre un CSV rompería el parseo.
 */
export async function getBlob(path: string): Promise<Blob> {
  const response = await fetchConTimeout(path, {
    method: "GET",
    headers: { ...getAuthHeader() },
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const message =
      (data as ErrorBody | null)?.error ??
      "Ocurrió un error inesperado. Intentá nuevamente.";
    throw new ApiError(response.status, message);
  }

  return response.blob();
}
