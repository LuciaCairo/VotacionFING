"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Copy,
  TriangleAlert,
  X,
} from "lucide-react";
import { useIntegridadEleccion } from "@/hooks/use-integridad-eleccion";
import type {
  IntegridadCheckDTO,
  IntegridadEleccionDTO,
  IntegridadSeccionDTO,
  IntegridadSeccionesDTO,
} from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";
import { formatFechaHora } from "@/lib/format";
import {
  ESTADO_SECCION_META,
  GLOBAL_BANNER_META,
  SECCION_ORDEN,
  SECCION_TITULOS,
  bannerVerificadaParcial,
  formatCampoIntegridad,
  formatValorIntegridad,
  seccionesNoAplica,
} from "@/lib/integridad";

export default function IntegridadEleccionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isFinite(id);

  const query = useIntegridadEleccion(id);
  const sesionExpirada =
    query.error instanceof ApiError && query.error.status === 401;

  // Mismo patrón que el resto de las pantallas de elección (ver
  // app/admin/elecciones/[id]/page.tsx): 401 limpia el JWT local y manda a /login.
  useEffect(() => {
    if (sesionExpirada) {
      clearAdminSession();
      router.replace("/login");
    }
  }, [sesionExpirada, router]);

  return (
    <div className="min-h-screen w-full bg-[#d7dde3] p-4 md:p-10">
      <div className="mx-auto max-w-[900px] rounded-[20px] bg-[#eef1f5] p-5 shadow-[0_20px_50px_rgba(10,37,64,0.14)] md:px-12 md:py-11">
        <div className="mb-1.5 flex items-center gap-3.5">
          <button
            type="button"
            // Volvemos con router.back() en vez de una ruta fija: esta
            // pantalla se llega desde 3 orígenes distintos (detalle creada,
            // detalle publicada, resultados finalizada) y queremos volver
            // exactamente a esa pantalla, no siempre al Home.
            onClick={() => router.back()}
            aria-label="Volver"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[#0a2540] transition-colors hover:bg-black/[0.05]"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-extrabold text-[#0a2540]">
            Integridad de la Elección
          </h1>
        </div>

        {!idValido ? (
          <ErrorState mensaje="El id de la elección no es válido." />
        ) : query.isPending || sesionExpirada ? (
          <IntegridadSkeleton />
        ) : query.isError ? (
          <ErrorState
            mensaje={query.error.message}
            onRetry={() => query.refetch()}
          />
        ) : (
          <IntegridadContenido data={query.data} />
        )}
      </div>
    </div>
  );
}

function IntegridadContenido({ data }: { data: IntegridadEleccionDTO }) {
  // Solo las secciones con discrepancias/advertencias arrancan expandidas
  // (son las que hay algo para revisar); "verificada" y "no_aplica" arrancan
  // colapsadas. `overrides` solo guarda lo que el admin tocó a mano.
  const [overrides, setOverrides] = useState<
    Partial<Record<keyof IntegridadSeccionesDTO, boolean>>
  >({});

  function isExpanded(
    key: keyof IntegridadSeccionesDTO,
    estado: IntegridadSeccionDTO["estado"],
  ): boolean {
    return (
      overrides[key] ??
      (estado === "discrepancias" || estado === "con_advertencias")
    );
  }

  function toggle(
    key: keyof IntegridadSeccionesDTO,
    estado: IntegridadSeccionDTO["estado"],
  ) {
    setOverrides((prev) => ({ ...prev, [key]: !isExpanded(key, estado) }));
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="ml-[52px] text-[13px] text-[#5b6b7c]">
        Verificado el {formatFechaHora(data.verificado_at)} · Elección #
        {data.eleccion_id}
      </div>

      <IntegridadBanner
        estado={data.integridad_global}
        noAplica={seccionesNoAplica(data.secciones)}
      />

      <div className="flex flex-col gap-4">
        {SECCION_ORDEN.map((key) => {
          const seccion = data.secciones[key];
          return (
            <SeccionCard
              key={key}
              seccionKey={key}
              titulo={SECCION_TITULOS[key]}
              seccion={seccion}
              expanded={isExpanded(key, seccion.estado)}
              onToggle={() => toggle(key, seccion.estado)}
            />
          );
        })}
      </div>
    </div>
  );
}

function IntegridadBanner({
  estado,
  noAplica,
}: {
  estado: IntegridadEleccionDTO["integridad_global"];
  /** Títulos de las secciones en "no_aplica" (ver seccionesNoAplica). */
  noAplica: string[];
}) {
  // Con secciones sin comparar (ej. elección activa), "verificada" no puede
  // decir que coinciden *todos* los datos: solo lo comparado hasta ahora.
  const meta =
    estado === "verificada" && noAplica.length > 0
      ? { ...GLOBAL_BANNER_META.verificada, ...bannerVerificadaParcial(noAplica) }
      : GLOBAL_BANNER_META[estado];
  const Icono =
    estado === "verificada"
      ? CircleCheck
      : estado === "discrepancias"
        ? CircleAlert
        : TriangleAlert;

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-[14px] border px-5 py-4 sm:px-6 sm:py-5"
      style={{ backgroundColor: meta.bg, borderColor: meta.border }}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: meta.iconBg }}
      >
        <Icono
          className="size-[22px]"
          style={{ color: meta.textColor }}
          strokeWidth={2.3}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-base font-extrabold"
          style={{ color: meta.titleColor }}
        >
          {meta.titulo}
        </div>
        <div
          className="mt-0.5 text-[13.5px] leading-[1.4]"
          style={{ color: meta.textColor }}
        >
          {meta.texto}
        </div>
      </div>
      {/* Solo con "verificada": con discrepancias o advertencias el chip
          afirmaría justo lo contrario de lo que dice el banner. */}
      {estado === "verificada" && (
        <div
          className="shrink-0 whitespace-nowrap rounded-[6px] px-2.5 py-1 font-mono text-[11px]"
          style={{ backgroundColor: "rgba(255,255,255,0.5)", color: meta.textColor }}
        >
          Blockchain verificada
        </div>
      )}
    </div>
  );
}

function SeccionCard({
  seccionKey,
  titulo,
  seccion,
  expanded,
  onToggle,
}: {
  seccionKey: string;
  titulo: string;
  seccion: IntegridadSeccionDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = ESTADO_SECCION_META[seccion.estado];
  const noAplica = seccion.estado === "no_aplica";
  const failCount = seccion.checks.filter((chk) => !chk.ok).length;
  const panelId = `integridad-seccion-${seccionKey}`;

  let resumen = "";
  if (seccion.estado === "discrepancias") {
    resumen = `${failCount} discrepancia${failCount === 1 ? "" : "s"}`;
  } else if (seccion.estado === "con_advertencias") {
    resumen = `${failCount} advertencia${failCount === 1 ? "" : "s"}`;
  } else if (seccion.estado === "verificada") {
    resumen = `${seccion.checks.length} de ${seccion.checks.length} ok`;
  }

  return (
    <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-[18px] py-4 text-left sm:px-[22px]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[15px] font-extrabold text-[#0a2540]">
            {titulo}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-extrabold tracking-[0.3px]"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: meta.color }}
              aria-hidden="true"
            />
            {meta.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3.5">
          {resumen && (
            <span className="hidden text-[12.5px] font-semibold text-[#9aa7b3] sm:inline">
              {resumen}
            </span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-[#5b6b7c] transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-[#eef1f5]">
          {noAplica ? (
            <p className="px-[22px] py-6 text-center text-[13.5px] text-[#9aa7b3]">
              No aplica para el estado actual de esta elección.
            </p>
          ) : (
            seccion.checks.map((chk) => (
              <ChequeoRow
                key={chk.campo}
                chk={chk}
                resultado={resultadoDeCheck(chk, seccion.estado)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Texto exacto de admin.service.ts (construirSeccionEleccion) para el check de dirección del contrato. */
const CAMPO_CONTRATO = "Contrato desplegado (código presente en la address)";

type ResultadoCheck = "ok" | "advertencia" | "discrepancia";

/**
 * Un check interno (estado vs. fechas, reservas sin confirmar) no compara
 * contra BFA: si falla en una sección con advertencias, es una advertencia,
 * no una discrepancia con la blockchain.
 */
function resultadoDeCheck(
  chk: IntegridadCheckDTO,
  estadoSeccion: IntegridadSeccionDTO["estado"],
): ResultadoCheck {
  if (chk.ok) return "ok";
  return chk.interno && estadoSeccion === "con_advertencias"
    ? "advertencia"
    : "discrepancia";
}

const RESULTADO_LABEL: Record<ResultadoCheck, string> = {
  ok: "Verificado",
  advertencia: "Advertencia",
  discrepancia: "Discrepancia",
};

/** Fondo y texto de la celda del valor según el resultado (mismos colores que ESTADO_SECCION_META). */
const CELDA_RESULTADO: Record<ResultadoCheck, string> = {
  ok: "bg-[#f4f6f8] text-[#0a2540]",
  advertencia: "bg-[#fff4e5] text-[#c9821a]",
  discrepancia: "bg-[#fdecec] text-[#c23b3b]",
};

function IconoResultado({ resultado }: { resultado: ResultadoCheck }) {
  return (
    <div className="flex justify-center">
      {resultado === "ok" ? (
        <Check className="size-4 text-[#1e9e5c]" aria-hidden="true" />
      ) : resultado === "advertencia" ? (
        <TriangleAlert className="size-4 text-[#c9821a]" aria-hidden="true" />
      ) : (
        <X className="size-4 text-[#c23b3b]" aria-hidden="true" />
      )}
      <span className="sr-only">{RESULTADO_LABEL[resultado]}</span>
    </div>
  );
}

function ChequeoRow({
  chk,
  resultado,
}: {
  chk: IntegridadCheckDTO;
  resultado: ResultadoCheck;
}) {
  const esContrato = chk.campo === CAMPO_CONTRATO;
  // El check de consistencia interna (estado vs. fechas) nunca manda bfa
  // (no compara contra la blockchain, ver IntegridadCheck.interno en el
  // backend): mostrarle una columna BFA vacía no aporta nada, así que le
  // damos todo el ancho al valor de BD en vez de dejar una celda muerta.
  const sinColumnaBfa = chk.interno === true && chk.bfa === undefined;

  if (esContrato || sinColumnaBfa) {
    return (
      <div className="grid grid-cols-[1.4fr_2fr_24px] items-center gap-2.5 border-b border-[#f3f5f7] px-[18px] py-3 last:border-b-0 sm:gap-3.5 sm:px-[22px] sm:py-3.5">
        <div className="text-[13px] leading-[1.35] font-semibold text-[#33475b]">
          {formatCampoIntegridad(chk.campo)}
        </div>
        {esContrato ? (
          <CeldaContrato valor={chk.bd} ok={chk.ok} />
        ) : (
          <div
            className={`truncate rounded-[6px] px-2.5 py-1.5 font-mono text-[12px] ${CELDA_RESULTADO[resultado]}`}
            title={formatValorIntegridad(chk.bd)}
          >
            {formatValorIntegridad(chk.bd)}
          </div>
        )}
        <IconoResultado resultado={resultado} />
      </div>
    );
  }

  const bd = formatValorIntegridad(chk.bd);
  const bfa = formatValorIntegridad(chk.bfa);

  return (
    <div className="grid grid-cols-[1.5fr_1fr_1fr_24px] items-center gap-2.5 border-b border-[#f3f5f7] px-[18px] py-3 last:border-b-0 sm:gap-3.5 sm:px-[22px] sm:py-3.5">
      <div className="text-[13px] leading-[1.35] font-semibold text-[#33475b]">
        {formatCampoIntegridad(chk.campo)}
      </div>
      <div
        className="truncate rounded-[6px] bg-[#f4f6f8] px-2.5 py-1.5 font-mono text-[12px] text-[#0a2540]"
        title={bd}
      >
        {bd}
      </div>
      <div
        className={`truncate rounded-[6px] px-2.5 py-1.5 font-mono text-[12px] ${CELDA_RESULTADO[resultado]}`}
        title={bfa}
      >
        {bfa}
      </div>
      <IconoResultado resultado={resultado} />
    </div>
  );
}

/**
 * Celda del check "Contrato desplegado": solo la address (sin repetir
 * "código presente"/"sin código", ya lo comunica el ícono de la fila) y
 * copiable con un click — es el único valor de esta pantalla que un admin
 * realmente necesita pegar en otro lado (ej. el explorador de BFA).
 */
function CeldaContrato({
  valor,
  ok,
}: {
  valor: string | number | boolean | null | undefined;
  ok: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = valor === null || valor === undefined ? null : String(valor);
  const colorClases = ok
    ? "bg-[#f4f6f8] text-[#0a2540] hover:bg-[#e9edf1]"
    : "bg-[#fdecec] text-[#c23b3b] hover:bg-[#fbdada]";

  if (!texto) {
    return (
      <div className={`truncate rounded-[6px] px-2.5 py-1.5 font-mono text-[12px] ${colorClases}`}>
        —
      </div>
    );
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto as string);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles: no rompemos la fila por esto.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? "Copiado" : texto}
      className={`flex min-w-0 items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-left font-mono text-[12px] transition-colors ${colorClases}`}
    >
      <span className="truncate">{texto}</span>
      {copiado ? (
        <Check className="size-3.5 shrink-0 text-[#1e9e5c]" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
      )}
    </button>
  );
}

function IntegridadSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mb-3.5 ml-[52px] h-4 w-64 rounded bg-white/70" />
      <div className="mb-4 h-[92px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
      <div className="flex flex-col gap-4">
        <div className="h-[58px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
        <div className="h-[58px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
        <div className="h-[58px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
        <div className="h-[58px] rounded-[14px] bg-white shadow-[0_4px_14px_rgba(10,37,64,0.06)]" />
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
        No pudimos verificar la integridad de la elección.
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
