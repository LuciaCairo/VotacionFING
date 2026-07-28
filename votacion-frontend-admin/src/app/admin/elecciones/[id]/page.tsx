"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EliminarEleccionDialog } from "@/components/admin/eleccion/eliminar-eleccion-dialog";
import { EstadoEleccionCard } from "@/components/admin/eleccion/estado-eleccion-card";
import { FechaCard } from "@/components/admin/eleccion/fecha-card";
import { ListaRow } from "@/components/admin/eleccion/lista-row";
import { VerIntegridadButton } from "@/components/admin/eleccion/ver-integridad-button";
import { useEleccionDetalle } from "@/hooks/use-eleccion-detalle";
import { rutaVerEleccion, type EleccionDetalleDTO } from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";

export default function EleccionDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isFinite(id);

  const query = useEleccionDetalle(id);
  const sesionExpirada =
    query.error instanceof ApiError && query.error.status === 401;
  const esFinalizada = query.isSuccess && query.data.estado === "finalizada";

  // Sesión expirada en cualquier request de esta pantalla: limpiamos el JWT
  // local y mandamos a /login (mismo patrón que el Home, ver app/admin/page.tsx).
  useEffect(() => {
    if (sesionExpirada) {
      clearAdminSession();
      router.replace("/login");
    }
  }, [sesionExpirada, router]);

  // Esta pantalla es solo para creada/publicada — el Home ya linkea
  // finalizadas a /resultados, pero se puede llegar acá con una URL escrita a
  // mano. En vez de un placeholder muerto, redirigimos a donde sí existe la
  // vista para ese estado.
  useEffect(() => {
    if (esFinalizada) {
      router.replace(rutaVerEleccion("finalizada", query.data!.id));
    }
  }, [esFinalizada, query.data, router]);

  // Panel blanco-azulado sobre un fondo más oscuro: en pantallas grandes el
  // contenido (max-w-[920px]) necesita un límite visual propio, si no queda
  // flotando en el centro de un fondo del mismo color a los costados.
  //
  // A partir de `lg` (mismo breakpoint en el que el grid de abajo pasa a 2
  // columnas) la página entra completa en el viewport sin scroll propio:
  // header, fechas y la card de estado nunca se achican (shrink-0), solo el
  // listado de listas participantes tiene overflow-y-auto. Por debajo de
  // `lg` el grid ya se apila en una sola columna, así que dejamos que la
  // página escrolee normal en vez de forzar una altura fija.
  return (
    <div className="min-h-screen w-full bg-[#d7dde3] p-4 md:p-10 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto max-w-[920px] rounded-[20px] bg-[#eef1f5] p-6 shadow-[0_20px_50px_rgba(10,37,64,0.14)] md:p-11 lg:flex lg:h-full lg:flex-col">
        <div className="mb-7 flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.push(rutaVolverAlPanel(query.data?.estado))}
              aria-label="Volver al panel de elecciones"
              className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[#0a2540] transition-colors hover:bg-black/[0.05]"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>

            {query.isSuccess ? (
              <h1 className="text-2xl font-extrabold text-[#0a2540]">
                {query.data.nombre}
              </h1>
            ) : query.isError && !sesionExpirada ? (
              <h1 className="text-2xl font-extrabold text-[#0a2540]">
                No se pudo cargar la elección
              </h1>
            ) : (
              <div
                aria-hidden="true"
                className="h-7 w-64 animate-pulse rounded bg-white/70"
              />
            )}
          </div>

          {query.isSuccess && (
            <div className="flex shrink-0 items-center gap-2.5">
              <VerIntegridadButton eleccionId={query.data.id} />
              {query.data.estado === "creada" && (
                <EliminarEleccionDialog
                  eleccionId={query.data.id}
                  nombreEleccion={query.data.nombre}
                />
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {!idValido ? (
            <ErrorState mensaje="El id de la elección no es válido." />
          ) : query.isError && !sesionExpirada ? (
            <ErrorState
              mensaje={query.error.message}
              onRetry={() => query.refetch()}
            />
          ) : query.isPending || sesionExpirada || esFinalizada ? (
            <DetalleSkeleton />
          ) : query.isSuccess ? (
            <EleccionDetalleLayout eleccion={query.data} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EleccionDetalleLayout({ eleccion }: { eleccion: EleccionDetalleDTO }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-7 grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <FechaCard label="Fecha de Inicio" iso={eleccion.fecha_inicio} />
        <FechaCard label="Fecha de Cierre" iso={eleccion.fecha_cierre} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex h-full min-h-0 flex-col">
          <h2 className="mb-3 shrink-0 text-[12.5px] font-bold tracking-[0.4px] text-[#5b6b7c]">
            LISTAS PARTICIPANTES
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto pr-4">
            <div className="flex flex-col gap-1.5">
              {eleccion.listas.map((lista) => (
                <ListaRow key={lista.id} lista={lista} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col">
          {/* Espaciador invisible del mismo alto que el título "LISTAS
              PARTICIPANTES": alinea el top de esta card con el top de la
              primera lista, no con el título de la columna izquierda. */}
          <div
            aria-hidden="true"
            className="invisible mb-3 shrink-0 text-[12.5px] font-bold tracking-[0.4px]"
          >
            LISTAS PARTICIPANTES
          </div>
          <EstadoEleccionCard eleccion={eleccion} />
        </div>
      </div>
    </div>
  );
}

/** Ruta al Home, en la sección correspondiente al estado de la elección. */
function rutaVolverAlPanel(estado?: EleccionDetalleDTO["estado"]): string {
  return estado ? `/admin?seccion=${estado}` : "/admin";
}

function DetalleSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-[74px] rounded-xl bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
        <div className="h-[74px] rounded-xl bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <div className="h-[58px] rounded-[10px] bg-white/70" />
          <div className="h-[58px] rounded-[10px] bg-white/70" />
          <div className="h-[58px] rounded-[10px] bg-white/70" />
        </div>
        <div className="h-[220px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
      </div>
    </div>
  );
}

function ErrorState({
  mensaje,
  onRetry,
}: {
  mensaje: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#f6c6c6] bg-[#fdecec] p-6 text-center">
      <p className="text-[13.5px] font-semibold text-[#9c2b2b]">
        No pudimos cargar la elección.
      </p>
      <p className="mt-1 text-[13px] text-[#a83d3d]">{mensaje}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-[8px] border border-[#d64545]/30 bg-white px-4 py-2 text-[13px] font-bold text-[#9c2b2b] transition-colors hover:bg-[#fdecec]"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
