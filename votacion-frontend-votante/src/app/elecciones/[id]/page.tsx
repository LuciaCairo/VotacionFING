"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, CircleCheckBig } from "lucide-react";
import { useDetalleEleccion } from "@/hooks/use-detalle-eleccion";
import { useComprobante } from "@/hooks/use-comprobante";
import { useVotar } from "@/hooks/use-votar";
import type { EleccionDetalleDTO, VotarResponse } from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearVotanteSession } from "@/lib/auth/session";
import { formatFechaHora } from "@/lib/format";
import { BoletaListaOption } from "@/components/votante/boleta-lista-option";
import { ConfirmarVotoDialog } from "@/components/votante/confirmar-voto-dialog";
import { ComprobanteHash } from "@/components/votante/comprobante-hash";

const RUTA_VOTANTE_HOME = "/votante";

/**
 * Detalle de una elección vigente: boleta + voto, o el comprobante si el
 * votante ya votó. Se llega acá desde una card del listado de "Elecciones
 * vigentes" (ver EleccionVigenteCard) — antes ese click era un placeholder.
 *
 * Mismo layout/contenedor que la pantalla de Resultados (ver
 * app/elecciones/[id]/resultados/page.tsx): caja centrada con header +
 * botón volver, mismos colores y patrón de manejo de sesión expirada.
 */
export default function DetalleEleccionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isFinite(id);

  const query = useDetalleEleccion(id);
  const sesionExpirada =
    query.error instanceof ApiError && query.error.status === 401;

  useEffect(() => {
    if (sesionExpirada) {
      clearVotanteSession();
      router.replace("/login");
    }
  }, [sesionExpirada, router]);

  return (
    <div className="min-h-screen w-full bg-[#d7dde3] p-4 md:p-10 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto max-w-[680px] rounded-[20px] bg-[#eef1f5] p-5 shadow-[0_20px_50px_rgba(10,37,64,0.14)] md:p-6 lg:flex lg:h-full lg:flex-col">
        <div className="mb-1.5 flex shrink-0 items-start gap-3.5 sm:items-center">
          <button
            type="button"
            onClick={() => router.push(RUTA_VOTANTE_HOME)}
            aria-label="Volver al listado de elecciones"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[#0a2540] transition-colors hover:bg-black/[0.05]"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="pt-[5px] text-lg font-extrabold text-[#0a2540] sm:pt-0 sm:text-2xl">
            {query.data?.nombre ?? "Elección"}
          </h1>
        </div>

        <div className="min-h-0 flex-1 lg:flex lg:flex-col lg:overflow-y-auto">
          {!idValido ? (
            <ErrorState mensaje="El id de la elección no es válido." />
          ) : query.isPending || sesionExpirada ? (
            <DetalleSkeleton />
          ) : query.isError ? (
            <ErrorState
              mensaje={query.error.message}
              onRetry={() => query.refetch()}
            />
          ) : query.data.ya_voto ? (
            <YaVotoView eleccion={query.data} />
          ) : query.data.estado === "finalizada" ? (
            <EleccionFinalizadaView eleccion={query.data} />
          ) : (
            <BoletaFlow eleccion={query.data} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Camino A: todavía no votó (boleta + voto) ────────────────

function BoletaFlow({ eleccion }: { eleccion: EleccionDetalleDTO }) {
  const router = useRouter();
  const [seleccionIndice, setSeleccionIndice] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const votar = useVotar(eleccion.id);

  const listasOrdenadas = [...eleccion.listas].sort(
    (a, b) => a.indice - b.indice,
  );
  const listaSeleccionada =
    listasOrdenadas.find((l) => l.indice === seleccionIndice) ?? null;

  if (votar.isSuccess) {
    return <VotoExitosoView eleccion={eleccion} respuesta={votar.data} />;
  }

  if (votar.isError) {
    return (
      <VotoErrorView
        mensaje={votar.error.message}
        onVolver={() => {
          setDialogOpen(false);
          votar.reset();
        }}
        onSoporte={() => router.push("/soporte")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#5b6b7c]">
        Elegí una opción de la boleta y confirmá tu voto. Una vez emitido no
        se puede modificar.
      </p>

      <div
        role="radiogroup"
        aria-label="Opciones de la boleta"
        className="flex flex-col gap-2.5"
      >
        {listasOrdenadas.map((lista) => (
          <BoletaListaOption
            key={lista.id}
            lista={lista}
            seleccionada={lista.indice === seleccionIndice}
            onSelect={() => setSeleccionIndice(lista.indice)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={seleccionIndice === null}
        onClick={() => setDialogOpen(true)}
        className="mt-1 w-full rounded-full bg-[#1f8fe0] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#1a7cc4] disabled:cursor-not-allowed disabled:bg-[#b7c3cd]"
      >
        Votar
      </button>

      <ConfirmarVotoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nombreEleccion={eleccion.nombre}
        etiquetaOpcion={
          listaSeleccionada
            ? listaSeleccionada.es_blanco
              ? "Voto en blanco"
              : listaSeleccionada.nombre
            : ""
        }
        isSubmitting={votar.isPending}
        onConfirm={() => {
          if (seleccionIndice === null) return;
          votar.mutate({ indiceLista: seleccionIndice });
        }}
      />
    </div>
  );
}

function VotoExitosoView({
  eleccion,
  respuesta,
}: {
  eleccion: EleccionDetalleDTO;
  respuesta: VotarResponse;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#e6f6ee]">
        <CircleCheckBig
          className="size-7 text-[#1e9e5c]"
          aria-hidden="true"
        />
      </div>
      <div>
        <div className="text-lg font-extrabold text-[#0a2540]">
          ¡Tu voto fue registrado!
        </div>
        <div className="mt-1 text-[13.5px] text-[#5b6b7c]">
          Guardá tu comprobante para poder verificarlo más adelante.
        </div>
      </div>

      <div className="w-full max-w-[420px]">
        <ComprobanteHash hash={respuesta.tx_hash} />
      </div>

      <div className="text-[13px] text-[#5b6b7c]">
        Los resultados van a estar disponibles a partir del{" "}
        <strong className="text-[#0a2540]">
          {formatFechaHora(eleccion.fecha_cierre)}
        </strong>
        .
      </div>

      <button
        type="button"
        onClick={() => router.push(RUTA_VOTANTE_HOME)}
        className="mt-2 rounded-full bg-[#1f8fe0] px-6 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
      >
        Volver al inicio
      </button>
    </div>
  );
}

function VotoErrorView({
  mensaje,
  onVolver,
  onSoporte,
}: {
  mensaje: string;
  onVolver: () => void;
  onSoporte: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#fdecec]">
        <AlertTriangle className="size-7 text-[#c0392b]" aria-hidden="true" />
      </div>
      <div>
        <div className="text-lg font-extrabold text-[#0a2540]">
          No pudimos registrar tu voto
        </div>
        <div className="mt-1 max-w-[380px] text-[13.5px] leading-[1.45] text-[#5b6b7c]">
          {mensaje}
        </div>
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-full border border-[#d7dde3] bg-white px-5 py-2.5 text-[13.5px] font-bold text-[#33475b] transition-colors hover:bg-[#eef1f5]"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onSoporte}
          className="rounded-full bg-[#1f8fe0] px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
        >
          Soporte
        </button>
      </div>
    </div>
  );
}

// ─── Camino C: la elección ya cerró y el votante no llegó a votar ────

function EleccionFinalizadaView({ eleccion }: { eleccion: EleccionDetalleDTO }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#fff4e5]">
        <AlertTriangle className="size-7 text-[#c9821a]" aria-hidden="true" />
      </div>
      <div>
        <div className="text-lg font-extrabold text-[#0a2540]">
          Esta elección ya finalizó
        </div>
        <div className="mt-1 max-w-[380px] text-[13.5px] leading-[1.45] text-[#5b6b7c]">
          Cerró el{" "}
          <strong className="text-[#0a2540]">
            {formatFechaHora(eleccion.fecha_cierre)}
          </strong>{" "}
          y ya no se pueden emitir votos.
        </div>
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => router.push(RUTA_VOTANTE_HOME)}
          className="rounded-full border border-[#d7dde3] bg-white px-5 py-2.5 text-[13.5px] font-bold text-[#33475b] transition-colors hover:bg-[#eef1f5]"
        >
          Volver al inicio
        </button>
        <button
          type="button"
          onClick={() => router.push(`/elecciones/${eleccion.id}/resultados`)}
          className="rounded-full bg-[#1f8fe0] px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
        >
          Ver resultados
        </button>
      </div>
    </div>
  );
}

// ─── Camino B: ya votó (solo comprobante, nunca la lista elegida) ─────

function YaVotoView({ eleccion }: { eleccion: EleccionDetalleDTO }) {
  const router = useRouter();
  const comprobante = useComprobante(eleccion.id, true);

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#e6f6ee]">
        <CircleCheckBig
          className="size-7 text-[#1e9e5c]"
          aria-hidden="true"
        />
      </div>
      <div>
        <div className="text-lg font-extrabold text-[#0a2540]">
          Ya emitiste tu voto en esta elección
        </div>
        <div className="mt-1 max-w-[380px] text-[13.5px] text-[#5b6b7c]">
          Por el anonimato del voto, no mostramos qué opción elegiste — solo
          que tu participación quedó registrada.
        </div>
      </div>

      {comprobante.isPending ? (
        <div
          aria-hidden="true"
          className="h-[92px] w-full max-w-[420px] animate-pulse rounded-[12px] bg-white/70"
        />
      ) : comprobante.isError ? (
        <ErrorState
          mensaje={comprobante.error.message}
          onRetry={() => comprobante.refetch()}
        />
      ) : (
        <>
          <div className="w-full max-w-[420px]">
            <ComprobanteHash hash={comprobante.data.hash} />
          </div>
          <div className="text-[13px] text-[#5b6b7c]">
            Votaste el{" "}
            <strong className="text-[#0a2540]">
              {formatFechaHora(comprobante.data.fecha_voto)}
            </strong>
            .
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => router.push(RUTA_VOTANTE_HOME)}
        className="mt-2 rounded-full bg-[#1f8fe0] px-6 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
      >
        Volver al inicio
      </button>
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
    <div className="mt-4 rounded-xl border border-[#f6c6c6] bg-[#fdecec] p-6 text-center">
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

function DetalleSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-2.5">
      <div className="h-4 w-72 rounded bg-white/70" />
      <div className="h-[54px] rounded-[10px] bg-white/70" />
      <div className="h-[54px] rounded-[10px] bg-white/70" />
      <div className="h-[54px] rounded-[10px] bg-white/70" />
    </div>
  );
}
