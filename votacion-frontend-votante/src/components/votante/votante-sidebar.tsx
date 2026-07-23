"use client";

import { CerrarSesionDialog } from "@/components/votante/cerrar-sesion-dialog";
import { FacultadLogo } from "@/components/brand/facultad-logo";
import { cn } from "@/lib/utils";

export type VotanteSeccion = "vigentes" | "finalizadas";

export const VOTANTE_SECCIONES: readonly VotanteSeccion[] = [
  "vigentes",
  "finalizadas",
];

export const VOTANTE_SECCION_LABELS: Record<VotanteSeccion, string> = {
  vigentes: "Elecciones vigentes",
  finalizadas: "Elecciones finalizadas",
};

interface VotanteSidebarProps {
  activeSeccion: VotanteSeccion;
  onSelectSeccion: (seccion: VotanteSeccion) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

/**
 * Mismo patrón que `AdminSidebar` (ver
 * votacion-frontend-admin/src/components/admin/admin-sidebar.tsx), calcado
 * a propósito: las secciones son botones que cambian estado en la página
 * (`activeSeccion`/`onSelectSeccion`), no `<Link>` a rutas — igual que el
 * admin, no navega de verdad. `md:static md:translate-x-0` lo vuelve un
 * sidebar fijo normal en escritorio; en mobile es un drawer `fixed` que se
 * desliza con `-translate-x-full` ↔ `translate-x-0` sobre un backdrop.
 */
export function VotanteSidebar({
  activeSeccion,
  onSelectSeccion,
  onLogout,
  open,
  onClose,
}: VotanteSidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[310px] shrink-0 flex-col overflow-y-auto bg-[linear-gradient(180deg,#0d3a63_0%,#0a2540_55%,#071a30_100%)] px-[22px] py-8 transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-9 w-full max-w-[190px]">
          <FacultadLogo className="h-auto w-full object-contain" />
        </div>

        <nav className="flex flex-col gap-1.5" aria-label="Secciones de elecciones">
          {VOTANTE_SECCIONES.map((seccion) => {
            const active = seccion === activeSeccion;
            return (
              <button
                key={seccion}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onSelectSeccion(seccion);
                  onClose();
                }}
                className="rounded-[8px] p-3.5 text-left text-[13.5px] font-bold tracking-[0.3px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{
                  backgroundColor: active
                    ? "rgba(31,143,224,0.18)"
                    : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.7)",
                  borderLeft: `3px solid ${active ? "#1f8fe0" : "transparent"}`,
                }}
              >
                {VOTANTE_SECCION_LABELS[seccion]}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <CerrarSesionDialog onConfirm={onLogout} />
      </aside>
    </>
  );
}
