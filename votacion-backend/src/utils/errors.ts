/**
 * Errores de dominio. Cada uno lleva su codigo HTTP y un mensaje
 * pensado para mostrarse al usuario final (en espanol, sin filtrar
 * detalles internos). El error handler global los traduce a la
 * respuesta JSON { error: mensaje }.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    /** Datos extra opcionales que se incluyen en la respuesta (ej: comprobante). */
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — datos de entrada invalidos. */
export class ValidacionError extends AppError {
  constructor(mensaje = 'Datos invalidos', extra?: Record<string, unknown>) {
    super(400, mensaje, extra);
  }
}

/** 401 — no autenticado o credenciales incorrectas. */
export class NoAutenticadoError extends AppError {
  constructor(mensaje = 'Credenciales incorrectas') {
    super(401, mensaje);
  }
}

/** 403 — autenticado pero sin permisos / accion no permitida. */
export class ProhibidoError extends AppError {
  constructor(mensaje = 'No tenes permisos para realizar esta accion', extra?: Record<string, unknown>) {
    super(403, mensaje, extra);
  }
}

/** 404 — recurso no encontrado. */
export class NoEncontradoError extends AppError {
  constructor(mensaje = 'Recurso no encontrado') {
    super(404, mensaje);
  }
}

/** 409 — conflicto (ej: voto duplicado). */
export class ConflictoError extends AppError {
  constructor(mensaje = 'Conflicto', extra?: Record<string, unknown>) {
    super(409, mensaje, extra);
  }
}

/** 500 — error interno (blockchain, etc). */
export class InternoError extends AppError {
  constructor(mensaje = 'Error interno del servidor') {
    super(500, mensaje);
  }
}
