/**
 * El color de cada lista viene siempre del backend (`color: string | null`,
 * hex validado por regex al crear la elección — ver
 * votacion-backend/src/modules/admin/admin.schemas.ts). Es nullable en la
 * práctica: el campo es opcional al crear una lista. Esta paleta es solo el
 * fallback para ese caso, no una paleta "de producto" que el frontend elige.
 */
const PALETA_FALLBACK: readonly string[] = [
  "#5b2a86",
  "#1e7a4f",
  "#7a2340",
  "#1f4e79",
  "#8a5a10",
  "#2b6e78",
];

export function colorDeLista(color: string | null, indice: number): string {
  return color ?? PALETA_FALLBACK[indice % PALETA_FALLBACK.length];
}

/**
 * El voto en blanco siempre tiene color #FFFFFF fijo (ver admin.service.ts,
 * crearEleccion: `esBlanco ? '#FFFFFF' : ...`), y un admin puede elegir un
 * color claro para cualquier otra lista: el texto no puede asumir blanco
 * fijo, hay que decidir el contraste según el brillo real del color de
 * fondo (luminancia relativa, no un promedio simple de RGB).
 */
export function esColorClaro(hex: string): boolean {
  const valor = hex.replace("#", "");
  if (valor.length !== 6) return false;

  const r = parseInt(valor.slice(0, 2), 16);
  const g = parseInt(valor.slice(2, 4), 16);
  const b = parseInt(valor.slice(4, 6), 16);
  if ([r, g, b].some((canal) => Number.isNaN(canal))) return false;

  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6;
}
