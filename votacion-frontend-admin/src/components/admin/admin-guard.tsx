"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/lib/auth/session";

/**
 * Protege todo /admin/*: sin sesión guardada, redirige a /login.
 *
 * `useAdminSession` no puede leer localStorage en el snapshot de servidor,
 * así que el primer render de hidratación siempre ve `session = null` aunque
 * haya una sesión guardada. Si redirigiéramos en ese primer render, un hard
 * reload de cualquier ruta /admin/* rebotaría a /login (y de ahí de vuelta a
 * /admin) incluso estando logueado. `mounted` retrasa la decisión un render,
 * momento en el que `useAdminSession` ya lee localStorage directamente.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useAdminSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !session) router.replace("/login");
  }, [mounted, session, router]);

  if (!mounted || !session) return null;

  return <>{children}</>;
}
