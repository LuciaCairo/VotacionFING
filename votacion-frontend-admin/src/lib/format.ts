/** DD/MM/AAAA a partir de un ISO string (ver EleccionResumenDTO.fecha_inicio/fecha_cierre). */
export function formatFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
