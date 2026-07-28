import { getJson, postJson } from "./http";

/**
 * Contratos de GET /api/votante/elecciones/vigentes y /finalizadas
 * (ver votacion-backend/src/modules/votante/votante.service.ts). Sin
 * paginación: el backend devuelve el listado completo en ambos casos.
 */

export interface EleccionVigenteDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  ya_voto: boolean;
}

export type ResultadoFinalizadaDTO =
  | { tipo: "ganador_unico"; lista_ganadora: string }
  | { tipo: "empate" }
  | { tipo: "pendiente" };

export interface EleccionFinalizadaDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  total_votos: number | null;
  resultado: ResultadoFinalizadaDTO;
}

export function listarEleccionesVigentesRequest(): Promise<{
  vigentes: EleccionVigenteDTO[];
}> {
  return getJson("/api/votante/elecciones/vigentes");
}

export function listarEleccionesFinalizadasRequest(): Promise<{
  finalizadas: EleccionFinalizadaDTO[];
}> {
  return getJson("/api/votante/elecciones/finalizadas");
}

/**
 * Contrato de GET /api/elecciones/:id/resultados
 * (ver votacion-backend/src/modules/eleccion/eleccion.service.ts, obtenerResultados).
 *
 * Endpoint compartido admin/votante: solo requiere estar autenticado. Si la
 * elección no está finalizada (o finalizó pero el snapshot todavía no se
 * procesó), el backend responde 409 con `{ error: string }` en vez de este
 * shape — ver ApiError.
 */
export interface ListaResultadoDTO {
  nombre: string;
  es_blanco: boolean;
  indice: number;
  color: string | null;
  votos: number;
  porcentaje: number;
}

export interface ParticipacionDTO {
  total_votos: number;
  total_padron: number;
  porcentaje: number;
}

export type ResultadoTipo = "ganador_unico" | "empate";

export interface ResultadoDTO {
  tipo: ResultadoTipo;
  lista_ganadora?: { nombre: string; votos: number };
  listas_empatadas?: { nombre: string; votos: number }[];
}

export interface ResultadosEleccionDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  listas: ListaResultadoDTO[];
  total_votos: number;
  participacion: ParticipacionDTO;
  resultado: ResultadoDTO;
  snapshot_at: string;
}

export function obtenerResultadosRequest(
  id: number,
): Promise<ResultadosEleccionDTO> {
  return getJson<ResultadosEleccionDTO>(`/api/elecciones/${id}/resultados`);
}

/**
 * Contrato de GET /api/votante/elecciones/:id
 * (ver votacion-backend/src/modules/votante/votante.service.ts, obtenerDetalleEleccion).
 *
 * 404 si la elección no existe o todavía está en estado "creada" (no
 * visible para votantes). `listas` viene ordenada por índice e incluye el
 * voto en blanco como una lista más (es_blanco: true) — nunca se filtra ni
 * se muestra aparte.
 */
export interface ListaDetalleDTO {
  id: number;
  nombre: string;
  es_blanco: boolean;
  indice: number;
  color: string | null;
}

export interface EleccionDetalleDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: "creada" | "publicada" | "finalizada";
  ya_voto: boolean;
  listas: ListaDetalleDTO[];
}

export function obtenerDetalleEleccionRequest(
  id: number,
): Promise<EleccionDetalleDTO> {
  return getJson<EleccionDetalleDTO>(`/api/votante/elecciones/${id}`);
}

/**
 * Contrato de GET /api/votante/elecciones/:id/comprobante (ver
 * votacion-backend/src/modules/votante/votante.service.ts, obtenerComprobante).
 * `hash` es el mismo dato que `tx_hash`/`comprobante` de VotarResponse (ambos
 * son `participacion.txHash`) — nunca revela la lista elegida (anonimato).
 */
export interface ComprobanteDTO {
  eleccion: string;
  hash: string;
  fecha_voto: string;
}

export function obtenerComprobanteRequest(id: number): Promise<ComprobanteDTO> {
  return getJson<ComprobanteDTO>(`/api/votante/elecciones/${id}/comprobante`);
}

/**
 * Contrato de POST /api/votante/elecciones/:id/votar (ver
 * votacion-backend/src/modules/votante/votante.service.ts, emitirVoto).
 * `comprobante` y `tx_hash` son el mismo valor (txHash de BFA) devuelto bajo
 * dos nombres — alcanza con mostrar uno solo.
 */
export interface VotarResponse {
  mensaje: string;
  comprobante: string;
  tx_hash: string;
}

/**
 * Espera confirmación real de la transacción en BFA — puede tardar bastante
 * más que el timeout default de `postJson` (15s). Mismo criterio que
 * CREAR_ELECCION_TIMEOUT_MS en el panel de administración.
 */
export const VOTAR_TIMEOUT_MS = 60_000;

export function votarRequest(
  id: number,
  indiceLista: number,
): Promise<VotarResponse> {
  return postJson<VotarResponse>(
    `/api/votante/elecciones/${id}/votar`,
    { indice_lista: indiceLista },
    { timeoutMs: VOTAR_TIMEOUT_MS },
  );
}
