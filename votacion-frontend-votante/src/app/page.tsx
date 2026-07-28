"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVotanteSession } from "@/lib/auth/session";

export default function RootPage() {
  const router = useRouter();
  const session = useVotanteSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mismo `mounted` que VotanteGuard (ver components/votante/votante-guard.tsx):
  // `useVotanteSession` ve `session = null` en el primer render de hidratación
  // aunque haya sesión guardada, así que redirigir ahí mismo mandaría a un
  // votante logueado a /login (y de ahí de vuelta a /votante) en cada hard reload.
  useEffect(() => {
    if (mounted) router.replace(session ? "/votante" : "/login");
  }, [mounted, session, router]);

  return null;
}
