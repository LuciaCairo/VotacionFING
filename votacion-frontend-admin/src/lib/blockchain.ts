import type { SaldoBlockchainEstado } from "@/lib/api/blockchain";

/** Indicador de saldo: mismos 3 colores que ESTADO_SECCION_META en lib/integridad.ts. */
export const SALDO_ESTADO_META: Record<
  SaldoBlockchainEstado,
  { label: string; bg: string; border: string; color: string }
> = {
  ok: { label: "Saldo OK", bg: "#e6f6ee", border: "#c8ecd8", color: "#1e9e5c" },
  advertencia: {
    label: "Saldo bajo",
    bg: "#fff4e5",
    border: "#f6d9a8",
    color: "#c9821a",
  },
  critico: {
    label: "Saldo crítico",
    bg: "#fdecec",
    border: "#f6c6c6",
    color: "#c23b3b",
  },
};
