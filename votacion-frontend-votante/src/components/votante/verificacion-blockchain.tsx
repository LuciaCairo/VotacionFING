"use client";

import { useState } from "react";
import { Check, Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import { useVerificarResultados } from "@/hooks/use-verificar-resultados";
import type {
  BlockchainEleccionDTO,
  ListaResultadoDTO,
  VerificacionListaDTO,
  VerificacionResultadosDTO,
} from "@/lib/api/elecciones";
import { formatFechaHora } from "@/lib/format";

interface VerificacionBlockchainProps {
  eleccionId: number;
  blockchain: BlockchainEleccionDTO;
  listas: ListaResultadoDTO[];
}

/**
 * Tarjeta de verificación de los resultados contra el contrato de la
 * elección en BFA, al pie de la pantalla de Resultados.
 *
 * Ofrece dos cosas distintas, y lo dice: el botón verifica a través de este
 * sistema (cómodo, pero hay que confiar en él), y el desplegable explica cómo
 * consultar el contrato directamente, sin depender del sistema.
 */
export function VerificacionBlockchain({
  eleccionId,
  blockchain,
  listas,
}: VerificacionBlockchainProps) {
  const verificar = useVerificarResultados(eleccionId);

  if (!blockchain.contrato_address) return null;

  const nombresEnOrden = [...listas]
    .sort((a, b) => a.indice - b.indice)
    .map((l) => `"${l.nombre}"`)
    .join(", ");

  return (
    <div className="mt-3 shrink-0 rounded-[14px] bg-white p-3.5 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[12.5px] font-bold tracking-[0.4px] text-[#5b6b7c]">
            VERIFICACIÓN EN BLOCKCHAIN
          </div>
          <div className="mt-0.5 text-[12.5px] text-[#5b6b7c]">
            {blockchain.red}
          </div>
        </div>
        <button
          type="button"
          onClick={() => verificar.mutate()}
          disabled={verificar.isPending}
          className="shrink-0 rounded-full bg-[#1f8fe0] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#1a7cc4] disabled:cursor-wait disabled:bg-[#b7c3cd]"
        >
          {verificar.isPending ? "Verificando…" : "Verificar contra BFA"}
        </button>
      </div>

      <DireccionContrato address={blockchain.contrato_address} />

      {verificar.isSuccess && <ResultadoVerificacion datos={verificar.data} />}
      {verificar.isError && (
        <p className="mt-2.5 rounded-[10px] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9c2b2b]">
          {verificar.error.message}
        </p>
      )}

      <details className="mt-2.5 text-[12.5px] text-[#5b6b7c]">
        <summary className="cursor-pointer font-bold text-[#33475b]">
          ¿Cómo verificarlo sin depender de este sistema?
        </summary>
        <div className="mt-1.5 max-h-[150px] overflow-y-auto pr-2 leading-[1.5]">
          <p>
            El botón de arriba hace la consulta a través de este sistema. Para
            no tener que confiar en él, cualquiera puede consultar la
            blockchain directamente:
          </p>
          <ol className="mt-1 ml-4 list-decimal">
            <li>
              Conectarse a un nodo de la {blockchain.red} (chainId{" "}
              {blockchain.chain_id}).
            </li>
            <li>
              Llamar a la función <code>obtenerTodosLosVotos()</code> del
              contrato de arriba. Es de solo lectura, no tiene costo y responde
              desde el cierre de la elección.
            </li>
            <li>
              Devuelve los votos de cada lista en este orden: {nombresEnOrden}.
              Tienen que ser los mismos números que muestra esta pantalla.
            </li>
          </ol>
        </div>
      </details>
    </div>
  );
}

function DireccionContrato({ address }: { address: string }) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: la dirección sigue visible y
      // seleccionable a mano, no es un estado bloqueante.
    }
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] bg-[#f7f9fb] px-3 py-2">
      <span className="text-[12px] font-bold text-[#5b6b7c]">Contrato:</span>
      <code className="min-w-0 break-all text-[12.5px] text-[#0a2540]">
        {address}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar dirección del contrato"
        className="flex items-center gap-1 rounded-full border border-[#d7dde3] bg-white px-2.5 py-1 text-[12px] font-bold text-[#33475b] transition-colors hover:bg-[#eef1f5]"
      >
        {copiado ? (
          <>
            <Check className="size-3.5 text-[#1e9e5c]" aria-hidden="true" />
            ¡Copiada!
          </>
        ) : (
          <>
            <Copy className="size-3.5" aria-hidden="true" />
            Copiar
          </>
        )}
      </button>
    </div>
  );
}

function ResultadoVerificacion({ datos }: { datos: VerificacionResultadosDTO }) {
  const Icono = datos.coincide ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={`mt-2.5 rounded-[10px] border px-3 py-2.5 ${
        datos.coincide
          ? "border-[#c8ecd8] bg-[#e6f6ee]"
          : "border-[#f6c6c6] bg-[#fdecec]"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icono
          className={`size-4 shrink-0 ${datos.coincide ? "text-[#1e9e5c]" : "text-[#c23b3b]"}`}
          aria-hidden="true"
        />
        <div
          className={`text-[13.5px] font-extrabold ${datos.coincide ? "text-[#146b3b]" : "text-[#9c2b2b]"}`}
        >
          {datos.coincide
            ? "Los resultados coinciden con BFA"
            : "Los resultados NO coinciden con BFA"}
        </div>
      </div>
      <div className="mt-0.5 text-[12px] text-[#5b6b7c]">
        Leído del bloque {datos.bloque.toLocaleString("es-AR")} el{" "}
        {formatFechaHora(datos.verificado_at)}.
      </div>

      {datos.contrato_con_codigo ? (
        <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-[12.5px]">
          {datos.listas.map((l) => (
            <FilaVerificacion key={l.indice} lista={l} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-[#9c2b2b]">
          No hay ningún contrato desplegado en esa dirección.
        </p>
      )}
    </div>
  );
}

function FilaVerificacion({ lista }: { lista: VerificacionListaDTO }) {
  const nombre = lista.nombre ?? lista.nombre_contrato ?? `Índice ${lista.indice}`;
  const nombreDistinto =
    lista.nombre !== null &&
    lista.nombre_contrato !== null &&
    lista.nombre !== lista.nombre_contrato;

  return (
    <li className={lista.coincide ? "text-[#33475b]" : "font-bold text-[#9c2b2b]"}>
      {lista.coincide ? "✓" : "✗"} {nombre}: publicados{" "}
      {lista.votos_publicados ?? "—"} · en BFA {lista.votos_contrato ?? "—"}
      {nombreDistinto && ` (en BFA figura como "${lista.nombre_contrato}")`}
    </li>
  );
}
