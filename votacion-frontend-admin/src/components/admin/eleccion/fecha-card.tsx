import { CalendarDays } from "lucide-react";
import { formatFechaHora } from "@/lib/format";

interface FechaCardProps {
  label: string;
  iso: string;
}

/** Card de fecha (Inicio/Cierre) del detalle de una elección. */
export function FechaCard({ label, iso }: FechaCardProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-white px-5 py-[18px] shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#e7f2fb]">
        <CalendarDays className="size-[19px] text-[#1f8fe0]" strokeWidth={1.7} aria-hidden="true" />
      </div>
      <div>
        <div className="text-xs font-semibold text-[#5b6b7c]">{label}</div>
        <div className="mt-0.5 text-[14.5px] font-bold text-[#0a2540]">
          {formatFechaHora(iso)}
        </div>
      </div>
    </div>
  );
}
