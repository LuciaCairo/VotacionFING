import { useSyncExternalStore } from "react";
import type { LoginVotanteResponse } from "@/lib/api/auth";

/**
 * Persistencia de la sesión del votante.
 *
 * Mismo criterio que el panel de administración (ver
 * votacion-frontend-admin/src/lib/auth/session.ts): el backend no setea
 * cookies, devuelve el JWT en el body y espera `Authorization: Bearer
 * <token>` en las rutas protegidas. Se persiste en localStorage bajo una
 * clave distinta a la del admin para que ambas apps puedan convivir en el
 * mismo navegador sin pisarse la sesión.
 *
 * Diferencia clave respecto al admin: el JWT del votante expira en 30
 * minutos (`JWT_EXPIRES_VOTANTE=1800`) contra 60 del admin. No hay manejo
 * proactivo de expiración acá (tal como en el admin no lo hay): la sesión
 * vive hasta que una llamada autenticada devuelve 401 y el flujo de la
 * pantalla que la usa reacciona a eso.
 */

const STORAGE_KEY = "votacion-fing:votante-session";

export interface VotanteSession {
  token: string;
  votante: LoginVotanteResponse["votante"];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveVotanteSession(session: VotanteSession): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getVotanteSession(): VotanteSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as VotanteSession;
  } catch {
    return null;
  }
}

export function clearVotanteSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Header listo para adjuntar a llamadas autenticadas contra el backend. */
export function getAuthHeader(): Record<string, string> {
  const session = getVotanteSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

// ─── Lectura reactiva (useSyncExternalStore) ──────────────────────────

let snapshotCache: { raw: string | null; session: VotanteSession | null } = {
  raw: null,
  session: null,
};

function getSnapshot(): VotanteSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotCache.raw) return snapshotCache.session;

  let session: VotanteSession | null = null;
  if (raw) {
    try {
      session = JSON.parse(raw) as VotanteSession;
    } catch {
      session = null;
    }
  }
  snapshotCache = { raw, session };
  return session;
}

function getServerSnapshot(): VotanteSession | null {
  return null;
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

/** Sesión actual del votante, reactiva a cambios de localStorage (incl. otras pestañas). */
export function useVotanteSession(): VotanteSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
