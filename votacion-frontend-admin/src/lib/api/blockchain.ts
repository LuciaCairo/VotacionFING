import { getJson } from "./http";

/**
 * Contrato de GET /api/admin/blockchain/saldo
 * (ver votacion-backend/src/modules/admin/admin.service.ts, consultarSaldoBlockchain).
 *
 * Saldo de gas de la wallet del backend en BFA: la cuenta que paga el
 * deploy de cada elección y cada voto emitido. Si no responde BFA, el
 * backend corta con 503 (llega como `ApiError`, no como este DTO).
 */
export type SaldoBlockchainEstado = "ok" | "advertencia" | "critico";

export interface SaldoBlockchainDTO {
  address: string;
  saldo: string;
  unidad: string;
  estado: SaldoBlockchainEstado;
  umbrales: {
    advertencia: string;
    critico: string;
  };
}

export function obtenerSaldoBlockchainRequest(): Promise<SaldoBlockchainDTO> {
  return getJson<SaldoBlockchainDTO>("/api/admin/blockchain/saldo");
}
