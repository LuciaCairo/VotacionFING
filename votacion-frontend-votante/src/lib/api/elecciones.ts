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
