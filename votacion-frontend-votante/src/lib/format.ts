/** DD/MM/AAAA a partir de un ISO string (ver EleccionVigenteDTO/EleccionFinalizadaDTO). */
export function formatFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** DD/MM/AAAA · HH:mm a partir de un ISO string. */
export function formatFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const hh = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  return `${formatFechaCorta(iso)} · ${hh}:${min}`;
}
