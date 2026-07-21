"use client";

import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { clearVotanteSession, useVotanteSession } from "@/lib/auth/session";

/** Cierra sesión en el backend (best effort), limpia el JWT local y redirige a /login. */
export function useLogout() {
  const router = useRouter();
  const session = useVotanteSession();

  return async function logout() {
    if (session) await logoutRequest(session.token).catch(() => {});
    clearVotanteSession();
    router.replace("/login");
  };
}
