import { useSyncExternalStore } from "react";
import type { LoginAdminResponse } from "@/lib/api/auth";

/**
 * Persistencia de la sesión del administrador.
 *
 * El backend (@fastify/jwt, ver votacion-backend/src/plugins/auth.plugin.ts)
 * no setea cookies: devuelve el JWT en el body de la respuesta y espera que
 * las rutas protegidas lo reciban como header `Authorization: Bearer <token>`.
 * Por eso el token se persiste acá (localStorage) en lugar de una cookie
 * httpOnly, que el backend no está seteando. Es la primera pieza de
 * frontend del proyecto: si más adelante se agrega otra convención de
 * sesión (ej. cookies), migrar este módulo en un solo lugar.
 */

const STORAGE_KEY = "votacion-fing:admin-session";

export interface AdminSession {
  token: string;
  admin: LoginAdminResponse["admin"];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveAdminSession(session: AdminSession): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Header listo para adjuntar a llamadas autenticadas contra el backend. */
export function getAuthHeader(): Record<string, string> {
  const session = getAdminSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

// ─── Lectura reactiva (useSyncExternalStore) ──────────────────────────
//
// localStorage es un store externo a React: leerlo con useState+useEffect
// obliga a un setState dentro del efecto (dispara warnings de
// react-hooks/set-state-in-effect y arriesga un salto de contenido en la
// hidratación). useSyncExternalStore es la herramienta pensada para esto,
// y de paso sincroniza si la sesión cambia en otra pestaña (evento
// `storage`).

let snapshotCache: { raw: string | null; session: AdminSession | null } = {
  raw: null,
  session: null,
};

function getSnapshot(): AdminSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotCache.raw) return snapshotCache.session;

  let session: AdminSession | null = null;
  if (raw) {
    try {
      session = JSON.parse(raw) as AdminSession;
    } catch {
      session = null;
    }
  }
  snapshotCache = { raw, session };
  return session;
}

function getServerSnapshot(): AdminSession | null {
  return null;
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

/** Sesión actual del admin, reactiva a cambios de localStorage (incl. otras pestañas). */
export function useAdminSession(): AdminSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
