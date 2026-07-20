"use client";

import { useId, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { validarNombreLista } from "@/lib/validations/eleccion";

/**
 * Paleta fija que el mock ofrece al crear una lista (distinta de la paleta
 * de *fallback* de lib/colors.ts, que solo se usa para pintar una lista sin
 * color guardado). Acá el admin siempre elige un color explícito — de esta
 * paleta o uno custom vía el input nativo — antes de guardar.
 */
export const PALETA_LISTAS: readonly string[] = [
  "#8e5fc9",
  "#4fae7d",
  "#e07a9d",
  "#e0a23a",
  "#4a8fd6",
];

interface ListaDialogProps {
  open: boolean;
  modo: "agregar" | "editar";
  initialNombre: string;
  initialColor: string;
  /** Nombres de las demás listas ya agregadas (sin la que se está editando), para detectar duplicados. */
  nombresExistentes: string[];
  onCancel: () => void;
  onSave: (nombre: string, color: string) => void;
}

/**
 * Diálogo de agregar/editar una lista: card con gradiente navy, swatch grande
 * (decorativo) + paleta de color siempre visible, con validación real en vez
 * del default silencioso "LISTA" del mock.
 */
export function ListaDialog({
  open,
  modo,
  initialNombre,
  initialColor,
  nombresExistentes,
  onCancel,
  onSave,
}: ListaDialogProps) {
  const [nombre, setNombre] = useState(initialNombre);
  const [color, setColor] = useState(initialColor);
  const [error, setError] = useState<string | null>(null);
  const nombreInputId = useId();

  // Reinicia el formulario interno cada vez que el diálogo se abre (agregar
  // parte de valores vacíos, editar parte de los valores de esa lista).
  // Ajustado durante el render (no en un efecto) para evitar el render
  // extra que dispararía un setState dentro de un useEffect — mismo patrón
  // que admin/padron/page.tsx (busquedaAnterior).
  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) {
      setNombre(initialNombre);
      setColor(initialColor);
      setError(null);
    }
  }

  const isCustom = !PALETA_LISTAS.includes(color);

  function handleGuardar() {
    const mensaje = validarNombreLista(nombre, nombresExistentes);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    onSave(nombre.trim(), color);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[rgba(7,26,48,0.55)]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] p-7 outline-none [background:linear-gradient(160deg,#0d3a63_0%,#0a2540_60%,#071a30_100%)] [box-shadow:0_30px_60px_rgba(0,0,0,0.4)]">
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-10 h-[140px] w-[140px] rounded-full border border-white/[0.08]"
            />

            <Dialog.Title className="relative z-[1] mb-[22px] text-center text-xs font-extrabold tracking-[1.2px] text-white uppercase">
              {modo === "editar" ? "Editar lista" : "Agregar lista"}
            </Dialog.Title>

            <div className="relative z-[2] mb-3.5 flex justify-center">
              <div
                aria-hidden="true"
                className="relative flex size-14 items-center justify-center rounded-[14px] shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
                style={{ backgroundColor: color }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 4h9l3 3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z"
                    stroke="#fff"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M8 9h8M8 13h8M8 17h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="relative z-[2] mb-3.5 flex justify-center">
              <div className="flex items-center gap-2.5 rounded-[14px] bg-white/[0.08] px-4 py-3.5">
                {PALETA_LISTAS.map((paletaColor) => {
                  const selected = paletaColor === color;
                  return (
                    <button
                      key={paletaColor}
                      type="button"
                      onClick={() => setColor(paletaColor)}
                      aria-label={`Color ${paletaColor}`}
                      aria-pressed={selected}
                      className="size-[30px] shrink-0 rounded-full p-0"
                      style={{
                        backgroundColor: paletaColor,
                        border: selected ? "2.5px solid #fff" : "2.5px solid transparent",
                        boxShadow: selected ? "0 0 0 2px rgba(255,255,255,0.25)" : "none",
                      }}
                    />
                  );
                })}

                <div className="mx-0.5 h-[22px] w-px bg-white/20" />

                <label
                  className="relative block size-[30px] shrink-0 cursor-pointer overflow-hidden rounded-full focus-within:ring-2 focus-within:ring-white/70 focus-within:ring-offset-1 focus-within:ring-offset-[#0a2540]"
                  style={{
                    background:
                      "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                    border: isCustom ? "2.5px solid #fff" : "2.5px solid rgba(255,255,255,0.3)",
                    boxShadow: isCustom ? "0 0 0 2px rgba(255,255,255,0.25)" : "none",
                  }}
                >
                  <span className="sr-only">Elegir color personalizado</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer border-none p-0 opacity-0"
                  />
                </label>
              </div>
            </div>

            <label htmlFor={nombreInputId} className="sr-only">
              Nombre de la lista
            </label>
            <input
              id={nombreInputId}
              type="text"
              placeholder="Nombre de la lista"
              value={nombre}
              onChange={(event) => {
                setNombre(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? `${nombreInputId}-error` : undefined}
              className="relative z-[1] mb-2 w-full rounded-[10px] border-none bg-white px-3.5 py-3 text-sm font-[inherit] text-[#0a2540] outline-none"
            />

            {error && (
              <p
                id={`${nombreInputId}-error`}
                role="alert"
                className="relative z-[1] mb-4 text-xs font-semibold text-[#ffb4b4]"
              >
                {error}
              </p>
            )}

            <div className={`relative z-[1] flex gap-3 ${error ? "" : "mt-6"}`}>
              <button
                type="button"
                onClick={handleGuardar}
                className="flex-1 rounded-[10px] border-none bg-[#1f8fe0] py-3 text-sm font-bold text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-[10px] border-[1.5px] border-white/30 bg-transparent py-3 text-sm font-bold text-white"
              >
                Cancelar
              </button>
            </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
