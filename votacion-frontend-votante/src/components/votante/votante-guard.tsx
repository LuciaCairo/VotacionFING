"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVotanteSession } from "@/lib/auth/session";

/**
 * Protege todo /votante/*: sin sesión guardada, redirige a /login.
 *
 * Mismo criterio que AdminGuard del panel de administración: `mounted`
 * retrasa la decisión un render para no rebotar a /login en un hard reload
 * antes de que `useVotanteSession` llegue a leer localStorage.
 */
export function VotanteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useVotanteSession();
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
