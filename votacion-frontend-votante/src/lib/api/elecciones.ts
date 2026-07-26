import { getJson } from "./http";

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
