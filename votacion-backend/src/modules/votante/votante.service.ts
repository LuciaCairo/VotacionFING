import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import {
  type AppError,
  ConflictoError,
  InternoError,
  NoEncontradoError,
  ProhibidoError,
  ServicioNoDisponibleError,
  ValidacionError,
} from '../../utils/errors.js';
import { formatFechaLocal } from '../../utils/fecha.js';
import {
  generarHashVoto,
  registrarVoto,
  verificarContratoDeEleccion,
  yaVotoEnContrato,
} from '../../services/blockchain.service.js';
import { registrarLog } from '../../services/log.service.js';

// ─── GET /api/votante/elecciones/:id ─────────────────────────

/**
 * Devuelve el detalle de una elección con todas sus listas ordenadas por
 * índice (igual que en el contrato). Solo visible si está publicada o
 * finalizada — las elecciones en estado creada devuelven 404.
 * Incluye ya_voto por consistencia con /vigentes. Una participación que
 * todavía no se confirmó en BFA (hashPendiente != null) no cuenta como
 * ya_voto: así el votante puede reintentar (ver emitirVoto).
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
    select: { hashPendiente: true },
  });

  return {
    id: eleccion.id,
    nombre: eleccion.nombre,
    fecha_inicio: eleccion.fechaInicio.toISOString(),
    fecha_cierre: eleccion.fechaCierre.toISOString(),
    estado: eleccion.estado,
    ya_voto: participacion !== null && participacion.hashPendiente === null,
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
      hashPendiente: null, // solo confirmadas, igual que en obtenerDetalleEleccion
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

// ─── GET /api/votante/elecciones/finalizadas ─────────────────

/**
 * Listado liviano de elecciones finalizadas con un resumen del resultado
 * (sin desglose de votos por lista — eso lo da GET /api/elecciones/:id/resultados).
 *
 * Si el snapshot todavía no se generó (snapshotAt = null) o quedó
 * incompleto (algún campo del snapshot en null pese a tener snapshotAt,
 * o la lista ganadora no se puede resolver), el resultado se marca como
 * "pendiente" en vez de romper el listado o mostrar datos parciales.
 */
export async function obtenerEleccionesFinalizadas() {
  const elecciones = await prisma.eleccion.findMany({
    where: { estado: 'finalizada' },
    orderBy: { fechaCierre: 'desc' },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      fechaCierre: true,
      totalVotos: true,
      resultadoTipo: true,
      idListaGanadora: true,
      snapshotAt: true,
      listas: { select: { id: true, nombre: true } },
    },
  });

  return {
    finalizadas: elecciones.map((e) => {
      const base = {
        id: e.id,
        nombre: e.nombre,
        fecha_inicio: e.fechaInicio.toISOString(),
        fecha_cierre: e.fechaCierre.toISOString(),
      };

      const listaGanadora =
        e.resultadoTipo === 'ganador_unico'
          ? e.listas.find((l) => l.id === e.idListaGanadora)?.nombre
          : undefined;

      const snapshotIncompleto =
        !e.snapshotAt ||
        e.totalVotos === null ||
        e.resultadoTipo === null ||
        (e.resultadoTipo === 'ganador_unico' && !listaGanadora);

      if (snapshotIncompleto) {
        return { ...base, total_votos: null, resultado: { tipo: 'pendiente' as const } };
      }

      return {
        ...base,
        total_votos: e.totalVotos,
        resultado:
          e.resultadoTipo === 'ganador_unico'
            ? { tipo: 'ganador_unico' as const, lista_ganadora: listaGanadora as string }
            : { tipo: 'empate' as const },
      };
    }),
  };
}

// ─── GET /api/votante/elecciones/:id/comprobante ─────────────

/**
 * Devuelve la constancia de participación del votante en la elección (HU-07).
 *
 * Es solo eso: elección y día del voto. A propósito no incluye el tx hash ni
 * el hash del voto — cualquier dato que permita encontrar la transacción en
 * BFA permite leer la lista elegida (va en claro en la transacción), y con eso
 * el votante podría demostrarle a un tercero a quién votó (venta o coacción
 * del voto). Por el mismo motivo la fecha va sin hora (ver formatFechaLocal):
 * con pocos votos por minuto, la hora del voto alcanza para encontrar su
 * transacción por la hora del bloque.
 */
export async function obtenerComprobante(eleccionId: number, votanteId: number) {
  const participacion = await prisma.participacion.findUnique({
    where: {
      uq_participacion_votante_eleccion: { idVotante: votanteId, idEleccion: eleccionId },
    },
    select: {
      hashPendiente: true,
      fechaVoto: true,
      eleccion: { select: { nombre: true } },
    },
  });

  if (!participacion || participacion.hashPendiente !== null) {
    throw new NoEncontradoError('No tenés un comprobante para esta elección.');
  }

  return {
    eleccion: participacion.eleccion.nombre,
    fecha_voto: formatFechaLocal(participacion.fechaVoto),
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

// ─── Helper: rechazos del contrato por reglas de validación ──
// Con estos motivos el contrato rechazó el voto (no entró a la cadena) y
// reintentar daría lo mismo. Devuelve null para cualquier otro motivo —
// incluido "ya voto", que no es un rechazo definitivo sino una señal de que
// otro envío con el mismo hash ya entró (ver emitirVoto).
function errorPorRechazoDelContrato(
  motivo: string,
  err: unknown,
  eleccionId: number,
): AppError | null {
  if (motivo.includes('todavia no empezo')) {
    logger.warn({ eleccionId }, 'BFA: revert — elección aún no abierta según contrato');
    return new ConflictoError('La elección todavía no está abierta para votar.');
  }
  if (motivo.includes('ya termino')) {
    logger.warn({ eleccionId }, 'BFA: revert — elección finalizada según contrato');
    return new ConflictoError('La elección ya finalizó.');
  }
  if (motivo.includes('Lista invalida')) {
    logger.warn({ eleccionId }, 'BFA: revert — índice de lista inválido según contrato');
    return new ValidacionError('El índice de lista no es válido para esta elección.');
  }
  if (motivo.includes('backend autorizado')) {
    // Problema de configuración: la clave del backend no coincide con la registrada en el contrato.
    logger.error({ err, eleccionId }, 'BFA: revert — backend no autorizado (CRÍTICO: revisar BACKEND_PRIVATE_KEY)');
    return new InternoError('Error de configuración del sistema de votación.');
  }
  return null;
}

// ─── Helper: reserva y confirmación de la participación ──────

interface ReservaParticipacion {
  id: number;
  /** Hash aleatorio con el que se envía el voto (ver generarHashVoto). */
  hash: string;
  /** false = se retomó la reserva de un intento anterior que quedó sin confirmar. */
  creadaAhora: boolean;
}

/**
 * Reserva la participación del votante ANTES de enviar el voto a BFA.
 *
 * Con hashes aleatorios el contrato ya no puede saber que dos votos son de
 * la misma persona, así que el doble voto lo frena el UNIQUE(idVotante,
 * idEleccion) de PARTICIPACION: dos pedidos simultáneos no pueden crear dos
 * reservas.
 *
 * Si ya hay una reserva sin confirmar (un intento anterior falló sin que se
 * sepa si el voto entró), se retoma con su mismo hash: si aquel voto había
 * entrado, el contrato rechaza este con "ya voto" en vez de contar dos.
 */
async function reservarParticipacion(
  votanteId: number,
  eleccionId: number,
): Promise<ReservaParticipacion> {
  const clave = {
    uq_participacion_votante_eleccion: { idVotante: votanteId, idEleccion: eleccionId },
  };

  const retomar = (p: { id: number; hashPendiente: string | null }): ReservaParticipacion => {
    if (p.hashPendiente === null) {
      throw new ConflictoError('Ya emitiste tu voto en esta elección.');
    }
    return { id: p.id, hash: p.hashPendiente, creadaAhora: false };
  };

  const existente = await prisma.participacion.findUnique({
    where: clave,
    select: { id: true, hashPendiente: true },
  });
  if (existente) return retomar(existente);

  const hash = generarHashVoto();
  try {
    const creada = await prisma.participacion.create({
      data: { idVotante: votanteId, idEleccion: eleccionId, hashPendiente: hash },
      select: { id: true },
    });
    return { id: creada.id, hash, creadaAhora: true };
  } catch (err) {
    if ((err as { code?: string })?.code !== 'P2002') throw err;
    // Otro pedido del mismo votante reservó entre la lectura y el create
    // (doble clic): se retoma esa reserva.
    const otra = await prisma.participacion.findUnique({
      where: clave,
      select: { id: true, hashPendiente: true },
    });
    if (!otra) {
      throw new ConflictoError('Tu voto se está procesando. Recargá la página en unos segundos.');
    }
    return retomar(otra);
  }
}

/**
 * Marca la participación como confirmada borrando el hash. Desde acá la BD
 * solo sabe QUE el votante votó y cuándo — no cuál de las transacciones del
 * contrato es la suya.
 */
async function confirmarParticipacion(id: number): Promise<Date> {
  const confirmada = await prisma.participacion.update({
    where: { id },
    data: { hashPendiente: null },
    select: { fechaVoto: true },
  });
  return confirmada.fechaVoto;
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
 *   5. La address guardada es el contrato de esta elección (ver
 *      verificarContratoDeEleccion): si no, no se toca ni la BD ni BFA.
 *
 * Lógica de emisión (anonimato del voto):
 *   - Reserva PARTICIPACION con un hash aleatorio (ver reservarParticipacion).
 *   - Llama al contrato en BFA: votar(indice_lista, hash).
 *   - Al confirmarse, borra el hash de PARTICIPACION. La transacción lleva la
 *     lista elegida en claro, así que la BD no guarda nada que permita
 *     encontrarla (ni el hash del voto ni el tx hash), y el votante tampoco
 *     recibe ese dato: su constancia es solo de participación.
 *   - Nunca almacena la lista elegida.
 *
 * Doble voto: lo frena el UNIQUE(idVotante, idEleccion) al reservar. Los
 * reintentos reutilizan el hash de la reserva y el contrato rechaza un hash
 * repetido con require(!yaVoto[hash]), así que un reintento nunca suma un
 * segundo voto aunque el intento anterior haya entrado sin que lo supiéramos.
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
      nombre: true,
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
    select: { id: true, activo: true },
  });

  if (!votante || !votante.activo) {
    throw new ProhibidoError('No estás habilitado para votar en esta elección.');
  }

  // ── 4. El contrato es el de esta elección ────────────────────
  // Antes de escribir nada: si la address de la BD no apunta al contrato de
  // esta elección, el voto no se contaría (address sin código) o se contaría
  // en otra elección. Sin conexión con BFA tampoco se reserva nada: no hay
  // ningún envío en duda que reconciliar después.
  let motivoContrato: string | null;
  try {
    motivoContrato = await verificarContratoDeEleccion(eleccion.contratoAddress, {
      nombre: eleccion.nombre,
      fechaAperturaUnix: Math.floor(eleccion.fechaInicio.getTime() / 1000),
      fechaCierreUnix: Math.floor(eleccion.fechaCierre.getTime() / 1000),
    });
  } catch (err) {
    logger.error({ err, eleccionId }, 'BFA: no se pudo verificar el contrato antes de votar');
    throw new ServicioNoDisponibleError(
      'No se pudo conectar a la blockchain (BFA). Tu voto no fue registrado: intentá nuevamente en unos minutos.',
    );
  }
  if (motivoContrato) {
    logger.error(
      { eleccionId, motivo: motivoContrato },
      'El contrato de la elección no coincide: voto rechazado (CRÍTICO: revisar contrato_address)',
    );
    void registrarLog({
      tipoEvento: 'voto_error',
      rolUsuario: 'votante',
      idUsuario: votanteId,
      descripcion: `Voto rechazado en elección ${eleccionId}: ${motivoContrato}. No se envió nada a BFA.`,
      ip,
    });
    throw new InternoError(
      'Error de configuración del sistema de votación: tu voto no fue registrado. Avisá a la administración.',
    );
  }

  // ── 5. Reservar la participación ─────────────────────────────
  // Corta con 409 si ya votó; si no, frena el doble voto antes de tocar BFA
  // (ver reservarParticipacion).
  const reserva = await reservarParticipacion(votanteId, eleccionId);

  // ── 6. Emitir voto en BFA ────────────────────────────────────
  try {
    await registrarVoto({
      contratoAddress: eleccion.contratoAddress,
      idLista: indiceLista,
      hash: reserva.hash,
    });
  } catch (err) {
    const esRevert = (err as { code?: string })?.code === 'CALL_EXCEPTION';
    const motivo = esRevert ? extraerMotivoRevert(err) : '';

    // a) Rechazo por una regla del contrato: el voto no entró y reintentar no
    //    cambia nada. Se libera la reserva para que el votante quede como
    //    "no votó" — salvo que venga de un intento anterior, cuyo envío
    //    podría seguir en camino.
    const rechazo = esRevert ? errorPorRechazoDelContrato(motivo, err, eleccionId) : null;
    if (rechazo) {
      if (reserva.creadaAhora) {
        await prisma.participacion.delete({ where: { id: reserva.id } });
      }
      throw rechazo;
    }

    // b) Resultado incierto: error de red/timeout (la transacción pudo haber
    //    entrado igual), revert sin motivo legible, o "ya voto" (entró otro
    //    envío con este mismo hash: un intento anterior o un doble clic).
    //    Se le pregunta al contrato si el hash quedó registrado.
    let registrado = false;
    try {
      registrado = await yaVotoEnContrato(eleccion.contratoAddress, reserva.hash);
    } catch (errConsulta) {
      logger.error({ err: errConsulta, eleccionId }, 'BFA: no se pudo consultar si el voto quedó registrado');
    }

    if (!registrado && motivo.includes('ya voto')) {
      // El nodo ya tiene en cola (sin minar) otro envío con este hash — un
      // doble clic: estimateGas ve las transacciones pendientes, la consulta
      // de arriba solo el último bloque. Ese otro pedido confirma la
      // participación cuando su transacción entre; esta reserva no se toca.
      logger.warn({ eleccionId }, 'BFA: el hash ya está en camino en otro envío; se rechaza el duplicado');
      throw new ConflictoError('Tu voto ya se está registrando. Recargá la página en unos segundos.');
    }

    if (!registrado) {
      // La reserva queda pendiente con su hash: el reintento lo reutiliza,
      // así que no puede sumar un segundo voto aunque este entre tarde. Si
      // nadie reintenta, se resuelve al cerrar la elección (ver
      // resolverParticipacionesPendientes en eleccion.job.ts).
      logger.error({ err, eleccionId, motivo }, 'BFA: no se pudo confirmar el voto; la reserva queda pendiente');
      void registrarLog({
        tipoEvento: 'voto_error',
        rolUsuario: 'votante',
        idUsuario: votanteId,
        descripcion: `Voto sin confirmar en elección ${eleccionId}: no se pudo verificar si entró a BFA. La participación queda pendiente hasta un reintento o el cierre.`,
        ip,
      });
      throw new InternoError(
        'No se pudo registrar el voto en la blockchain. Podés intentar nuevamente.',
      );
    }

    if (esRevert || !reserva.creadaAhora) {
      // Lo que quedó registrado es otro envío con el mismo hash, no este.
      logger.warn({ eleccionId }, 'BFA: el hash ya estaba registrado; se confirma la participación');
      await confirmarParticipacion(reserva.id);
      throw new ConflictoError('Ya emitiste tu voto en esta elección.');
    }

    // Este mismo envío entró aunque falló la espera de la confirmación: se
    // sigue como un voto exitoso.
    logger.warn({ eleccionId }, 'BFA: el voto entró pese al error al esperar la confirmación');
  }

  // ── 7. Confirmar la participación ────────────────────────────
  let fechaVoto: Date;
  try {
    if (env.devForzarErrorConfirmacion) {
      // Solo desarrollo (DEV_FORZAR_ERROR_CONFIRMACION, ver env.ts): simula
      // que la BD falla justo después de que el voto entró en BFA.
      throw new Error('DEV_FORZAR_ERROR_CONFIRMACION: error forzado al confirmar la participación');
    }
    fechaVoto = await confirmarParticipacion(reserva.id);
  } catch (err) {
    // El voto ya está en BFA. La reserva queda pendiente y se resuelve sola:
    // en un reintento (el contrato responde "ya voto") o al cerrar la elección.
    logger.error({ err, eleccionId }, 'Fallo al confirmar la participación en BD post-BFA');
    // Best-effort: si la BD es lo que está fallando, probablemente esto
    // tampoco se guarde (queda el logger.error de arriba).
    void registrarLog({
      tipoEvento: 'voto_error',
      rolUsuario: 'votante',
      idUsuario: votanteId,
      descripcion: `Voto registrado en BFA en elección ${eleccionId}, pero falló la confirmación en BD. La participación queda pendiente hasta un reintento o el cierre.`,
      ip,
    });
    throw new InternoError(
      'Tu voto quedó registrado en la blockchain, pero hubo un error al guardar tu constancia. Intentá nuevamente en unos minutos: el sistema va a reconocer tu voto sin contarlo dos veces.',
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

  // Constancia de participación: lo mismo que devuelve GET .../comprobante
  // (solo el día, sin hora).
  return {
    mensaje: 'Voto registrado correctamente',
    eleccion: eleccion.nombre,
    fecha_voto: formatFechaLocal(fechaVoto),
  };
}
