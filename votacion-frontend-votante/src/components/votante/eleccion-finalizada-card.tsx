import Link from "next/link";
import type { EleccionFinalizadaDTO } from "@/lib/api/elecciones";
import { formatFechaCorta } from "@/lib/format";

interface EleccionFinalizadaCardProps {
  eleccion: EleccionFinalizadaDTO;
}

/**
 * El resultado va integrado en la línea de meta (no como badge aparte):
 * un chip de color al lado del nombre empujaba el título a una segunda
 * línea en mobile y quedaba recargado.
 */
function resultadoTexto(resultado: EleccionFinalizadaDTO["resultado"]): string {
  switch (resultado.tipo) {
    case "ganador_unico":
      return `Ganadora: ${resultado.lista_ganadora}`;
    case "empate":
      return "Empate";
    case "pendiente":
      return "Resultado pendiente";
  }
}

/**
 * Misma estructura/estilo que `ElectionCard` del admin. El botón "Ver"
 * navega a la pantalla de resultados (ver
 * app/elecciones/[id]/resultados/page.tsx) — a diferencia de
 * `EleccionVigenteCard`, acá sí hay una pantalla real detrás: no hay
 * resultados en tiempo real, así que solo tiene sentido para elecciones
 * ya finalizadas.
 */
export function EleccionFinalizadaCard({ eleccion }: EleccionFinalizadaCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e2e7ec] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div>
        <div className="text-[14.5px] font-bold text-[#0a2540]">
          {eleccion.nombre}
        </div>
        <div className="mt-[3px] text-[13px] text-[#5b6b7c]">
          Finalizada el {formatFechaCorta(eleccion.fecha_cierre)}
          {eleccion.total_votos !== null && ` · ${eleccion.total_votos} votos`}
          {" · "}
          {resultadoTexto(eleccion.resultado)}
        </div>
      </div>
      <Link
        href={`/elecciones/${eleccion.id}/resultados`}
        className="shrink-0 rounded-full bg-[#1f8fe0] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
      >
        Ver
      </Link>
    </div>
  );
}
