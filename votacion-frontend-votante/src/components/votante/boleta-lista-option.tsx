import type { ListaDetalleDTO } from "@/lib/api/elecciones";
import { colorDeLista, esColorClaro } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface BoletaListaOptionProps {
  lista: ListaDetalleDTO;
  seleccionada: boolean;
  onSelect: () => void;
}

/**
 * Opción de la boleta con comportamiento de radio button (selección única,
 * ver el `role="radiogroup"` en el contenedor que las agrupa). Mismo fondo
 * de color por lista que `ListaRow` del admin (ver
 * votacion-frontend-admin/src/components/admin/eleccion/lista-row.tsx) — el
 * voto en blanco (es_blanco: true) usa el mismo componente sin tratamiento
 * especial, solo cambia la etiqueta.
 */
export function BoletaListaOption({
  lista,
  seleccionada,
  onSelect,
}: BoletaListaOptionProps) {
  const color = colorDeLista(lista.color, lista.indice);
  const textColor = esColorClaro(color) ? "#0a2540" : "#ffffff";
  const etiqueta = lista.es_blanco ? "Voto en blanco" : lista.nombre;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left shadow-[0_3px_10px_rgba(10,37,64,0.08)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f8fe0]",
        seleccionada
          ? "border-[#1f8fe0] ring-2 ring-[#1f8fe0]/40"
          : "border-black/[0.06]",
      )}
      style={{ backgroundColor: color }}
    >
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2"
        style={{
          borderColor: textColor,
          backgroundColor: seleccionada ? textColor : "transparent",
        }}
      >
        {seleccionada && (
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </span>
      <span
        className="text-[14.5px] font-bold tracking-[0.3px]"
        style={{ color: textColor }}
      >
        {etiqueta}
      </span>
    </button>
  );
}
