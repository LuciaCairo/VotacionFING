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

/**
 * Dónde vive la elección en BFA: red y dirección del contrato. Alcanza para
 * que cualquiera verifique los resultados sin depender de este sistema.
 */
export interface BlockchainEleccionDTO {
  red: string;
  chain_id: number;
  contrato_address: string | null;
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
  blockchain: BlockchainEleccionDTO;
}

export function obtenerResultadosRequest(
  id: number,
): Promise<ResultadosEleccionDTO> {
  return getJson<ResultadosEleccionDTO>(`/api/elecciones/${id}/resultados`);
}

export interface VerificacionListaDTO {
  indice: number;
  /** null si el contrato tiene un índice que la BD no tiene. */
  nombre: string | null;
  nombre_contrato: string | null;
  votos_publicados: number | null;
  votos_contrato: number | null;
  coincide: boolean;
}

/**
 * Contrato de GET /api/elecciones/:id/verificacion (ver
 * votacion-backend/src/modules/eleccion/eleccion.service.ts,
 * verificarResultadosEnBfa): resultados publicados vs. contrato en BFA,
 * leídos en vivo en el bloque `bloque`.
 */
export interface VerificacionResultadosDTO extends BlockchainEleccionDTO {
  contrato_con_codigo: boolean;
  /** Wallet de este sistema: la única que debería poder votar en el contrato. */
  backend_esperado: string;
  /** `backend()` del contrato; null si no hay contrato en la dirección. */
  backend_contrato: string | null;
  backend_coincide: boolean;
  bloque: number;
  verificado_at: string;
  coincide: boolean;
  listas: VerificacionListaDTO[];
}

export function verificarResultadosRequest(
  id: number,
): Promise<VerificacionResultadosDTO> {
  return getJson<VerificacionResultadosDTO>(
    `/api/elecciones/${id}/verificacion`,
  );
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
 * Constancia de participación: solo elección y fecha. A propósito no trae
 * ningún hash — con el hash se encuentra la transacción en BFA, que lleva la
 * lista elegida en claro.
 */
export interface ComprobanteDTO {
  eleccion: string;
  fecha_voto: string;
}

export function obtenerComprobanteRequest(id: number): Promise<ComprobanteDTO> {
  return getJson<ComprobanteDTO>(`/api/votante/elecciones/${id}/comprobante`);
}

/**
 * Contrato de POST /api/votante/elecciones/:id/votar (ver
 * votacion-backend/src/modules/votante/votante.service.ts, emitirVoto).
 * Además del mensaje trae la misma constancia que ComprobanteDTO.
 */
export interface VotarResponse extends ComprobanteDTO {
  mensaje: string;
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
