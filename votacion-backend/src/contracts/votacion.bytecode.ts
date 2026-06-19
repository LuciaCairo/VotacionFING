/**
 * Bytecode de despliegue del contrato Votacion.sol.
 *
 * ⚠️ IMPORTANTE — completar este valor antes de poder crear elecciones.
 *
 * El bytecode NO se puede generar desde el backend: hay que compilar
 * Votacion.sol con EXACTAMENTE la misma configuracion con la que se
 * desplego en BFA, o el nodo Geth v1.9.22 rechazara la transaccion.
 *
 * Configuracion obligatoria (ver Informe de Despliegue, secciones 6.8–6.10):
 *   - Compilador Solidity: 0.5.4
 *   - EVM target: byzantium
 *   - pragma experimental ABIEncoderV2 habilitado
 *
 * Como obtenerlo (dos opciones):
 *
 *   A) Desde Remix IDE:
 *      1. Cargar Votacion.sol (version 0.5.4).
 *      2. En "Solidity Compiler": Compiler = 0.5.4, EVM Version = byzantium.
 *      3. Compilar y, en la pestania de compilacion, copiar
 *         "Bytecode" -> campo "object" (la cadena hex larga).
 *      4. Pegarla abajo como string con prefijo "0x".
 *
 *   B) Con solc por linea de comandos:
 *      solc --bin --evm-version byzantium Votacion.sol
 *      (usando solc 0.5.4; el .bin resultante es el bytecode).
 *
 * Mientras este placeholder no se reemplace, el deploy fallara de forma
 * controlada con un mensaje claro (ver contrato.service.ts).
 */
export const VOTACION_BYTECODE: string =
  process.env.VOTACION_BYTECODE?.trim() || '0x';

/** Indica si el bytecode esta realmente cargado (no es el placeholder). */
export const bytecodeDisponible = (): boolean =>
  VOTACION_BYTECODE.length > 2 && VOTACION_BYTECODE.startsWith('0x');
