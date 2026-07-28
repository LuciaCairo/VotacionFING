import { deleteJson, getBlob, getJson, postJson } from "./http";

/**
 * Contrato de GET /api/admin/elecciones
 * (ver votacion-backend/src/modules/admin/admin.service.ts, listarEleccionesAgrupadas).
 */
export type Seccion = "creada" | "publicada" | "finalizada";

export const SECCIONES: readonly Seccion[] = [
  "creada",
  "publicada",
  "finalizada",
];

export const SECCION_LABELS: Record<Seccion, string> = {
  creada: "Elecciones Creadas",
  publicada: "Elecciones Publicadas",
  finalizada: "Elecciones Finalizadas",
};

export interface ListaResumenDTO {
  id: number;
  nombre: string;
  indice: number;
  color: string | null;
}

export interface EleccionResumenDTO {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: Seccion;
  contrato_address: string | null;
  listas: ListaResumenDTO[];
}

/**
 * El backend agrupa por estado en vez de devolver una lista plana: un objeto
 * con las 3 claves, no un array (ver admin.service.ts).
 */
export type EleccionesAgrupadas = Record<Seccion, EleccionResumenDTO[]>;

export function listarEleccionesRequest(): Promise<EleccionesAgrupadas> {
  return getJson<EleccionesAgrupadas>("/api/admin/elecciones");
}

/** A dónde navega el botón "Ver" de una card, según el estado de la elección. */
export function rutaVerEleccion(seccion: Seccion, id: number): string {
  switch (seccion) {
    case "creada":
      return `/admin/elecciones/${id}`;
    case "publicada":
      return `/admin/elecciones/${id}`;
    case "finalizada":
      return `/admin/elecciones/${id}/resultados`;
  }
}

/**
 * Contrato de GET /api/admin/elecciones/:id
 * (ver votacion-backend/src/modules/admin/admin.service.ts, obtenerDetalleEleccionAdmin).
 *
 * No es el mismo shape que `ListaResumenDTO`/`EleccionResumenDTO` del listado:
 * acá cada lista sí trae `es_blanco` (el listado no lo selecciona).
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
  estado: Seccion;
  contrato_address: string | null;
  listas: ListaDetalleDTO[];
}

export function obtenerEleccionRequest(id: number): Promise<EleccionDetalleDTO> {
  return getJson<EleccionDetalleDTO>(`/api/admin/elecciones/${id}`);
}

/**
 * Body de POST /api/admin/elecciones (ver crearEleccionSchema en el backend).
 * `color` es opcional/nullable en el schema del backend, pero esta pantalla
 * siempre manda un color elegido (paleta o custom) — nunca `null` desde acá.
 *
 * El backend agrega automáticamente una lista "Voto en blanco" (color
 * #FFFFFF fijo) al desplegar el contrato — este array nunca la incluye ni
 * cuenta para el mínimo de 2 listas.
 */
export interface ListaCreacionInput {
  nombre: string;
  color: string;
}

export interface CrearEleccionInput {
  nombre: string;
  fecha_inicio: string;
  fecha_cierre: string;
  listas: ListaCreacionInput[];
}

/**
 * El deploy del contrato en BFA puede tardar bastante más que el timeout
 * default de `postJson` (15s) — ver desplegarContrato en el backend.
 */
export const CREAR_ELECCION_TIMEOUT_MS = 60_000;

/**
 * La respuesta 201 tiene el mismo shape que el detalle (`EleccionDetalleDTO`):
 * incluye `es_blanco` e `indice` por lista, más `contrato_address` ya seteado.
 */
export function crearEleccionRequest(
  input: CrearEleccionInput,
): Promise<EleccionDetalleDTO> {
  return postJson<EleccionDetalleDTO>("/api/admin/elecciones", input, {
    timeoutMs: CREAR_ELECCION_TIMEOUT_MS,
  });
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

/** Contrato de DELETE /api/admin/elecciones/:id. */
export interface EliminarEleccionResponse {
  mensaje: string;
}

export function eliminarEleccionRequest(
  id: number,
): Promise<EliminarEleccionResponse> {
  return deleteJson<EliminarEleccionResponse>(`/api/admin/elecciones/${id}`);
}

/**
 * Contrato de GET /api/admin/elecciones/:id/integridad
 * (ver votacion-backend/src/modules/admin/admin.service.ts, verificarIntegridadEleccion).
 *
 * Antes de llegar a este shape el backend puede responder 404 (no existe la
 * elección), 409 (todavía no tiene contrato desplegado en BFA) o 503 (no se
 * pudo conectar a la blockchain) — esos casos llegan como `ApiError`, no
 * como este DTO.
 */
export type IntegridadEstado =
  | "verificada"
  | "discrepancias"
  | "con_advertencias"
  | "no_aplica";

export interface IntegridadCheckDTO {
  campo: string;
  ok: boolean;
  bd?: string | number | boolean | null;
  bfa?: string | number | boolean | null;
  /** true en checks que no comparan contra BFA (ej. consistencia interna estado/fechas). */
  interno?: boolean;
}

export interface IntegridadSeccionDTO {
  estado: IntegridadEstado;
  checks: IntegridadCheckDTO[];
}

export interface IntegridadSeccionesDTO {
  eleccion: IntegridadSeccionDTO;
  listas: IntegridadSeccionDTO;
  resultados: IntegridadSeccionDTO;
  participacion: IntegridadSeccionDTO;
}

export interface IntegridadEleccionDTO {
  eleccion_id: number;
  verificado_at: string;
  /** Nunca "no_aplica" a nivel global (ver estadoDeChecks/integridadGlobal en el backend). */
  integridad_global: Exclude<IntegridadEstado, "no_aplica">;
  secciones: IntegridadSeccionesDTO;
}

export function obtenerIntegridadRequest(
  id: number,
): Promise<IntegridadEleccionDTO> {
  return getJson<IntegridadEleccionDTO>(
    `/api/admin/elecciones/${id}/integridad`,
  );
}

/**
 * GET /api/admin/elecciones/:id/participacion/descargar: CSV del padrón
 * cruzado contra quién votó en esta elección (ver admin.service.ts,
 * descargarParticipacionEleccionCsv). 409 si la elección todavía no
 * finalizó — llega como `ApiError`, no como Blob.
 */
export function descargarParticipacionEleccionRequest(id: number): Promise<Blob> {
  return getBlob(`/api/admin/elecciones/${id}/participacion/descargar`);
}
