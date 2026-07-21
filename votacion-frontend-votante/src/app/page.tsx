"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVotanteSession } from "@/lib/auth/session";

export default function RootPage() {
  const router = useRouter();
  const session = useVotanteSession();

  useEffect(() => {
    router.replace(session ? "/votante" : "/login");
  }, [session, router]);

  return null;
}
