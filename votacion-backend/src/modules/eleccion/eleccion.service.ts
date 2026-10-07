import { ethers } from 'ethers';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import {
  ConflictoError,
  NoEncontradoError,
  ServicioNoDisponibleError,
} from '../../utils/errors.js';
import {
  contratoTieneCodigo,
  esWalletDelBackend,
  nombreRedBfa,
  obtenerBackendAutorizado,
  obtenerCantidadListas,
  obtenerListaPorIndice,
  obtenerNumeroDeBloque,
  obtenerVotos,
} from '../../services/blockchain.service.js';

/** Redondea a 2 decimales (evita arrastrar el error de punto flotante). */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Los resultados (y su verificación) solo existen para elecciones
 * finalizadas cuyo snapshot ya se tomó.
 */
function exigirResultadosDisponibles(
  eleccion: { estado: string; snapshotAt: Date | null } | null,
): asserts eleccion is { estado: string; snapshotAt: Date } {
  if (!eleccion) {
    throw new NoEncontradoError('La elección no existe.');
  }
  if (eleccion.estado !== 'finalizada') {
    throw new ConflictoError('Los resultados solo están disponibles para elecciones finalizadas.');
  }
  if (!eleccion.snapshotAt) {
    throw new ConflictoError('Los resultados se están procesando, intentá en unos minutos.');
  }
}

/** Dónde vive la elección en BFA: lo que hace falta para verificarla sin este sistema. */
function datosBlockchain(contratoAddress: string | null) {
  return {
    red: nombreRedBfa(),
    chain_id: env.BFA_CHAIN_ID,
    contrato_address: contratoAddress,
  };
}

// ─── GET /api/elecciones/:id/resultados ──────────────────────

/**
 * Devuelve los resultados de una elección finalizada, leídos del snapshot
 * en BD (tabla RESULTADO + campos de snapshot en ELECCION) — nunca de BFA.
 * Estrategia híbrida de resultados (ver README del backend).
 *
 * Endpoint compartido: cualquier usuario autenticado (admin o votante)
 * puede acceder, sin distinción de rol.
 *
 * Incluye `blockchain` (red, chainId y dirección del contrato) para que
 * cualquiera pueda contrastar estos números directamente contra BFA, sin
 * depender de este sistema (ver también verificarResultadosEnBfa).
 */
export async function obtenerResultados(eleccionId: number) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      fechaCierre: true,
      estado: true,
      snapshotAt: true,
      totalPadron: true,
      contratoAddress: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: {
          id: true,
          nombre: true,
          esBlanco: true,
          indice: true,
          color: true,
          resultados: { select: { votos: true } },
        },
      },
    },
  });

  exigirResultadosDisponibles(eleccion);

  // Cruza cada lista con su fila de RESULTADO (0 si faltara, defensivo) y
  // deriva total/ganador/empate de estos votos en vez de los campos
  // cacheados en Eleccion (totalVotos, resultadoTipo, idListaGanadora):
  // así la respuesta es siempre internamente consistente aunque ese
  // cache haya quedado desactualizado o incompleto por algún motivo.
  const listasConVotos = eleccion.listas.map((l) => ({
    nombre: l.nombre,
    esBlanco: l.esBlanco,
    indice: l.indice,
    color: l.color,
    votos: l.resultados[0]?.votos ?? 0,
  }));

  const totalVotos = listasConVotos.reduce((acc, l) => acc + l.votos, 0);

  const listas = listasConVotos.map((l) => ({
    nombre: l.nombre,
    es_blanco: l.esBlanco,
    indice: l.indice,
    color: l.color,
    votos: l.votos,
    porcentaje: totalVotos > 0 ? redondear((l.votos / totalVotos) * 100) : 0,
  }));

  // Congelado al tomar el snapshot (ver tomarSnapshotResultados en
  // eleccion.job.ts) — no se recalcula en vivo contra el padron actual, que
  // cambia con cada recarga semestral y rompería la inmutabilidad de una
  // elección ya finalizada. El fallback en vivo solo cubre elecciones
  // finalizadas antes de que este campo existiera (totalPadron = null).
  const totalPadron = eleccion.totalPadron ?? (await prisma.votante.count({ where: { activo: true } }));

  const participacion = {
    total_votos: totalVotos,
    total_padron: totalPadron,
    porcentaje: totalPadron > 0 ? redondear((totalVotos / totalPadron) * 100) : 0,
  };

  const maxVotos = Math.max(...listasConVotos.map((l) => l.votos));
  const listasConMax = listasConVotos.filter((l) => l.votos === maxVotos);

  const resultado: {
    tipo: 'ganador_unico' | 'empate';
    lista_ganadora?: { nombre: string; votos: number };
    listas_empatadas?: { nombre: string; votos: number }[];
  } = { tipo: listasConMax.length === 1 ? 'ganador_unico' : 'empate' };

  if (resultado.tipo === 'ganador_unico') {
    resultado.lista_ganadora = { nombre: listasConMax[0].nombre, votos: listasConMax[0].votos };
  } else {
    resultado.listas_empatadas = listasConMax.map((l) => ({ nombre: l.nombre, votos: l.votos }));
  }

  return {
    id: eleccion.id,
    nombre: eleccion.nombre,
    fecha_inicio: eleccion.fechaInicio.toISOString(),
    fecha_cierre: eleccion.fechaCierre.toISOString(),
    listas,
    total_votos: totalVotos,
    participacion,
    resultado,
    snapshot_at: eleccion.snapshotAt.toISOString(),
    blockchain: datosBlockchain(eleccion.contratoAddress),
  };
}

// ─── GET /api/elecciones/:id/verificacion ────────────────────

/**
 * Compara en vivo los resultados publicados (snapshot en BD) contra lo que
 * registra el contrato de la elección en BFA: nombre y votos de cada lista,
 * índice por índice, y que el contrato sea de este sistema (su `backend()`,
 * la única cuenta que puede votar, es la wallet del backend). Pensado para
 * que cualquier usuario autenticado, no solo el admin, pueda auditar los
 * resultados.
 *
 * Es una comodidad, no una prueba independiente: la lectura la hace este
 * backend. Para no depender de él, `blockchain` trae lo necesario para
 * consultar el contrato directamente (obtenerTodosLosVotos()).
 *
 * Si BFA no responde, 503 — nunca se informa "coincide" sin haber leído la
 * cadena. Un contrato sin código en la dirección registrada sí es una
 * respuesta válida de BFA y se informa como que no coincide.
 */
export async function verificarResultadosEnBfa(eleccionId: number) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      estado: true,
      snapshotAt: true,
      contratoAddress: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: { nombre: true, indice: true, resultados: { select: { votos: true } } },
      },
    },
  });

  exigirResultadosDisponibles(eleccion);

  const address = eleccion.contratoAddress;
  if (!address || !ethers.isAddress(address)) {
    throw new ConflictoError(
      'La elección no tiene registrada una dirección de contrato válida; no se puede verificar contra BFA.',
    );
  }

  let bloque: number;
  let tieneCodigo: boolean;
  let votosContrato: number[] = [];
  let nombresContrato: string[] = [];
  let backendContrato: string | null = null;
  try {
    [bloque, tieneCodigo] = await Promise.all([obtenerNumeroDeBloque(), contratoTieneCodigo(address)]);
    if (tieneCodigo) {
      const cantidad = await obtenerCantidadListas(address);
      [votosContrato, nombresContrato, backendContrato] = await Promise.all([
        obtenerVotos(address),
        Promise.all(Array.from({ length: cantidad }, (_, i) => obtenerListaPorIndice(address, i))),
        obtenerBackendAutorizado(address),
      ]);
    }
  } catch (err) {
    logger.error({ err, eleccionId }, 'No se pudo leer BFA para verificar resultados');
    throw new ServicioNoDisponibleError(
      'No se pudo conectar a la blockchain (BFA) para verificar los resultados. Intentá nuevamente en unos minutos.',
    );
  }

  const cantidadIndices = Math.max(eleccion.listas.length, nombresContrato.length);
  const listas = Array.from({ length: cantidadIndices }, (_, indice) => {
    const listaBd = eleccion.listas.find((l) => l.indice === indice);
    // Sin fila en RESULTADO no hay un número publicado que comparar: null
    // (discrepancia), como en la integridad del admin — no 0, que podría
    // "coincidir" con una lista sin votos en el contrato.
    const votosPublicados = listaBd?.resultados[0]?.votos ?? null;
    const nombreContrato = nombresContrato[indice] ?? null;
    const votosEnContrato = votosContrato[indice] ?? null;
    return {
      indice,
      nombre: listaBd?.nombre ?? null,
      nombre_contrato: nombreContrato,
      votos_publicados: votosPublicados,
      votos_contrato: votosEnContrato,
      coincide:
        listaBd !== undefined &&
        listaBd.nombre === nombreContrato &&
        votosPublicados !== null &&
        votosPublicados === votosEnContrato,
    };
  });

  const backendCoincide = backendContrato !== null && esWalletDelBackend(backendContrato);

  return {
    ...datosBlockchain(address),
    contrato_con_codigo: tieneCodigo,
    backend_esperado: env.BACKEND_ADDRESS,
    backend_contrato: backendContrato,
    backend_coincide: backendCoincide,
    bloque,
    verificado_at: new Date().toISOString(),
    coincide: tieneCodigo && backendCoincide && listas.every((l) => l.coincide),
    listas,
  };
}
