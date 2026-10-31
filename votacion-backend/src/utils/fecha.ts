/** Zona horaria de la institución (UTC-3, sin horario de verano). */
export const ZONA_HORARIA_LOCAL = 'America/Argentina/Mendoza';

/**
 * Formatea una fecha en hora local de Mendoza como 'YYYY-MM-DD', sin hora.
 *
 * Todo el resto de la app manda fechas como ISO UTC y deja que el frontend
 * las convierta a hora local para mostrarlas (ver `formatFechaHora` en ambos
 * frontends). Esta función es para los casos en que la hora no debe salir
 * del backend: el día de un voto en el CSV de participación y en la
 * constancia del votante. Con la hora de un voto, cruzada con la hora de los
 * bloques en BFA, se puede encontrar su transacción y leer la lista elegida,
 * que va en claro. La conversión se hace explícitamente contra la zona
 * horaria de la institución, en vez de asumir que el proceso de Node corre en
 * esa misma zona (el día puede cambiar según la zona).
 */
export function formatFechaLocal(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_LOCAL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}
