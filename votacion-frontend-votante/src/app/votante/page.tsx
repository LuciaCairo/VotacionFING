"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLogout } from "@/hooks/use-logout";
import { useEleccionesVigentes } from "@/hooks/use-elecciones-vigentes";
import { useEleccionesFinalizadas } from "@/hooks/use-elecciones-finalizadas";
import { VotanteShell } from "@/components/votante/votante-shell";
import {
  VOTANTE_SECCIONES,
  VOTANTE_SECCION_LABELS,
  type VotanteSeccion,
} from "@/components/votante/votante-sidebar";
import { EleccionVigenteCard } from "@/components/votante/eleccion-vigente-card";
import { EleccionFinalizadaCard } from "@/components/votante/eleccion-finalizada-card";
import { EmptyEleccionesState } from "@/components/votante/empty-state";
import { ApiError } from "@/lib/api/errors";
import { clearVotanteSession } from "@/lib/auth/session";

function esVotanteSeccion(valor: string | null): valor is VotanteSeccion {
  return VOTANTE_SECCIONES.includes(valor as VotanteSeccion);
}

/**
 * `useSearchParams` obliga a un límite de Suspense para no bloquear el
 * prerender estático de esta ruta (ver docs de Next.js) — mismo patrón que
 * `AdminHomePage` del panel de administración.
 */
export default function VotantePage() {
  return (
    <Suspense fallback={null}>
      <VotanteHomeContent />
    </Suspense>
  );
}

/**
 * Única página del área del votante. Las dos secciones no navegan de
 * verdad (ver [[votante-shell]]) — cambian `activeSeccion` en estado
 * local, igual que las 3 secciones del Home del admin.
 *
 * Ambas queries se disparan de entrada (no solo la de la sección activa):
 * así cambiar de tab es instantáneo, sin esperar un fetch nuevo, mismo
 * criterio que el admin (que resuelve sus 3 secciones con una sola query
 * ya cargada). Acá son dos porque el backend expone dos endpoints
 * separados, no uno agrupado.
 *
 * `seccionInicial` viene de `?seccion=`: la pantalla de Resultados vuelve
 * a `/votante?seccion=finalizadas` (ver [[app/elecciones/[id]/resultados]]),
 * mismo criterio que el botón "Volver" del admin.
 */
function VotanteHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const logout = useLogout();
  const seccionInicial = searchParams.get("seccion");
  const [activeSeccion, setActiveSeccion] = useState<VotanteSeccion>(
    esVotanteSeccion(seccionInicial) ? seccionInicial : "vigentes",
  );

  const vigentesQuery = useEleccionesVigentes();
  const finalizadasQuery = useEleccionesFinalizadas();
  const activeQuery = activeSeccion === "vigentes" ? vigentesQuery : finalizadasQuery;

  // Sesión expirada del lado del servidor (401): limpiamos el JWT local y
  // mandamos a /login en vez de mostrar un error genérico o una lista vacía.
  useEffect(() => {
    const error = vigentesQuery.error ?? finalizadasQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      clearVotanteSession();
      router.replace("/login");
    }
  }, [vigentesQuery.error, finalizadasQuery.error, router]);

  const sesionExpirada =
    (vigentesQuery.error instanceof ApiError && vigentesQuery.error.status === 401) ||
    (finalizadasQuery.error instanceof ApiError && finalizadasQuery.error.status === 401);

  return (
    <VotanteShell
      activeSeccion={activeSeccion}
      onSelectSeccion={setActiveSeccion}
      onLogout={logout}
    >
      <h1 className="mb-6 text-[22px] font-extrabold text-[#0a2540]">
        {VOTANTE_SECCION_LABELS[activeSeccion]}
      </h1>

      <div className="flex max-w-[960px] flex-col gap-3">
        {activeQuery.isPending && <EleccionesSkeleton />}

        {activeQuery.isError && !sesionExpirada && (
          <EleccionesErrorState onRetry={() => activeQuery.refetch()} />
        )}

        {activeSeccion === "vigentes" &&
          vigentesQuery.isSuccess &&
          (vigentesQuery.data.vigentes.length === 0 ? (
            <EmptyEleccionesState mensaje="No hay elecciones vigentes en este momento." />
          ) : (
            vigentesQuery.data.vigentes.map((eleccion) => (
              <EleccionVigenteCard key={eleccion.id} eleccion={eleccion} />
            ))
          ))}

        {activeSeccion === "finalizadas" &&
          finalizadasQuery.isSuccess &&
          (finalizadasQuery.data.finalizadas.length === 0 ? (
            <EmptyEleccionesState mensaje="No hay elecciones finalizadas todavía." />
          ) : (
            finalizadasQuery.data.finalizadas.map((eleccion) => (
              <EleccionFinalizadaCard key={eleccion.id} eleccion={eleccion} />
            ))
          ))}
      </div>
    </VotanteShell>
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
