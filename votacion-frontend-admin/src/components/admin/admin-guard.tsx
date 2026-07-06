"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/lib/auth/session";

/** Protege todo /admin/*: sin sesión guardada, redirige a /login. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useAdminSession();

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session, router]);

  if (!session) return null;

  return <>{children}</>;
}
