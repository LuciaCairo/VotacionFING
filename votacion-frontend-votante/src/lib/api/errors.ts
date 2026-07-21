/** Error HTTP con respuesta del backend (status + mensaje ya extraído de `{ error }`). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Fetch nunca llegó a tener respuesta: sin red, DNS, timeout, backend caído, CORS, etc. */
export class NetworkError extends Error {
  constructor(message = "No pudimos comunicarnos con el servidor.") {
    super(message);
    this.name = "NetworkError";
  }
}
