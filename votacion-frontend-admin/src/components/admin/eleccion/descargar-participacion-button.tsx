import { Download } from "lucide-react";

interface DescargarParticipacionButtonProps {
  loading: boolean;
  onDownload: () => void;
}

/**
 * Botón secundario "Descargar Participación", junto a VerIntegridadButton en
 * la pantalla de resultados (finalizada). Exporta un CSV con el padrón
 * completo cruzado contra quién votó (legajo, nombre, carrera, correo, voto
 * Sí/No, fecha_voto) — nunca a qué lista votó cada persona (ver
 * admin.service.ts, descargarParticipacionEleccionCsv).
 */
export function DescargarParticipacionButton({
  loading,
  onDownload,
}: DescargarParticipacionButtonProps) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={loading}
      className="flex shrink-0 items-center gap-2 rounded-[10px] border-[1.5px] border-[#d7dde3] bg-white px-[18px] py-2.5 text-[13.5px] font-bold text-[#33475b] transition-colors hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Descargando…" : "Descargar Participación"}
      <Download className="size-4" aria-hidden="true" />
    </button>
  );
}
