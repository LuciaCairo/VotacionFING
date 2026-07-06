import type { ListaDetalleDTO } from "@/lib/api/elecciones";
import { colorDeLista, esColorClaro } from "@/lib/colors";

interface ListaRowProps {
  lista: ListaDetalleDTO;
}

/** Fila de una lista participante (incluye el voto en blanco, si la elección lo tiene). */
export function ListaRow({ lista }: ListaRowProps) {
  const color = colorDeLista(lista.color, lista.indice);
  const textColor = esColorClaro(color) ? "#0a2540" : "#ffffff";

  return (
    <div
      className="flex items-center rounded-[10px] border border-black/[0.06] px-4 py-2.5 shadow-[0_3px_10px_rgba(10,37,64,0.08)]"
      style={{ backgroundColor: color }}
    >
      <div
        className="text-[14.5px] font-bold tracking-[0.3px]"
        style={{ color: textColor }}
      >
        {lista.nombre}
      </div>
    </div>
  );
}
