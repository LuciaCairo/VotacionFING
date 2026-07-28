"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface ComprobanteHashProps {
  hash: string;
}

/**
 * Hash de la transacción en BFA, copiable. Se usa tanto en la confirmación
 * de un voto recién emitido como en la pantalla de "ya votaste" — ambos
 * casos muestran el mismo dato (ver VotarResponse.tx_hash / ComprobanteDTO.hash
 * en lib/api/elecciones.ts, son el mismo `participacion.txHash` del backend).
 */
export function ComprobanteHash({ hash }: ComprobanteHashProps) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles o navegador sin soporte: el hash sigue
      // visible y seleccionable a mano, no es un estado bloqueante.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[#e2e7ec] bg-[#f7f9fb] p-3.5">
      <div className="text-[11.5px] font-bold tracking-[0.4px] text-[#5b6b7c]">
        COMPROBANTE (HASH EN BLOCKCHAIN)
      </div>
      <code className="break-all text-[13px] leading-[1.5] text-[#0a2540]">
        {hash}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-1 flex w-fit items-center gap-1.5 rounded-full border border-[#d7dde3] bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#33475b] transition-colors hover:bg-[#eef1f5]"
      >
        {copiado ? (
          <>
            <Check className="size-3.5 text-[#1e9e5c]" aria-hidden="true" />
            ¡Copiado!
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
