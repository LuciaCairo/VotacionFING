import { ApiError, NetworkError } from "./errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TIMEOUT_MS = 15_000;

interface ErrorBody {
  error?: string;
}

/**
 * POST JSON contra el backend, con timeout y manejo uniforme de errores.
 *
 * - Si la respuesta es 2xx: devuelve el body parseado como `TResponse`.
 * - Si la respuesta es un error HTTP (4xx/5xx): lanza `ApiError` con el
 *   mensaje que manda el backend en `{ error: string }` (ver
 *   votacion-backend/src/plugins/error-handler.plugin.ts).
 * - Si el fetch nunca llega a tener respuesta (sin conexión, timeout,
 *   backend caído, CORS bloqueado): lanza `NetworkError`.
 */
export async function postJson<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as ErrorBody | null)?.error ??
      "Ocurrió un error inesperado. Intentá nuevamente.";
    throw new ApiError(response.status, message);
  }

  return data as TResponse;
}
