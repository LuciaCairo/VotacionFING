import Link from "next/link";
import type { EleccionVigenteDTO } from "@/lib/api/elecciones";
import { formatFechaCorta } from "@/lib/format";

interface EleccionVigenteCardProps {
  eleccion: EleccionVigenteDTO;
}

/**
 * Misma estructura/estilo que `ElectionCard` del admin (ver
 * votacion-frontend-admin/src/components/admin/election-card.tsx) —
 * fila con nombre + meta a la izquierda, acción a la derecha. El botón
 * "Ver" navega al detalle/boleta (ver app/elecciones/[id]/page.tsx).
 */
export function EleccionVigenteCard({ eleccion }: EleccionVigenteCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e2e7ec] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[14.5px] font-bold text-[#0a2540]">
            {eleccion.nombre}
          </div>
          {eleccion.ya_voto && (
            <span className="rounded-[10px] bg-[#e6f6ee] px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.3px] text-[#1e9e5c]">
              YA VOTASTE
            </span>
          )}
        </div>
        <div className="mt-[3px] text-[13px] text-[#5b6b7c]">
          Vigente hasta el {formatFechaCorta(eleccion.fecha_cierre)}
        </div>
      </div>
      <Link
        href={`/elecciones/${eleccion.id}`}
        className="shrink-0 rounded-full bg-[#1f8fe0] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
      >
        Ver
      </Link>
    </div>
  );
}
