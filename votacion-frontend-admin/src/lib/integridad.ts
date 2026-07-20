import type {
  IntegridadEstado,
  IntegridadSeccionesDTO,
} from "@/lib/api/elecciones";

/** Orden fijo de las 4 secciones en pantalla (ver IntegridadSeccionesDTO). */
export const SECCION_ORDEN: (keyof IntegridadSeccionesDTO)[] = [
  "eleccion",
  "listas",
  "resultados",
  "participacion",
];

export const SECCION_TITULOS: Record<keyof IntegridadSeccionesDTO, string> = {
  eleccion: "Elección",
  listas: "Listas",
  resultados: "Resultados",
  participacion: "Participación",
};

/** Pill de estado por sección: fondo, color de texto/punto y etiqueta. */
export const ESTADO_SECCION_META: Record<
  IntegridadEstado,
  { label: string; bg: string; color: string }
> = {
  verificada: { label: "VERIFICADA", bg: "#e6f6ee", color: "#1e9e5c" },
  discrepancias: { label: "DISCREPANCIAS", bg: "#fdecec", color: "#c23b3b" },
  con_advertencias: {
    label: "ADVERTENCIAS",
    bg: "#fff4e5",
    color: "#c9821a",
  },
  no_aplica: { label: "NO APLICA", bg: "#eef1f5", color: "#9aa7b3" },
};

/** Banner global de arriba de la pantalla: solo 3 de los 4 estados posibles (nunca "no_aplica" a nivel global). */
export const GLOBAL_BANNER_META: Record<
  Exclude<IntegridadEstado, "no_aplica">,
  {
    bg: string;
    border: string;
    iconBg: string;
    titleColor: string;
    textColor: string;
    titulo: string;
    texto: string;
  }
> = {
  verificada: {
    bg: "#e6f6ee",
    border: "#c8ecd8",
    iconBg: "#d2f2e0",
    titleColor: "#146b3b",
    textColor: "#1e9e5c",
    titulo: "Elección verificada",
    texto:
      "Todos los datos de la elección coinciden entre la base de datos y la blockchain.",
  },
  discrepancias: {
    bg: "#fdecec",
    border: "#f6c6c6",
    iconBg: "#fbdada",
    titleColor: "#9c2b2b",
    textColor: "#a83d3d",
    titulo: "Se encontraron discrepancias",
    texto:
      "Algunos datos no coinciden entre la base de datos y la blockchain. Revisá el detalle por sección.",
  },
  con_advertencias: {
    bg: "#fff4e5",
    border: "#f6d9a8",
    iconBg: "#fbe8c2",
    titleColor: "#8a5a10",
    textColor: "#9c6a1f",
    titulo: "Verificada con advertencias",
    texto:
      "No se encontraron discrepancias, pero algunos datos no se pudieron comparar directamente contra la blockchain.",
  },
};

const CAMPO_LABELS: Record<string, string> = {
  "Contrato desplegado (código presente en la address)":
    "Contrato Desplegado (código presente en la address)",
  nombre: "Nombre",
  "fecha_inicio (unix)": "Fecha Inicio (unix)",
  "fecha_cierre (unix)": "Fecha Cierre (unix)",
  cantidad_listas: "Cantidad de Listas",
  total_votos: "Total de Votos",
  "cantidad_participaciones vs. total de votos en el contrato":
    "Cantidad de Participaciones vs. Total de Votos en el Contrato",
};

const RE_LISTA_NOMBRE = /^lista\[(\d+)\]\.nombre$/;
const RE_VOTOS_LISTA = /^votos\["(.+)"\] \(índice (\d+)\)$/;
const RE_YA_VOTO = /^yaVotoEstaPersona — participación #(\d+)$/;

/**
 * Traduce el `campo` técnico que devuelve el backend (ver admin.service.ts,
 * verificarIntegridadEleccion: construirSeccionEleccion/Listas/Resultados/
 * Participacion) a un texto legible. Los campos dinámicos se arman con
 * regex sobre los mismos template literals que arma el backend — si esos
 * templates cambian ahí, hay que actualizar los regex acá.
 */
export function formatCampoIntegridad(raw: string): string {
  const label = CAMPO_LABELS[raw];
  if (label) return label;

  if (raw.startsWith("Consistencia interna")) {
    return "Consistencia Interna: Estado vs. Fechas";
  }

  const lista = raw.match(RE_LISTA_NOMBRE);
  if (lista) return `Nombre Lista índice ${lista[1]}`;

  const votos = raw.match(RE_VOTOS_LISTA);
  if (votos) return `Votos "${votos[1]}" (índice ${votos[2]})`;

  const yaVoto = raw.match(RE_YA_VOTO);
  if (yaVoto) return `¿Ya Votó Esta Persona? — Participación #${yaVoto[1]}`;

  return raw;
}

/** "—" para null/undefined, "true"/"false" para booleanos, el resto tal cual. */
export function formatValorIntegridad(
  valor: string | number | boolean | null | undefined,
): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "boolean") return valor ? "true" : "false";
  return String(valor);
}
