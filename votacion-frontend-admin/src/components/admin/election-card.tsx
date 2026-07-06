import Link from "next/link";
import type { EleccionResumenDTO, Seccion } from "@/lib/api/elecciones";
import { rutaVerEleccion } from "@/lib/api/elecciones";
import { formatFechaCorta } from "@/lib/format";

interface ElectionCardProps {
  eleccion: EleccionResumenDTO;
  seccion: Seccion;
}

function metaText(eleccion: EleccionResumenDTO, seccion: Seccion): string {
  switch (seccion) {
    case "creada":
      return `Vigente desde el ${formatFechaCorta(eleccion.fecha_inicio)}`;
    case "publicada":
      return `Vigente hasta el ${formatFechaCorta(eleccion.fecha_cierre)}`;
    case "finalizada":
      return `Finalizada el ${formatFechaCorta(eleccion.fecha_cierre)}`;
  }
}

export function ElectionCard({ eleccion, seccion }: ElectionCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e2e7ec] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div>
        <div className="text-[14.5px] font-bold text-[#0a2540]">
          {eleccion.nombre}
        </div>
        <div className="mt-[3px] text-[13px] text-[#5b6b7c]">
          {metaText(eleccion, seccion)}
        </div>
      </div>
      <Link
        href={rutaVerEleccion(seccion, eleccion.id)}
        className="rounded-full bg-[#1f8fe0] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
      >
        Ver
      </Link>
    </div>
  );
}
