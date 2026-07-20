"use client";

import { Wallet } from "lucide-react";
import { useSaldoBlockchain } from "@/hooks/use-saldo-blockchain";
import { SALDO_ESTADO_META } from "@/lib/blockchain";

/**
 * Saldo de gas de la wallet del backend en BFA (GET /api/admin/blockchain/saldo):
 * la cuenta que paga el deploy de esta elección. Puramente informativo — si
 * falla la consulta o el saldo está bajo, no bloquea el formulario, solo
 * avisa antes de que el admin se encuentre con un deploy fallido sin
 * explicación.
 */
export function SaldoBlockchainIndicator() {
  const { data, isPending, isError } = useSaldoBlockchain();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-[#eef1f5] px-3.5 py-2 text-[12.5px] font-semibold text-[#9aa7b3]">
        <Wallet className="size-[15px]" aria-hidden="true" />
        Consultando saldo…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-[#eef1f5] px-3.5 py-2 text-[12.5px] font-semibold text-[#9aa7b3]">
        <Wallet className="size-[15px]" aria-hidden="true" />
        Saldo no disponible
      </div>
    );
  }

  const meta = SALDO_ESTADO_META[data.estado];
  const saldoFormateado = Number(data.saldo).toLocaleString("es-AR", {
    maximumFractionDigits: 4,
  });

  return (
    <div
      title={`Wallet ${data.address}`}
      className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold"
      style={{ backgroundColor: meta.bg, borderColor: meta.border, color: meta.color }}
    >
      <Wallet className="size-[15px]" aria-hidden="true" />
      <span>
        {saldoFormateado} {data.unidad}
      </span>
      <span aria-hidden="true" className="opacity-40">
        ·
      </span>
      <span>{meta.label}</span>
    </div>
  );
}
