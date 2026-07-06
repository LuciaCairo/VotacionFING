import { getJson } from "./http";

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
      return `/admin/elecciones/${id}/integridad`;
    case "finalizada":
      return `/admin/elecciones/${id}/resultados`;
  }
}
