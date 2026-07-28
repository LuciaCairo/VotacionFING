"use client";

import { useMutation } from "@tanstack/react-query";
import { votarRequest, type VotarResponse } from "@/lib/api/elecciones";
import { ApiError, NetworkError } from "@/lib/api/errors";

/** Emite el voto del votante en una elección (POST /api/votante/elecciones/:id/votar). */
export function useVotar(id: number) {
  return useMutation<VotarResponse, ApiError | NetworkError, { indiceLista: number }>({
    mutationFn: ({ indiceLista }) => votarRequest(id, indiceLista),
  });
}
