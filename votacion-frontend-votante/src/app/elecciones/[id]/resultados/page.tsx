"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useResultadosEleccion } from "@/hooks/use-resultados-eleccion";
import type {
  ListaResultadoDTO,
  ResultadosEleccionDTO,
} from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearVotanteSession } from "@/lib/auth/session";
import { colorResultadoLista } from "@/lib/colors";
import { formatFechaHora } from "@/lib/format";
import { VerificacionBlockchain } from "@/components/votante/verificacion-blockchain";

const RUTA_VOTANTE_FINALIZADAS = "/votante?seccion=finalizadas";

/**
 * Calco de la pantalla de Resultados del admin (ver
 * votacion-frontend-admin/src/app/admin/elecciones/[id]/resultados/page.tsx)
 * sin el botón "Ver Integridad" (acción de admin, no de votante) — mismo
 * layout, colores, tratamiento del voto en blanco como una lista más y
 * manejo de empate/ganador único. Consume el mismo endpoint compartido
 * GET /api/elecciones/:id/resultados.
 *
 * En lugar de la integridad completa del admin, al pie tiene la verificación
 * de los resultados contra BFA (VerificacionBlockchain): dirección del
 * contrato, comparación en vivo y cómo hacerla sin depender del sistema.
 */
export default function ResultadosEleccionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isFinite(id);

  const query = useResultadosEleccion(id);
  const sesionExpirada =
    query.error instanceof ApiError && query.error.status === 401;
  const noFinalizada =
    query.error instanceof ApiError && query.error.status === 409;

  useEffect(() => {
    if (sesionExpirada) {
      clearVotanteSession();
      router.replace("/login");
    }
  }, [sesionExpirada, router]);

  return (
    <div className="min-h-screen w-full bg-[#d7dde3] p-4 md:p-10 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto max-w-[920px] rounded-[20px] bg-[#eef1f5] p-5 shadow-[0_20px_50px_rgba(10,37,64,0.14)] md:p-6 lg:flex lg:h-full lg:flex-col">
        <div className="mb-1.5 flex shrink-0 items-start gap-3.5 sm:items-center">
          <button
            type="button"
            onClick={() => router.push(RUTA_VOTANTE_FINALIZADAS)}
            aria-label="Volver al listado de elecciones"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[#0a2540] transition-colors hover:bg-black/[0.05]"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="pt-[5px] text-lg font-extrabold text-[#0a2540] sm:pt-0 sm:text-2xl">
            Resultados de la Elección
          </h1>
        </div>

        <div className="min-h-0 flex-1 lg:flex lg:flex-col lg:overflow-y-auto">
          {!idValido ? (
            <ErrorState mensaje="El id de la elección no es válido." />
          ) : query.isPending || sesionExpirada ? (
            <ResultadosSkeleton />
          ) : query.isError && noFinalizada ? (
            <NoDisponibleBanner mensaje={query.error.message} />
          ) : query.isError ? (
            <ErrorState mensaje={query.error.message} onRetry={() => query.refetch()} />
          ) : (
            <ResultadosContenido resultados={query.data} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadosContenido({
  resultados,
}: {
  resultados: ResultadosEleccionDTO;
}) {
  const { resultado, participacion, total_votos } = resultados;
  const listaGanadora =
    resultado.tipo === "ganador_unico" ? resultado.lista_ganadora : undefined;
  const listasOrdenadas = [...resultados.listas].sort(
    (a, b) => b.votos - a.votos,
  );

  // min-h-full + flex-auto en la lista (no h-full + flex-1): si la
  // verificación de abajo se despliega y no entra todo, scrollea el
  // contenedor entero en vez de aplastar la lista de resultados.
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-2.5 shrink-0 text-[13px] text-[#5b6b7c] sm:ml-[52px]">
        {resultados.nombre} · Cierre el{" "}
        {formatFechaHora(resultados.fecha_cierre)}
      </div>

      <div className="mb-3 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {listaGanadora ? (
          <BannerGanador
            nombreLista={listaGanadora.nombre}
            votos={listaGanadora.votos}
            totalVotos={total_votos}
          />
        ) : (
          <BannerEmpate cantidad={resultado.listas_empatadas?.length ?? 0} />
        )}

        <ParticipacionCard participacion={participacion} />
      </div>

      <div className="flex flex-auto flex-col rounded-[14px] bg-white px-4 pt-4 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
        <div className="mb-2.5 shrink-0 text-[12.5px] font-bold tracking-[0.4px] text-[#5b6b7c]">
          RESULTADOS POR LISTA
        </div>
        <div className="flex-auto pb-1 pr-3">
          {listasOrdenadas.map((lista) => (
            <FilaLista
              key={lista.nombre}
              lista={lista}
              esGanadora={listaGanadora?.nombre === lista.nombre}
            />
          ))}
        </div>
      </div>

      <VerificacionBlockchain
        eleccionId={resultados.id}
        blockchain={resultados.blockchain}
        listas={resultados.listas}
      />
    </div>
  );
}

function ParticipacionCard({
  participacion,
}: {
  participacion: ResultadosEleccionDTO["participacion"];
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] bg-white p-3.5 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div className="text-[12.5px] font-bold tracking-[0.4px] text-[#5b6b7c]">
        PARTICIPACIÓN
      </div>
      <dl className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-[#5b6b7c]">Votos emitidos</dt>
          <dd className="text-[15px] font-extrabold text-[#0a2540]">
            {participacion.total_votos} / {participacion.total_padron}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-[#5b6b7c]">Porcentaje</dt>
          <dd className="text-[15px] font-extrabold text-[#0a2540]">
            {participacion.porcentaje}%
          </dd>
        </div>
      </dl>
    </div>
  );
}

function BannerGanador({
  nombreLista,
  votos,
  totalVotos,
}: {
  nombreLista: string;
  votos: number;
  totalVotos: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#c8ecd8] bg-[#e6f6ee] px-3.5 py-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d2f2e0]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 21h8M12 17v4M6 4h12v3a6 6 0 01-12 0V4z"
            stroke="#1e9e5c"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 5H3v1a4 4 0 004 4M18 5h3v1a4 4 0 01-4 4"
            stroke="#1e9e5c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-extrabold text-[#146b3b]">
          &quot;{nombreLista}&quot; ganó la elección
        </div>
        <div className="mt-0.5 text-[13.5px] leading-[1.4] text-[#1e9e5c]">
          Obtuvo {votos} de {totalVotos} votos emitidos.
        </div>
      </div>
    </div>
  );
}

function BannerEmpate({ cantidad }: { cantidad: number }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#cfe6f9] bg-[#e7f2fb] px-3.5 py-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d7ecfa]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 3v18M18 3v18M3 8h6M15 8h6M3 16h6M15 16h6"
            stroke="#1f8fe0"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-extrabold text-[#0d5591]">
          Elección empatada
        </div>
        <div className="mt-0.5 text-[13.5px] leading-[1.4] text-[#1f6fb0]">
          {cantidad} listas empataron con la misma cantidad de votos.
        </div>
      </div>
    </div>
  );
}

function FilaLista({
  lista,
  esGanadora,
}: {
  lista: ListaResultadoDTO;
  esGanadora: boolean;
}) {
  const color = colorResultadoLista({
    esBlanco: lista.es_blanco,
    color: lista.color,
    indice: lista.indice,
  });
  const anchoMinimo = lista.votos > 0 ? 4 : 2;
  const ancho = Math.max(lista.porcentaje, anchoMinimo);

  return (
    <div className="mb-2.5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="size-[9px] shrink-0 rounded-[3px]"
            style={{ backgroundColor: color }}
          />
          <div className="break-words text-sm font-bold text-[#0a2540]">
            {lista.nombre}
          </div>
          {esGanadora && (
            <div className="shrink-0 rounded-[10px] bg-[#e6f6ee] px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.3px] text-[#1e9e5c]">
              GANADORA
            </div>
          )}
        </div>
        <div className="shrink-0 whitespace-nowrap text-[13.5px] font-bold text-[#33475b]">
          {lista.votos} votos · {lista.porcentaje}%
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`${lista.nombre}: ${lista.votos} votos, ${lista.porcentaje}%`}
        aria-valuenow={lista.porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-[6px] bg-[#eef1f5]"
      >
        <div
          className="h-full rounded-[6px]"
          style={{ width: `${ancho}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function NoDisponibleBanner({ mensaje }: { mensaje: string }) {
  return (
    <div className="mt-4 flex max-w-[520px] items-start gap-3 rounded-xl border border-[#f6d9a8] bg-[#fff4e5] px-[18px] py-5 sm:ml-[52px] sm:px-[22px]">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-px shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="#c9821a" strokeWidth="1.8" />
        <path d="M12 7v6" stroke="#c9821a" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16.2" r="1" fill="#c9821a" />
      </svg>
      <div>
        <div className="text-[14.5px] font-bold text-[#8a5a10]">
          Resultados no disponibles
        </div>
        <div className="mt-1 text-[13.5px] leading-[1.45] text-[#9c6a1f]">
          {mensaje}
        </div>
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
    <div className="mt-4 rounded-xl border border-[#f6c6c6] bg-[#fdecec] p-6 text-center">
      <p className="text-[13.5px] font-semibold text-[#9c2b2b]">
        No pudimos cargar los resultados.
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

function ResultadosSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mb-4 h-4 w-64 rounded bg-white/70 sm:ml-[52px]" />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-[76px] rounded-[14px] bg-white/70" />
        <div className="h-[76px] rounded-[14px] bg-white/70" />
      </div>
      <div className="h-[200px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
    </div>
  );
}
