"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { Seccion } from "@/lib/api/elecciones";

interface AdminShellProps {
  activeSeccion: Seccion | null;
  onSelectSeccion: (seccion: Seccion) => void;
  onLogout: () => void;
  /** Título de la barra superior mobile (donde no entra el sidebar). */
  mobileTitle?: string;
  children: React.ReactNode;
}

/**
 * Shell compartido por las pantallas "de panel" del admin (Home y Padrón):
 * sidebar fijo + barra mobile con hamburguesa + área de contenido con
 * scroll propio. Las pantallas "de drill-down" (detalle de elección,
 * resultados) no usan este shell — tienen su propio fondo/tarjeta flotante
 * sin sidebar, ver app/admin/elecciones/[id]/page.tsx.
 */
export function AdminShell({
  activeSeccion,
  onSelectSeccion,
  onLogout,
  mobileTitle = "Panel de Administración",
  children,
}: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eef1f5]">
      <AdminSidebar
        activeSeccion={activeSeccion}
        onSelectSeccion={onSelectSeccion}
        onLogout={onLogout}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#e2e7ec] bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-2 hover:bg-[#f4f6f8]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="#0a2540"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="text-sm font-bold text-[#0a2540]">
            {mobileTitle}
          </span>
        </div>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-11">
          {children}
        </main>
      </div>
    </div>
  );
}
