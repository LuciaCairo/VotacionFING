pragma solidity ^0.5.4;
pragma experimental ABIEncoderV2;


contract Votacion {


    address public admin;
    address public backend;
    string  public nombreEleccion;
    uint    public fechaApertura;
    uint    public fechaCierre;
    string[] public listas;


    mapping(uint    => uint) private votosPorLista;
    mapping(bytes32 => bool) public yaVoto;


    constructor(
        string memory _nombreEleccion,
        string[] memory _listas,
        address _backend,
        uint _fechaApertura,
        uint _fechaCierre
    ) public {
        require(_listas.length >= 2, "Debe haber al menos 2 listas");
        require(_fechaApertura < _fechaCierre, "La apertura debe ser antes del cierre");
        require(_fechaCierre > block.timestamp, "El cierre debe ser en el futuro");
        admin          = msg.sender;
        backend        = _backend;
        nombreEleccion = _nombreEleccion;
        listas         = _listas;
        fechaApertura  = _fechaApertura;
        fechaCierre    = _fechaCierre;
    }


    modifier soloBackend() {
        require(msg.sender == backend, "Solo el backend autorizado puede registrar votos");
        _;
    }


    modifier eleccionActiva() {
        require(block.timestamp >= fechaApertura, "La eleccion todavia no empezo");
        require(block.timestamp <= fechaCierre, "La eleccion ya termino");
        _;
    }


    modifier eleccionFinalizada() {
        require(block.timestamp > fechaCierre, "Los resultados solo estan disponibles al finalizar la eleccion");
        _;
    }


    function votar(uint idLista, bytes32 hashVotante)
        public soloBackend eleccionActiva
    {
        require(!yaVoto[hashVotante], "Esta persona ya voto");
        require(idLista < listas.length, "Lista invalida");
        yaVoto[hashVotante]    = true;
        votosPorLista[idLista] += 1;
    }


    function cantidadListas() public view returns (uint) {
        return listas.length;
    }


    function obtenerLista(uint idLista) public view returns (string memory) {
        require(idLista < listas.length, "Lista invalida");
        return listas[idLista];
    }


    function obtenerTodosLosVotos() public view eleccionFinalizada returns (uint[] memory) {
        uint[] memory resultado = new uint[](listas.length);
        for (uint i = 0; i < listas.length; i++) {
            resultado[i] = votosPorLista[i];
        }
        return resultado;
    }


    function estaAbierta() public view returns (bool) {
        return block.timestamp >= fechaApertura &&
               block.timestamp <= fechaCierre;
    }


    function yaVotoEstaPersona(bytes32 hashVotante) public view returns (bool) {
        return yaVoto[hashVotante];
    }
}
