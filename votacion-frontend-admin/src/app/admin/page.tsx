"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ElectionCard } from "@/components/admin/election-card";
import { EmptyElectionsState } from "@/components/admin/empty-state";
import { useElecciones } from "@/hooks/use-elecciones";
import { useLogout } from "@/hooks/use-logout";
import { SECCION_LABELS, SECCIONES, type Seccion } from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";

function esSeccion(valor: string | null): valor is Seccion {
  return SECCIONES.includes(valor as Seccion);
}

/**
 * `useSearchParams` obliga a un límite de Suspense para no bloquear el
 * prerender estático de esta ruta (ver docs de Next.js). El fallback nunca
 * se llega a ver en la práctica: en desarrollo no suspende, y en producción
 * la navegación desde el detalle de una elección siempre es client-side.
 */
export default function AdminHomePage() {
  return (
    <Suspense fallback={null}>
      <AdminHomeContent />
    </Suspense>
  );
}

function AdminHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const logout = useLogout();
  const query = useElecciones();
  const seccionInicial = searchParams.get("seccion");
  const [activeSeccion, setActiveSeccion] = useState<Seccion>(
    esSeccion(seccionInicial) ? seccionInicial : "creada",
  );

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
    <AdminShell
      activeSeccion={activeSeccion}
      onSelectSeccion={setActiveSeccion}
      onLogout={logout}
    >
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
    </AdminShell>
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
