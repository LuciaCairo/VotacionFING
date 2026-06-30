import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
  ConflictoError,
  InternoError,
  NoEncontradoError,
  ProhibidoError,
  ValidacionError,
} from '../../utils/errors.js';
import { hashVotante, registrarVoto } from '../../services/blockchain.service.js';
import { registrarLog } from '../../services/log.service.js';

// ─── GET /api/votante/elecciones/:id ─────────────────────────

/**
 * Devuelve el detalle de una elección con todas sus listas ordenadas por
 * índice (igual que en el contrato). Solo visible si está publicada o
 * finalizada — las elecciones en estado creada devuelven 404.
 * Incluye ya_voto por consistencia con /vigentes.
 */
export async function obtenerDetalleEleccion(eleccionId: number, votanteId: number) {
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      fechaCierre: true,
      estado: true,
      listas: {
        orderBy: { indice: 'asc' },
        select: { id: true, nombre: true, esBlanco: true, indice: true, color: true },
      },
    },
  });

  if (!eleccion || eleccion.estado === 'creada') {
    throw new NoEncontradoError('La elección no existe o no está disponible.');
  }

  const participacion = await prisma.participacion.findUnique({
    where: {
      uq_participacion_votante_eleccion: { idVotante: votanteId, idEleccion: eleccionId },
    },
    select: { id: true },
  });

  return {
    id: eleccion.id,
    nombre: eleccion.nombre,
    fecha_inicio: eleccion.fechaInicio.toISOString(),
    fecha_cierre: eleccion.fechaCierre.toISOString(),
    estado: eleccion.estado,
    ya_voto: participacion !== null,
    listas: eleccion.listas.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      es_blanco: l.esBlanco,
      indice: l.indice,
      color: l.color,
    })),
  };
}

// ─── GET /api/votante/elecciones/vigentes ────────────────────

/**
 * Devuelve las elecciones que el votante puede ver en este momento.
 * Criterio defensivo: estado publicada Y fecha actual dentro del rango,
 * por si el job de transición automática no corrió aún.
 *
 * ya_voto se calcula desde PARTICIPACION en BD — no consulta BFA —
 * y solo indica si el votante participó; nunca revela por qué lista.
 *
 * Se evita N+1 con dos queries: una para elecciones vigentes y otra
 * para todas las participaciones de este votante en esas elecciones.
 */
export async function obtenerEleccionesVigentes(votanteId: number) {
  const ahora = new Date();

  const elecciones = await prisma.eleccion.findMany({
    where: {
      estado: 'publicada',
      fechaInicio: { lte: ahora },
      fechaCierre: { gte: ahora },
    },
    orderBy: { fechaCierre: 'asc' }, // las que cierran antes, primero
    select: { id: true, nombre: true, fechaInicio: true, fechaCierre: true },
  });

  if (elecciones.length === 0) {
    return { vigentes: [] };
  }

  const participaciones = await prisma.participacion.findMany({
    where: {
      idVotante: votanteId,
      idEleccion: { in: elecciones.map((e) => e.id) },
    },
    select: { idEleccion: true },
  });

  const yaVotoSet = new Set(participaciones.map((p) => p.idEleccion));

  return {
    vigentes: elecciones.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      fecha_inicio: e.fechaInicio.toISOString(),
      fecha_cierre: e.fechaCierre.toISOString(),
      ya_voto: yaVotoSet.has(e.id),
    })),
  };
}

// ─── POST /api/votante/elecciones/:id/votar ───────────────────

/**
 * Emite el voto del votante en la elección indicada.
 *
 * Orden de validaciones (según especificación HU-06):
 *   1. Elección existe y está activa (publicada + dentro de fechas).
 *   2. Votante está en el padrón y está activo.
 *   3. Votante no votó ya en esta elección (PARTICIPACION).
 *   4. indice_lista es válido para la elección.
 *
 * Lógica de emisión:
 *   - Calcula hashVotante = keccak256(legajo + idEleccion + SALT_SECRETO).
 *   - Llama al contrato en BFA: votar(indice_lista, hashVotante).
 *   - Solo si BFA confirma la TX, registra PARTICIPACION en BD.
 *   - Nunca almacena la lista elegida; preserva el anonimato.
 *
 * Condición de carrera: el contrato rechaza hashes duplicados con
 * require(!yaVoto[hash]). A nivel BD, UNIQUE(idVotante, idEleccion)
 * en PARTICIPACION es la segunda barrera. Ambas errores se traducen
 * a 409 para que el votante no quede en estado de error indefinido.
 */
export async function emitirVoto(
  eleccionId: number,
  votanteId: number,
  indiceLista: number,
  ip: string | null,
) {
  // ── 1. Elección activa ───────────────────────────────────────
  const eleccion = await prisma.eleccion.findUnique({
    where: { id: eleccionId },
    select: {
      id: true,
      estado: true,
      fechaInicio: true,
      fechaCierre: true,
      contratoAddress: true,
      listas: {
        where: { indice: indiceLista },
        select: { id: true },
      },
    },
  });

  if (!eleccion) {
    throw new NoEncontradoError('La elección no existe.');
  }

  const ahora = new Date();
  if (
    eleccion.estado !== 'publicada' ||
    ahora < eleccion.fechaInicio ||
    ahora > eleccion.fechaCierre
  ) {
    throw new ConflictoError('No se puede votar: la elección no está activa en este momento.');
  }

  // Defensivo: una elección publicada siempre debería tener contrato desplegado.
  if (!eleccion.contratoAddress) {
    throw new InternoError('La elección no tiene contrato desplegado en BFA.');
  }

  // ── 2. Índice de lista válido ────────────────────────────────
  // Se valida antes del padrón/participación: es un error de input del request
  // y debe devolver 400 sin revelar estado del votante.
  if (eleccion.listas.length === 0) {
    throw new ValidacionError('El índice de lista no es válido para esta elección.');
  }

  // ── 3. Votante en el padrón ──────────────────────────────────
  const votante = await prisma.votante.findUnique({
    where: { id: votanteId },
    select: { id: true, legajo: true, activo: true },
  });

  if (!votante || !votante.activo) {
    throw new ProhibidoError('No estás habilitado para votar en esta elección.');
  }

  // ── 4. No votó todavía ───────────────────────────────────────
  const participacionExistente = await prisma.participacion.findUnique({
    where: {
      uq_participacion_votante_eleccion: { idVotante: votanteId, idEleccion: eleccionId },
    },
    select: { id: true },
  });

  if (participacionExistente) {
    throw new ConflictoError('Ya emitiste tu voto en esta elección.');
  }

  // ── 5. Hash anónimo del votante ──────────────────────────────
  // keccak256(legajo + idEleccion + SALT_SECRETO): incluir el id de la elección
  // garantiza que el mismo votante genera un hash distinto en cada elección,
  // impidiendo correlacionar comportamiento entre elecciones (ataque de correlación).
  // Sigue siendo determinístico dentro de la elección para que el contrato
  // detecte el doble voto con require(!yaVoto[hash]).
  const hash = hashVotante(votante.legajo, eleccionId);

  // ── 6. Emitir voto en BFA ────────────────────────────────────
  // Si falla, el votante NO queda marcado como que votó; puede reintentar.
  let txHash: string;
  try {
    const resultado = await registrarVoto({
      contratoAddress: eleccion.contratoAddress,
      idLista: indiceLista,
      hash,
    });
    txHash = resultado.txHash;
  } catch (err) {
    logger.error({ err, eleccionId }, 'Fallo el registro del voto en BFA');
    throw new InternoError(
      'No se pudo registrar el voto en la blockchain. Podés intentar nuevamente.',
    );
  }

  // ── 7. Registrar participación en BD ─────────────────────────
  // Solo se ejecuta si BFA confirmó la transacción.
  // NUNCA se guarda la lista elegida — solo quién participó y cuándo.
  try {
    await prisma.participacion.create({
      data: {
        idVotante: votanteId,
        idEleccion: eleccionId,
        hashBlockchain: hash,
        txHash,
      },
    });
  } catch (err) {
    // P2002 = violación de UNIQUE(idVotante, idEleccion): race condition resuelta.
    if ((err as { code?: string })?.code === 'P2002') {
      throw new ConflictoError('Ya emitiste tu voto en esta elección.');
    }
    // El voto quedó en BFA pero no se pudo guardar el comprobante en BD.
    logger.error({ err, eleccionId, txHash }, 'Fallo al registrar participacion en BD post-BFA');
    throw new InternoError(
      'El voto quedó registrado en la blockchain, pero hubo un error al guardar el comprobante. Contactá a soporte con el tx_hash.',
    );
  }

  // ── 8. Log de auditoría ──────────────────────────────────────
  // Solo registra que hubo un voto en la elección; nunca la lista elegida.
  void registrarLog({
    tipoEvento: 'voto_emitido',
    rolUsuario: 'votante',
    idUsuario: votanteId,
    descripcion: `Voto registrado en elección ${eleccionId}`,
    ip,
  });

  return {
    mensaje: 'Voto registrado correctamente',
    comprobante: txHash,
    tx_hash: txHash,
  };
}
