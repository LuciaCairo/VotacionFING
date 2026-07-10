import { getBlob, getJson } from "./http";

/**
 * Contrato de GET /api/admin/padron
 * (ver votacion-backend/src/modules/admin/admin.service.ts, listarPadron).
 */
export interface VotantePadronDTO {
  id: number;
  legajo: string;
  nombre_completo: string;
  carrera: string;
  correo: string;
}

export interface PadronDTO {
  total: number;
  votantes: VotantePadronDTO[];
}

/**
 * El backend no pagina: devuelve el padrón completo (filtrado por
 * `busqueda` si se manda un término no vacío) en un solo array.
 * `busqueda` matchea por coincidencia parcial case-insensitive contra
 * legajo O nombre_completo (OR, ver admin.service.ts) — no hay otros
 * criterios de filtro soportados del lado del backend.
 */
export function listarPadronRequest(busqueda?: string): Promise<PadronDTO> {
  const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : "";
  return getJson<PadronDTO>(`/api/admin/padron${query}`);
}

/**
 * GET /api/admin/padron/descargar: CSV completo del padrón, con BOM UTF-8
 * (ver admin.service.ts, descargarPadronCsv). No acepta `busqueda`: siempre
 * devuelve el padrón entero, independientemente del filtro activo en pantalla.
 */
export function descargarPadronCsvRequest(): Promise<Blob> {
  return getBlob("/api/admin/padron/descargar");
}
