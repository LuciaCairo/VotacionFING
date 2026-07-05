"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { clearAdminSession, useAdminSession } from "@/lib/auth/session";

/**
 * Placeholder de la home del panel (la pantalla real de categorías todavía
 * no está implementada). Solo sirve para probar el flujo completo de login:
 * si no hay sesión guardada, redirige a /login.
 */
export default function HomePage() {
  const router = useRouter();
  const session = useAdminSession();

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session, router]);

  async function handleLogout() {
    if (session) await logoutRequest(session.token).catch(() => {});
    clearAdminSession();
    router.replace("/login");
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-[#eef1f5] p-6 text-center">
      <p className="text-sm text-[#5b6b7c]">
        Panel de administración (en construcción)
      </p>
      <h1 className="text-xl font-bold text-[#0a2540]">
        Bienvenido, {session.admin.correo}
      </h1>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-[10px] border border-[#d7dde3] px-4 py-2 text-sm font-semibold text-[#33475b] transition-colors hover:bg-[#f4f6f8]"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
