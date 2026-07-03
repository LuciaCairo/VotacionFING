import { ethers } from 'ethers';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { VOTACION_ABI } from '../contracts/votacion.abi.js';
import { VOTACION_BYTECODE, bytecodeDisponible } from '../contracts/votacion.bytecode.js';
import { InternoError } from '../utils/errors.js';

/**
 * Servicio de blockchain. Unico punto del sistema que interactua con BFA.
 * Encapsula:
 *   - El provider (lectura) y el signer (firma de transacciones).
 *   - El calculo del hash anonimo del votante con salt secreto.
 *   - Deploy de contratos, registro de votos y lectura de resultados.
 */

// ─── Provider y signer (singletons) ──────────────────────────

const provider = new ethers.JsonRpcProvider(env.BFA_RPC_URL, {
  chainId: env.BFA_CHAIN_ID,
  name: 'bfa-testnet',
});

/** Wallet del backend (0x9e63...). Firma y paga el gas de todas las TX. */
const signer = new ethers.Wallet(env.BACKEND_PRIVATE_KEY, provider);

/**
 * Hash anonimo del votante: keccak256(legajo + idEleccion + SALT_SECRETO).
 * Incluir el idEleccion hace que el mismo votante genere un hash distinto en
 * cada eleccion, impidiendo correlacionar su comportamiento entre elecciones.
 * El hash sigue siendo determinístico dentro de una eleccion (mismo votante +
 * misma eleccion = mismo hash), lo que permite al contrato detectar doble voto.
 * Sin el salt no es posible reconstruir la correspondencia legajo->hash.
 */
export function hashVotante(legajo: string, idEleccion: number): string {
  return ethers.keccak256(ethers.toUtf8Bytes(legajo + idEleccion + env.SALT_SECRETO));
}

/**
 * Despliega un contrato Votacion nuevo para una eleccion.
 * Las listas y fechas quedan inmutables en la blockchain.
 *
 * @returns la address del contrato desplegado y el tx hash del deploy.
 */
export async function desplegarContrato(params: {
  nombreEleccion: string;
  listas: string[];
  fechaAperturaUnix: number;
  fechaCierreUnix: number;
}): Promise<{ address: string; txHash: string }> {
  if (!bytecodeDisponible()) {
    throw new InternoError(
      'El bytecode del contrato no esta configurado. Cargar VOTACION_BYTECODE (compilado con Solidity 0.5.4 + EVM byzantium) antes de crear elecciones.',
    );
  }

  try {
    const factory = new ethers.ContractFactory(VOTACION_ABI, VOTACION_BYTECODE, signer);

    const contrato = await factory.deploy(
      params.nombreEleccion,
      params.listas,
      env.BACKEND_ADDRESS,
      params.fechaAperturaUnix,
      params.fechaCierreUnix,
      { gasLimit: env.BFA_DEPLOY_GAS_LIMIT },
    );

    const recibo = await contrato.deploymentTransaction()?.wait();
    const address = await contrato.getAddress();
    const txHash = recibo?.hash ?? contrato.deploymentTransaction()?.hash ?? '';

    logger.info({ address, txHash }, 'Contrato de eleccion desplegado en BFA');
    return { address, txHash };
  } catch (err) {
    logger.error({ err }, 'Fallo el deploy del contrato en BFA');
    throw new InternoError('Error al desplegar el contrato en BFA. La eleccion no fue creada.');
  }
}

/** Devuelve una instancia del contrato para lectura (provider). */
function contratoLectura(address: string): ethers.Contract {
  return new ethers.Contract(address, VOTACION_ABI, provider);
}

/** Devuelve una instancia del contrato para escritura (signer). */
function contratoEscritura(address: string): ethers.Contract {
  return new ethers.Contract(address, VOTACION_ABI, signer);
}

/**
 * Registra un voto en el contrato de la eleccion.
 * El contrato valida internamente: solo backend, eleccion activa,
 * no doble voto y lista valida.
 *
 * @returns el hash de la transaccion confirmada.
 */
export async function registrarVoto(params: {
  contratoAddress: string;
  idLista: number;
  hash: string;
}): Promise<{ txHash: string }> {
  const contrato = contratoEscritura(params.contratoAddress);
  const tx = await contrato.votar(params.idLista, params.hash);
  const recibo = await tx.wait();
  return { txHash: recibo?.hash ?? tx.hash };
}

/** Lee el conteo de votos por lista directamente del contrato. */
export async function obtenerVotos(contratoAddress: string): Promise<number[]> {
  const contrato = contratoLectura(contratoAddress);
  const votos: bigint[] = await contrato.obtenerTodosLosVotos();
  return votos.map((v) => Number(v));
}

/**
 * Lee el saldo (en wei) de la wallet del backend en BFA. Es la cuenta que
 * paga el gas de todos los deploys y votos; si se queda sin fondos, las
 * elecciones dejan de poder crearse o votarse sin ningun aviso previo.
 */
export async function obtenerSaldoBackend(): Promise<bigint> {
  return provider.getBalance(env.BACKEND_ADDRESS);
}

/** Consulta si la eleccion esta abierta segun el timestamp del contrato. */
export async function estaAbierta(contratoAddress: string): Promise<boolean> {
  const contrato = contratoLectura(contratoAddress);
  return contrato.estaAbierta();
}

/** Verifica en el contrato si un hash ya voto. */
export async function yaVotoEnContrato(contratoAddress: string, hash: string): Promise<boolean> {
  const contrato = contratoLectura(contratoAddress);
  return contrato.yaVotoEstaPersona(hash);
}

// ─── Lecturas para la verificacion de integridad (auditoria BD vs BFA) ──

/**
 * Indica si hay codigo desplegado en la address. Una address sin codigo
 * (mal cargada, contrato inexistente) hace fallar cualquier otra lectura
 * con un error de decodificacion en vez de uno de red, por eso se chequea
 * aparte antes de leer el resto de los datos del contrato.
 */
export async function contratoTieneCodigo(address: string): Promise<boolean> {
  const codigo = await provider.getCode(address);
  return codigo !== '0x';
}

/** Lee el nombre de la eleccion grabado (inmutable) en el contrato. */
export async function obtenerNombreEleccion(contratoAddress: string): Promise<string> {
  const contrato = contratoLectura(contratoAddress);
  return contrato.nombreEleccion();
}

/** Lee la fecha de apertura (unix segundos) grabada en el contrato. */
export async function obtenerFechaApertura(contratoAddress: string): Promise<number> {
  const contrato = contratoLectura(contratoAddress);
  const valor: bigint = await contrato.fechaApertura();
  return Number(valor);
}

/** Lee la fecha de cierre (unix segundos) grabada en el contrato. */
export async function obtenerFechaCierre(contratoAddress: string): Promise<number> {
  const contrato = contratoLectura(contratoAddress);
  const valor: bigint = await contrato.fechaCierre();
  return Number(valor);
}

/** Lee la cantidad de listas grabadas en el contrato. */
export async function obtenerCantidadListas(contratoAddress: string): Promise<number> {
  const contrato = contratoLectura(contratoAddress);
  const valor: bigint = await contrato.cantidadListas();
  return Number(valor);
}

/** Lee el nombre de la lista en un indice puntual del contrato. */
export async function obtenerListaPorIndice(
  contratoAddress: string,
  indice: number,
): Promise<string> {
  const contrato = contratoLectura(contratoAddress);
  return contrato.obtenerLista(indice);
}

/** Expone utilidades de bajo nivel por si se necesitan en tests. */
export const _internals = { provider, signer };
