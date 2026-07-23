interface EmptyEleccionesStateProps {
  mensaje: string;
}

/** Mismo patrón visual que `EmptyElectionsState` del admin (borde punteado, texto gris centrado). */
export function EmptyEleccionesState({ mensaje }: EmptyEleccionesStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[#d7dde3] p-8 text-center text-[13.5px] text-[#9aa7b3]">
      {mensaje}
    </div>
  );
}
