"use client";

import { useState } from "react";
import { VotanteSidebar, type VotanteSeccion } from "@/components/votante/votante-sidebar";

interface VotanteShellProps {
  activeSeccion: VotanteSeccion;
  onSelectSeccion: (seccion: VotanteSeccion) => void;
  onLogout: () => void;
  /** Título de la barra superior mobile (donde no entra el sidebar). */
  mobileTitle?: string;
  children: React.ReactNode;
}

/**
 * Shell compartido por las pantallas "de panel" del votante: sidebar fijo
 * + barra mobile con hamburguesa + área de contenido con scroll propio.
 * Mismo patrón que `AdminShell` del panel de administración (ver
 * votacion-frontend-admin/src/components/admin/admin-shell.tsx) —
 * replicado, no reinventado, incluida la forma de manejar la sección
 * activa: recibe `activeSeccion`/`onSelectSeccion` por prop en vez de
 * resolverlos por ruta, porque igual que el admin no navega de verdad
 * entre secciones.
 */
export function VotanteShell({
  activeSeccion,
  onSelectSeccion,
  onLogout,
  mobileTitle = "Votación Electrónica",
  children,
}: VotanteShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eef1f5]">
      <VotanteSidebar
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
