"use client";

import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { clearAdminSession, useAdminSession } from "@/lib/auth/session";

/** Cierra sesión en el backend (best effort), limpia el JWT local y redirige a /login. */
export function useLogout() {
  const router = useRouter();
  const session = useAdminSession();

  return async function logout() {
    if (session) await logoutRequest(session.token).catch(() => {});
    clearAdminSession();
    router.replace("/login");
  };
}
