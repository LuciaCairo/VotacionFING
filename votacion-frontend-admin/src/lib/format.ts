/** DD/MM/AAAA a partir de un ISO string (ver EleccionResumenDTO.fecha_inicio/fecha_cierre). */
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

/** Días completos (piso) entre dos ISO strings — usado para "Duración" de una elección. */
export function diasEntre(inicioIso: string, cierreIso: string): number {
  const ms = new Date(cierreIso).getTime() - new Date(inicioIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? singular : plural;
}

/**
 * Días y horas restantes hasta un ISO string futuro, para la cuenta
 * regresiva de publicación de una elección "creada". `null` si la fecha ya
 * pasó (puede suceder si el job de apertura automática todavía no corrió).
 */
export function tiempoRestanteHasta(
  iso: string,
): { dias: number; horas: number } | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;

  const totalHoras = Math.floor(ms / (1000 * 60 * 60));
  return { dias: Math.floor(totalHoras / 24), horas: totalHoras % 24 };
}

/** "X día(s) Y hora(s)." listo para mostrar, a partir de `tiempoRestanteHasta`. */
export function formatTiempoRestante(restante: {
  dias: number;
  horas: number;
}): string {
  const dias = `${restante.dias} ${pluralizar(restante.dias, "día", "días")}`;
  const horas = `${restante.horas} ${pluralizar(restante.horas, "hora", "horas")}`;
  return `${dias} ${horas}.`;
}
