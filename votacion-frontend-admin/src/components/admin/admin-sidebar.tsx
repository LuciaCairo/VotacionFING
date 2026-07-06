"use client";

import Link from "next/link";
import { FacultadLogo } from "@/components/brand/facultad-logo";
import { SECCIONES, SECCION_LABELS, type Seccion } from "@/lib/api/elecciones";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  activeSeccion: Seccion;
  onSelectSeccion: (seccion: Seccion) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const ACTION_LINK_STYLE = { backgroundColor: "#1f8fe0" };

export function AdminSidebar({
  activeSeccion,
  onSelectSeccion,
  onLogout,
  open,
  onClose,
}: AdminSidebarProps) {
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
          {SECCIONES.map((seccion) => {
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
                {SECCION_LABELS[seccion]}
              </button>
            );
          })}
        </nav>

        <div className="my-6 h-px bg-white/[0.12]" />

        <div className="flex flex-col gap-2.5">
          <Link
            href="/admin/elecciones/nueva"
            className="rounded-[8px] px-3.5 py-3 text-center text-[13.5px] font-bold text-white shadow-[0_6px_16px_rgba(31,143,224,0.3)] transition-colors hover:brightness-110"
            style={ACTION_LINK_STYLE}
          >
            Crear Elección
          </Link>
          <Link
            href="/admin/padron"
            className="rounded-[8px] px-3.5 py-3 text-center text-[13.5px] font-bold text-white shadow-[0_6px_16px_rgba(31,143,224,0.3)] transition-colors hover:brightness-110"
            style={ACTION_LINK_STYLE}
          >
            Ver Padrón
          </Link>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 pt-3 text-[12.5px] font-semibold text-white/60 transition-colors hover:text-white/80"
        >
          Cerrar sesión
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </aside>
    </>
  );
}
