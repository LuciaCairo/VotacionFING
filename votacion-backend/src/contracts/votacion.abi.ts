/**
 * ABI del contrato Votacion.sol realmente desplegado en BFA testnet.
 *
 * Corresponde a la version final en Solidity 0.5.4 + EVM byzantium
 * (ver Informe de Despliegue, seccion 6.9 "Contrato final adaptado").
 *
 * votosPorLista paso de public a private: ya no genera un getter propio en
 * el ABI. obtenerTodosLosVotos() ahora exige eleccionFinalizada (revierte
 * si block.timestamp <= fechaCierre).
 *
 * Se mantiene como objeto tipado para que ethers.js infiera correctamente
 * los tipos de retorno.
 */
export const VOTACION_ABI = [
  // ─── constructor ───────────────────────────────────────────
  {
    inputs: [
      { internalType: 'string', name: '_nombreEleccion', type: 'string' },
      { internalType: 'string[]', name: '_listas', type: 'string[]' },
      { internalType: 'address', name: '_backend', type: 'address' },
      { internalType: 'uint256', name: '_fechaApertura', type: 'uint256' },
      { internalType: 'uint256', name: '_fechaCierre', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },

  // ─── variables publicas (getters autogenerados) ────────────
  {
    constant: true,
    inputs: [],
    name: 'admin',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'backend',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'nombreEleccion',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'fechaApertura',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'fechaCierre',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'listas',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'yaVoto',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },

  // ─── escritura ─────────────────────────────────────────────
  {
    constant: false,
    inputs: [
      { internalType: 'uint256', name: 'idLista', type: 'uint256' },
      { internalType: 'bytes32', name: 'hashVotante', type: 'bytes32' },
    ],
    name: 'votar',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ─── lectura ───────────────────────────────────────────────
  {
    constant: true,
    inputs: [],
    name: 'cantidadListas',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'uint256', name: 'idLista', type: 'uint256' }],
    name: 'obtenerLista',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  // Requiere eleccionFinalizada (block.timestamp > fechaCierre); revierte si se
  // llama antes del cierre. votosPorLista ahora es private: ya no tiene
  // getter propio, esta es la unica forma de leer los votos.
  {
    constant: true,
    inputs: [],
    name: 'obtenerTodosLosVotos',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'estaAbierta',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: 'hashVotante', type: 'bytes32' }],
    name: 'yaVotoEstaPersona',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const;
