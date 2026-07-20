"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerSaldoBlockchainRequest } from "@/lib/api/blockchain";

/**
 * GET /api/admin/blockchain/saldo: saldo de gas de la wallet del backend en
 * BFA. `refetchOnWindowFocus` está en false a nivel global (ver
 * app/providers.tsx), así que esto consulta una sola vez al montar la
 * pantalla — no hace polling.
 */
export function useSaldoBlockchain() {
  return useQuery({
    queryKey: ["admin", "blockchain", "saldo"],
    queryFn: obtenerSaldoBlockchainRequest,
  });
}
