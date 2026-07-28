"use client";

import { useMutation } from "@tanstack/react-query";
import { descargarParticipacionEleccionRequest } from "@/lib/api/elecciones";
import type { ApiError, NetworkError } from "@/lib/api/errors";

/**
 * Descarga el CSV de participación de una elección finalizada (quién votó y
 * quién no) y dispara la descarga real en el navegador — mismo patrón que
 * useDescargarPadron (Blob URL + click en un <a> temporal, después revocado).
 */
export function useDescargarParticipacion(eleccionId: number) {
  return useMutation<void, ApiError | NetworkError, void>({
    mutationFn: async () => {
      const blob = await descargarParticipacionEleccionRequest(eleccionId);
      dispararDescargaArchivo(blob, `participacion_eleccion_${eleccionId}.csv`);
    },
  });
}

function dispararDescargaArchivo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
