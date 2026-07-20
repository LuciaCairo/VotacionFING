"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import { esColorClaro } from "@/lib/colors";

interface ListaFormRowProps {
  nombre: string;
  color: string;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Fila de una lista ya agregada en el formulario de creación: barra de color
 * con el nombre (click abre el diálogo de edición) + botón de eliminar al
 * lado. Distinto de components/admin/eleccion/lista-row.tsx (esa es
 * de solo lectura, para el detalle de una elección ya creada).
 */
export function ListaFormRow({
  nombre,
  color,
  disabled,
  onEdit,
  onDelete,
}: ListaFormRowProps) {
  const textColor = esColorClaro(color) ? "#0a2540" : "#ffffff";

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="flex flex-1 items-center justify-between rounded-[10px] border-none px-4 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: color }}
      >
        <span
          className="text-sm font-bold tracking-[0.3px]"
          style={{ color: textColor }}
        >
          {nombre}
        </span>
        <ChevronRight className="size-4" style={{ color: textColor }} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Eliminar lista ${nombre}`}
        className="flex w-11 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[#f0b8b8] bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="size-4 text-[#c23b3b]" aria-hidden="true" strokeWidth={1.7} />
      </button>
    </div>
  );
}
