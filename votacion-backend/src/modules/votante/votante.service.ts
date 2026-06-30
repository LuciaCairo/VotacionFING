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

// ─── Helper: extracción de motivo de revert (ethers v6) ──────
// ethers v6 expone el motivo del revert en distintos lugares según la versión
// del nodo y el tipo de error. La jerarquía de búsqueda es:
//   1. err.reason          → string decodificado más limpio (disponible si el ABI matchea)
//   2. err.shortMessage    → puede traer "execution reverted: <motivo>"
//   3. err.info.error.message → fallback para nodos que devuelven el mensaje en el payload JSON
function extraerMotivoRevert(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const e = err as Record<string, unknown>;

  if (typeof e.reason === 'string' && e.reason.length > 0) return e.reason;

  for (const campo of ['shortMessage', 'message'] as const) {
    if (typeof e[campo] === 'string') {
      const m = (e[campo] as string).match(/execution reverted:\s*"?([^"]+)"?\s*$/i);
      if (m) return m[1].trim();
    }
  }

  const infoErr = (e.info as Record<string, unknown> | undefined)
    ?.error as Record<string, unknown> | undefined;
  if (typeof infoErr?.message === 'string') {
    const m = infoErr.message.match(/execution reverted:\s*"?([^"]+)"?\s*$/i);
    if (m) return m[1].trim();
  }

  return '';
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
    const esRevert = (err as { code?: string })?.code === 'CALL_EXCEPTION';

    if (esRevert) {
      // Revert del contrato: no reintentable. Mapeamos los mensajes conocidos.
      const motivo = extraerMotivoRevert(err);

      if (motivo.includes('ya voto')) {
        // BFA detectó doble voto aunque PARTICIPACION no lo tenía (inconsistencia o race).
        logger.warn({ eleccionId }, 'BFA: doble voto detectado por el contrato');
        throw new ConflictoError('Ya emitiste tu voto en esta elección.');
      }
      if (motivo.includes('todavia no empezo')) {
        logger.warn({ eleccionId }, 'BFA: revert — elección aún no abierta según contrato');
        throw new ConflictoError('La elección todavía no está abierta para votar.');
      }
      if (motivo.includes('ya termino')) {
        logger.warn({ eleccionId }, 'BFA: revert — elección finalizada según contrato');
        throw new ConflictoError('La elección ya finalizó.');
      }
      if (motivo.includes('Lista invalida')) {
        logger.warn({ eleccionId }, 'BFA: revert — índice de lista inválido según contrato');
        throw new ValidacionError('El índice de lista no es válido para esta elección.');
      }
      if (motivo.includes('backend autorizado')) {
        // Problema de configuración: la clave del backend no coincide con la registrada en el contrato.
        logger.error({ err, eleccionId }, 'BFA: revert — backend no autorizado (CRÍTICO: revisar BACKEND_PRIVATE_KEY)');
        throw new InternoError('Error de configuración del sistema de votación.');
      }

      // Revert con motivo desconocido: loguear para investigar.
      logger.error({ err, eleccionId, motivo }, 'BFA: revert desconocido del contrato');
      throw new InternoError(
        'No se pudo registrar el voto en la blockchain. Podés intentar nuevamente.',
      );
    }

    // Error de infraestructura (red, timeout, gas, nonce, provider): reintentable.
    logger.error({ err, eleccionId }, 'BFA: error de infraestructura al registrar voto');
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
