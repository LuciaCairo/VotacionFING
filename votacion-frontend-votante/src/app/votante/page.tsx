"use client";

import { useVotanteSession } from "@/lib/auth/session";
import { useLogout } from "@/hooks/use-logout";
import { Button } from "@/components/ui/button";

/**
 * Stub temporal del home del votante: confirma que el login/guard
 * funcionan de punta a punta. Las pantallas reales (elecciones
 * disponibles, boleta, comprobante de voto) son trabajo futuro, sin
 * prototipo de referencia todavía.
 */
export default function VotantePage() {
  const session = useVotanteSession();
  const logout = useLogout();

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#eef1f5] px-5 py-6 sm:items-center sm:py-10">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white px-6 py-7 shadow-[0_20px_45px_rgba(10,37,64,0.12)]">
        <div className="mb-1 text-xs font-bold tracking-[1px] text-[#1f8fe0] uppercase">
          Sesión iniciada
        </div>
        <h1 className="mb-4 text-[22px] font-extrabold text-[#0a2540]">
          Hola, {session?.votante.nombre_completo ?? "votante"}
        </h1>
        <dl className="mb-6 flex flex-col gap-2 text-sm text-[#33475b]">
          <div className="flex justify-between border-b border-[#eef1f5] pb-2">
            <dt className="text-[#5b6b7c]">Legajo</dt>
            <dd className="font-semibold">{session?.votante.legajo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#5b6b7c]">Carrera</dt>
            <dd className="font-semibold">{session?.votante.carrera}</dd>
          </div>
        </dl>
        <Button variant="outline" className="w-full" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
