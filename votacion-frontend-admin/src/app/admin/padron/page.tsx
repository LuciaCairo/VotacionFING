"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDescargarPadron } from "@/hooks/use-descargar-padron";
import { useLogout } from "@/hooks/use-logout";
import { usePadron } from "@/hooks/use-padron";
import type { Seccion } from "@/lib/api/elecciones";
import type { VotantePadronDTO } from "@/lib/api/padron";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";

/**
 * El backend no pagina /api/admin/padron (devuelve el padrón entero
 * filtrado). Paginamos acá para no renderizar de una un padrón de varios
 * miles de filas — ver contexto del pedido. Si el padrón real es chico,
 * esto no se nota (el paginador ni aparece, ver más abajo).
 */
const TAMANO_PAGINA = 50;
const DEBOUNCE_MS = 350;

/** Referencia estable para cuando todavía no hay data: evita recrear el array en cada render. */
const SIN_VOTANTES: VotantePadronDTO[] = [];

export default function PadronPage() {
  const router = useRouter();
  const logout = useLogout();
  const [inputBusqueda, setInputBusqueda] = useState("");
  const busqueda = useDebouncedValue(inputBusqueda.trim(), DEBOUNCE_MS);
  const [pagina, setPagina] = useState(1);

  const query = usePadron(busqueda);
  const descarga = useDescargarPadron();

  const sesionExpirada =
    (query.error instanceof ApiError && query.error.status === 401) ||
    (descarga.error instanceof ApiError && descarga.error.status === 401);

  // Mismo patrón que el resto de las pantallas del admin (ver app/admin/page.tsx):
  // 401 en cualquier request de esta pantalla limpia el JWT local y manda a /login.
  useEffect(() => {
    if (sesionExpirada) {
      clearAdminSession();
      router.replace("/login");
    }
  }, [sesionExpirada, router]);

  // Nueva búsqueda: siempre volvemos a la primera página de resultados. Se
  // ajusta durante el render (no en un efecto) para evitar el render extra
  // que dispararía un setState dentro de un useEffect.
  const [busquedaAnterior, setBusquedaAnterior] = useState(busqueda);
  if (busqueda !== busquedaAnterior) {
    setBusquedaAnterior(busqueda);
    setPagina(1);
  }

  const votantes = query.data?.votantes ?? SIN_VOTANTES;
  const total = query.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(votantes.length / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const votantesPagina = useMemo(
    () =>
      votantes.slice(
        (paginaSegura - 1) * TAMANO_PAGINA,
        paginaSegura * TAMANO_PAGINA,
      ),
    [votantes, paginaSegura],
  );

  // Clickear una sección del sidebar desde acá navega al Home con esa
  // sección: a diferencia del Home, esta pantalla no tiene tabs propias
  // para las 3 secciones de elecciones.
  function irASeccion(seccion: Seccion) {
    router.push(`/admin?seccion=${seccion}`);
  }

  return (
    <AdminShell
      activeSeccion={null}
      onSelectSeccion={irASeccion}
      onLogout={logout}
      mobileTitle="Padrón Electoral"
    >
      <div className="mx-auto w-full max-w-[1080px]">
        <h1 className="mb-2 text-2xl font-extrabold text-[#0a2540]">
          Padrón Electoral
        </h1>
        <p className="mb-[26px] text-[13px] text-[#5b6b7c]">
          {query.isSuccess
            ? `${total} votante${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}`
            : " "}
        </p>

        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <BuscadorPadron value={inputBusqueda} onChange={setInputBusqueda} />
          <BotonDescargar
            loading={descarga.isPending}
            onDownload={() => descarga.mutate()}
          />
        </div>

        {descarga.isError && !sesionExpirada && (
          <p
            role="alert"
            className="mb-3 text-[13px] font-semibold text-[#9c2b2b]"
          >
            No pudimos descargar el padrón: {descarga.error.message}
          </p>
        )}

        <TablaPadron
          votantes={votantesPagina}
          busqueda={busqueda}
          isPending={query.isPending || sesionExpirada}
          isFetching={query.isFetching}
          isError={query.isError && !sesionExpirada}
          errorMessage={query.error?.message}
          onRetry={() => query.refetch()}
        />

        {query.isSuccess && votantes.length > TAMANO_PAGINA && (
          <Paginador
            pagina={paginaSegura}
            totalPaginas={totalPaginas}
            onCambiar={setPagina}
          />
        )}
      </div>
    </AdminShell>
  );
}

function BuscadorPadron({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-[320px] items-center gap-2 rounded-[8px] border border-[#d7dde3] bg-white px-3 py-[9px]">
      <Search className="size-[15px] shrink-0 text-[#5b6b7c]" aria-hidden="true" />
      <label htmlFor="padron-busqueda" className="sr-only">
        Buscar por nombre o legajo
      </label>
      <input
        id="padron-busqueda"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por nombre o legajo"
        className="w-full border-none bg-transparent text-[13px] text-[#33475b] outline-none placeholder:text-[#9aa7b3]"
      />
    </div>
  );
}

function BotonDescargar({
  loading,
  onDownload,
}: {
  loading: boolean;
  onDownload: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-[8px] bg-[#1f8fe0] px-[18px] py-[9px] text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(31,143,224,0.3)] transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Descargando…" : "Descargar"}
      <Download className="size-[13px]" aria-hidden="true" />
    </button>
  );
}

function TablaPadron({
  votantes,
  busqueda,
  isPending,
  isFetching,
  isError,
  errorMessage,
  onRetry,
}: {
  votantes: VotantePadronDTO[];
  busqueda: string;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}) {
  const mostrarActualizando = isFetching && !isPending;

  return (
    <div className="overflow-hidden rounded-[14px] shadow-[0_4px_14px_rgba(10,37,64,0.1)]">
      {/* Scroll horizontal propio: el wrapper de arriba necesita
          overflow-hidden para los bordes redondeados, así que si no
          separamos el scroll acá el contenido angosto (ej. el correo) se
          recorta en vez de poder verse en pantallas chicas. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse">
          <caption className="sr-only">Padrón electoral</caption>
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <thead>
            <tr className="bg-[#0a2540]">
              <th
                scope="col"
                className="px-[22px] py-3.5 text-left text-[12.5px] font-extrabold tracking-[0.4px] text-white"
              >
                NOMBRE
              </th>
              <th
                scope="col"
                className="px-[22px] py-3.5 text-left text-[12.5px] font-extrabold tracking-[0.4px] text-white"
              >
                LEGAJO
              </th>
              <th
                scope="col"
                className="px-[22px] py-3.5 text-left text-[12.5px] font-extrabold tracking-[0.4px] text-white"
              >
                CARRERA
              </th>
              <th
                scope="col"
                className="px-[22px] py-3.5 text-left text-[12.5px] font-extrabold tracking-[0.4px] text-white"
              >
                CORREO
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isPending ? (
              <FilasEsqueleto />
            ) : isError ? (
              <tr>
                <td colSpan={4} className="p-0">
                  <EstadoError
                    mensaje={errorMessage ?? "Ocurrió un error inesperado."}
                    onRetry={onRetry}
                  />
                </td>
              </tr>
            ) : votantes.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-0">
                  <EstadoVacio busqueda={busqueda} />
                </td>
              </tr>
            ) : (
              votantes.map((votante, indice) => (
                <tr
                  key={votante.id}
                  style={{
                    backgroundColor: indice % 2 === 0 ? "#ffffff" : "#e2effa",
                  }}
                >
                  <td className="border-b border-[#eef1f5] px-[22px] py-4 text-[13.5px] font-semibold text-[#0a2540]">
                    {votante.nombre_completo}
                  </td>
                  <td className="border-b border-[#eef1f5] px-[22px] py-4 text-[13.5px] text-[#5b6b7c]">
                    {votante.legajo}
                  </td>
                  <td className="border-b border-[#eef1f5] px-[22px] py-4 text-[13.5px] text-[#5b6b7c]">
                    {votante.carrera}
                  </td>
                  <td className="border-b border-[#eef1f5] px-[22px] py-4 text-[13.5px] text-[#1f8fe0] underline">
                    {votante.correo}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mostrarActualizando && (
        <div
          aria-live="polite"
          className="border-t border-[#eef1f5] bg-white px-[22px] py-2 text-[12px] text-[#5b6b7c]"
        >
          Actualizando resultados…
        </div>
      )}
    </div>
  );
}

function FilasEsqueleto() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, indice) => (
        <tr
          key={indice}
          aria-hidden="true"
          style={{ backgroundColor: indice % 2 === 0 ? "#ffffff" : "#e2effa" }}
        >
          <td className="border-b border-[#eef1f5] px-[22px] py-4">
            <div className="h-3.5 w-32 animate-pulse rounded bg-[#d7dde3]" />
          </td>
          <td className="border-b border-[#eef1f5] px-[22px] py-4">
            <div className="h-3.5 w-16 animate-pulse rounded bg-[#d7dde3]" />
          </td>
          <td className="border-b border-[#eef1f5] px-[22px] py-4">
            <div className="h-3.5 w-40 animate-pulse rounded bg-[#d7dde3]" />
          </td>
          <td className="border-b border-[#eef1f5] px-[22px] py-4">
            <div className="h-3.5 w-36 animate-pulse rounded bg-[#d7dde3]" />
          </td>
        </tr>
      ))}
    </>
  );
}

function EstadoVacio({ busqueda }: { busqueda: string }) {
  return (
    <div className="p-8 text-center text-[13.5px] text-[#9aa7b3]">
      {busqueda ? (
        <>No se encontraron votantes para &quot;{busqueda}&quot;.</>
      ) : (
        "No hay votantes registrados en el padrón."
      )}
    </div>
  );
}

function EstadoError({
  mensaje,
  onRetry,
}: {
  mensaje: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <p className="text-[13.5px] font-semibold text-[#9c2b2b]">
        No pudimos cargar el padrón.
      </p>
      <p className="mt-1 text-[13px] text-[#a83d3d]">{mensaje}</p>
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

function Paginador({
  pagina,
  totalPaginas,
  onCambiar,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación del padrón"
      className="mt-4 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1}
        className="rounded-[8px] border border-[#d7dde3] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#33475b] transition-colors hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-[13px] text-[#5b6b7c]">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= totalPaginas}
        className="rounded-[8px] border border-[#d7dde3] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#33475b] transition-colors hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
      </button>
    </nav>
  );
}
