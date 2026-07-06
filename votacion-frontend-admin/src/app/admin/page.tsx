"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ElectionCard } from "@/components/admin/election-card";
import { EmptyElectionsState } from "@/components/admin/empty-state";
import { useElecciones } from "@/hooks/use-elecciones";
import { useLogout } from "@/hooks/use-logout";
import { SECCION_LABELS, type Seccion } from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";

export default function AdminHomePage() {
  const router = useRouter();
  const logout = useLogout();
  const query = useElecciones();
  const [activeSeccion, setActiveSeccion] = useState<Seccion>("creada");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sesión expirada del lado del servidor (401 en /api/admin/elecciones):
  // limpiamos el JWT local y mandamos a /login en vez de mostrar un error
  // genérico o una lista vacía.
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      clearAdminSession();
      router.replace("/login");
    }
  }, [query.error, router]);

  const sesionExpirada =
    query.error instanceof ApiError && query.error.status === 401;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eef1f5]">
      <AdminSidebar
        activeSeccion={activeSeccion}
        onSelectSeccion={setActiveSeccion}
        onLogout={logout}
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
            Panel de Administración
          </span>
        </div>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-11">
          <h1 className="mb-6 text-[22px] font-extrabold text-[#0a2540]">
            {SECCION_LABELS[activeSeccion]}
          </h1>

          <div className="flex max-w-[960px] flex-col gap-3">
            {query.isPending && <EleccionesSkeleton />}

            {query.isError && !sesionExpirada && (
              <EleccionesErrorState onRetry={() => query.refetch()} />
            )}

            {query.isSuccess &&
              (() => {
                const elecciones = query.data[activeSeccion];
                if (elecciones.length === 0) return <EmptyElectionsState />;
                return elecciones.map((eleccion) => (
                  <ElectionCard
                    key={eleccion.id}
                    eleccion={eleccion}
                    seccion={activeSeccion}
                  />
                ));
              })()}
          </div>
        </main>
      </div>
    </div>
  );
}

function EleccionesSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-[68px] animate-pulse rounded-xl border border-[#e2e7ec] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]"
        />
      ))}
    </div>
  );
}

function EleccionesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-[#f6c6c6] bg-[#fdecec] p-6 text-center">
      <p className="text-[13.5px] font-semibold text-[#9c2b2b]">
        No pudimos cargar las elecciones.
      </p>
      <p className="mt-1 text-[13px] text-[#a83d3d]">
        Revisá tu conexión e intentá de nuevo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-[8px] border border-[#d64545]/30 bg-white px-4 py-2 text-[13px] font-bold text-[#9c2b2b] transition-colors hover:bg-[#fdecec]"
      >
        Reintentar
      </button>
    </div>
  );
}
