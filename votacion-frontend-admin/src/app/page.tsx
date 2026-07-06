"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/lib/auth/session";

export default function RootPage() {
  const router = useRouter();
  const session = useAdminSession();

  useEffect(() => {
    router.replace(session ? "/admin" : "/login");
  }, [session, router]);

  return null;
}
