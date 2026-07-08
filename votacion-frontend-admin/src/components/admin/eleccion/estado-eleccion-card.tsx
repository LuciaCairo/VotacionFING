import type { EleccionDetalleDTO } from "@/lib/api/elecciones";
import {
  diasEntre,
  formatTiempoRestante,
  tiempoRestanteHasta,
} from "@/lib/format";

interface EstadoEleccionCardProps {
  eleccion: EleccionDetalleDTO;
}

/**
 * Card de estado para elecciones "creada" (cuenta regresiva hasta que se
 * publica) y "publicada" (cuenta regresiva hasta que cierra) — mismo layout,
 * solo cambian el badge, el texto y la fecha objetivo de la cuenta
 * regresiva. "Finalizada" todavía no tiene diseño: esta card no la maneja,
 * agregar `estado-finalizada-card.tsx` cuando exista y elegir en la página
 * según `eleccion.estado`.
 */
export function EstadoEleccionCard({ eleccion }: EstadoEleccionCardProps) {
  const esPublicada = eleccion.estado === "publicada";
  const fechaObjetivo = esPublicada
    ? eleccion.fecha_cierre
    : eleccion.fecha_inicio;
  const restante = tiempoRestanteHasta(fechaObjetivo);
  const duracionDias = diasEntre(eleccion.fecha_inicio, eleccion.fecha_cierre);

  return (
    <div className="flex flex-col gap-4 rounded-[14px] bg-white p-6 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
      <div
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold tracking-[0.4px] ${
          esPublicada
            ? "bg-[#e5f6ec] text-[#1e8f57]"
            : "bg-[#e7f2fb] text-[#1f8fe0]"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${esPublicada ? "bg-[#1e8f57]" : "bg-[#1f8fe0]"}`}
          aria-hidden="true"
        />
        {esPublicada ? "ACTIVA" : "CREADA"}
      </div>

      <p className="text-sm leading-[1.5] text-[#33475b]">
        {restante ? (
          <>
            Esta elección {esPublicada ? "cerrará en" : "será publicada en"}{" "}
            <strong className="text-[#0a2540]">
              {formatTiempoRestante(restante)}
            </strong>
          </>
        ) : esPublicada ? (
          "Esta elección está cerrando: puede demorar unos minutos en reflejarse."
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
