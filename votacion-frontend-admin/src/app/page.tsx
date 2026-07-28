"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/lib/auth/session";

export default function RootPage() {
  const router = useRouter();
  const session = useAdminSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mismo `mounted` que AdminGuard (ver components/admin/admin-guard.tsx):
  // `useAdminSession` ve `session = null` en el primer render de hidratación
  // aunque haya sesión guardada, así que redirigir ahí mismo mandaría a un
  // admin logueado a /login (y de ahí de vuelta a /admin) en cada hard reload.
  useEffect(() => {
    if (mounted) router.replace(session ? "/admin" : "/login");
  }, [mounted, session, router]);

  return null;
}
