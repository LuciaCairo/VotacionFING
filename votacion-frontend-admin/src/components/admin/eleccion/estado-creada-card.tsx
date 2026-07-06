import type { EleccionDetalleDTO } from "@/lib/api/elecciones";
import {
  diasEntre,
  formatTiempoRestante,
  tiempoRestanteHasta,
} from "@/lib/format";

interface EstadoCreadaCardProps {
  eleccion: EleccionDetalleDTO;
}

/**
 * Card de estado para elecciones en estado "creada". Publicada y finalizada
 * van a necesitar su propia card con contenido distinto (todavía no
 * diseñado) — no reusar/estirar esta para esos estados, agregar
 * `estado-publicada-card.tsx` / `estado-finalizada-card.tsx` junto a esta
 * cuando ese diseño exista, y que la página elija cuál renderizar según
 * `eleccion.estado`.
 */
export function EstadoCreadaCard({ eleccion }: EstadoCreadaCardProps) {
  const restante = tiempoRestanteHasta(eleccion.fecha_inicio);
  const duracionDias = diasEntre(eleccion.fecha_inicio, eleccion.fecha_cierre);

  return (
    <div className="flex flex-col gap-4 rounded-[14px] bg-white p-6 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e7f2fb] px-3.5 py-1.5 text-xs font-extrabold tracking-[0.4px] text-[#1f8fe0]">
        <span className="size-1.5 rounded-full bg-[#1f8fe0]" aria-hidden="true" />
        CREADA
      </div>

      <p className="text-sm leading-[1.5] text-[#33475b]">
        {restante ? (
          <>
            Esta elección será publicada en{" "}
            <strong className="text-[#0a2540]">
              {formatTiempoRestante(restante)}
            </strong>
          </>
        ) : (
          "Esta elección ya debería estar publicada: puede demorar unos minutos en reflejarse."
        )}
      </p>

      <div className="h-px bg-[#eef1f5]" />

      <dl className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] text-[#5b6b7c]">
          <dt>Listas cargadas</dt>
          <dd className="font-bold text-[#0a2540]">{eleccion.listas.length}</dd>
        </div>
        <div className="flex justify-between text-[13px] text-[#5b6b7c]">
          <dt>Duración</dt>
          <dd className="font-bold text-[#0a2540]">
            {duracionDias} {duracionDias === 1 ? "día" : "días"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
