import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface VerIntegridadButtonProps {
  eleccionId: number;
}

/**
 * Botón secundario "Ver Integridad", compartido por las 3 pantallas de
 * elección (detalle creada/publicada y resultados de finalizada) — mismo
 * destino desde cualquiera de las tres, ver app/admin/elecciones/[id]/integridad.
 */
export function VerIntegridadButton({ eleccionId }: VerIntegridadButtonProps) {
  return (
    <Link
      href={`/admin/elecciones/${eleccionId}/integridad`}
      className="flex shrink-0 items-center gap-2 rounded-[10px] border-[1.5px] border-[#d7dde3] bg-white px-[18px] py-2.5 text-[13.5px] font-bold text-[#33475b] transition-colors hover:bg-[#f4f6f8]"
    >
      Ver Integridad
      <ShieldCheck className="size-4" aria-hidden="true" />
    </Link>
  );
}
