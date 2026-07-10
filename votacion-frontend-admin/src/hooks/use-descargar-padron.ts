"use client";

import { useMutation } from "@tanstack/react-query";
import { descargarPadronCsvRequest } from "@/lib/api/padron";
import type { ApiError, NetworkError } from "@/lib/api/errors";

/**
 * Descarga el CSV del padrón y dispara la descarga real en el navegador
 * (Blob URL + click en un <a> temporal, después revocado). El backend
 * siempre manda el padrón completo — no respeta el término de búsqueda
 * activo en la tabla (ver descargarPadronCsvRequest).
 */
export function useDescargarPadron() {
  return useMutation<void, ApiError | NetworkError, void>({
    mutationFn: async () => {
      const blob = await descargarPadronCsvRequest();
      dispararDescargaArchivo(blob, "padron.csv");
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
