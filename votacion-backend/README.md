# Backend — Sistema de Votación Electrónica FING (UNCuyo)

Backend del prototipo de votación electrónica sobre **Blockchain Federal Argentina (BFA)**.
Tesina de grado — Facultad de Ingeniería, UNCuyo.

API REST en **Node.js 20 + Fastify + TypeScript**, con **Prisma/PostgreSQL**,
**Redis** (lista negra de JWT y bloqueo de login), **ethers.js** (BFA) y **node-cron**
(apertura/cierre automático de elecciones).

---

## Estado actual

El backend está **completo y probado**:

- ✅ Estructura de carpetas y configuración (`package.json`, `tsconfig`, env tipado con Zod).
- ✅ Esquema Prisma completo (7 tablas, enums, restricciones `UNIQUE` compuestas y FKs).
- ✅ Configuración base: env, logger (Pino), Prisma, Redis.
- ✅ Servicio de blockchain (deploy, voto, lectura de resultados, hash aleatorio por voto).
- ✅ Plugins: autenticación JWT + lista negra, guard por rol, manejo de errores global.
- ✅ **Módulo de autenticación completo** (login votante, login admin, logout) con bloqueo
  de 5 intentos / 10 minutos en Redis.
- ✅ **Módulo admin completo**: CRUD de elecciones (`GET/POST /api/admin/elecciones`,
  `GET/DELETE /api/admin/elecciones/:id`), auditoría de integridad BD vs. BFA
  (`GET /api/admin/elecciones/:id/integridad`), Padrón Electoral (`GET /api/admin/padron`
  y `/padron/descargar`), descarga de participación por elección finalizada
  (`GET /api/admin/elecciones/:id/participacion/descargar`), saldo de la cuenta
  blockchain (`GET /api/admin/blockchain/saldo`).
- ✅ **Módulo votante completo**: elecciones vigentes/finalizadas, detalle, emisión de
  voto y constancia de participación (`/api/votante/elecciones/...`).
- ✅ Endpoints compartidos admin/votante de una elección finalizada: resultados
  (`GET /api/elecciones/:id/resultados`, incluye red y dirección del contrato) y
  verificación en vivo de esos resultados contra el contrato en BFA
  (`GET /api/elecciones/:id/verificacion`).
- ✅ Cron jobs de transición de estados de elecciones.
- ✅ Seed de datos de prueba.

Los dos frontends (admin y votante) ya están completos y consumen esta API en
su totalidad — ver [`../votacion-frontend-admin/README.md`](../votacion-frontend-admin/README.md)
y [`../votacion-frontend-votante/README.md`](../votacion-frontend-votante/README.md).

---

## Requisitos previos

- Node.js 20 LTS
- Una base PostgreSQL (Neon.tech) y un Redis (Upstash) — o locales.
- La cuenta BFA del backend (`0x9e63...`) y su clave privada.
- El **bytecode** del contrato [`src/contracts/Votacion.sol`](src/contracts/Votacion.sol)
  compilado con Solidity **0.5.4** + EVM **byzantium** (ver más abajo).

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    → completar DATABASE_URL, REDIS_URL, JWT_SECRET,
#      BACKEND_PRIVATE_KEY, BACKEND_ADDRESS y VOTACION_BYTECODE.

# 3. Generar el cliente Prisma y aplicar el esquema
npm run prisma:generate
npm run prisma:migrate      # crea las tablas (entorno de desarrollo)

# 4. (opcional) Cargar datos de prueba
npm run seed

# 5. Arrancar en desarrollo
npm run dev
```

El servidor queda en `http://localhost:3000`. Health check: `GET /health`.

### Credenciales del seed

- Admin: `admin@fing.uncuyo.edu.ar` / `admin1234`
- Votantes: legajos `12345`, `67890`, `11111` — password `votante1234`

---

## El bytecode del contrato (importante)

El backend despliega un contrato nuevo por elección. Para ello necesita el **bytecode**
compilado con la **misma** configuración con la que se desplegó en BFA, o el nodo
Geth v1.9.22 rechaza la transacción:

- Solidity **0.5.4**
- EVM target **byzantium**
- `pragma experimental ABIEncoderV2`

Obtenelo desde Remix (Solidity Compiler → copiar `Bytecode.object`) o con `solc`:

```bash
solc --bin --evm-version byzantium Votacion.sol
```

Y cargalo en `.env` como `VOTACION_BYTECODE="0x..."`. Mientras no esté, la creación de
elecciones falla de forma controlada con un mensaje claro.

---

## Estructura

```
src/
  config/        env (Zod), logger (Pino), prisma, redis
  contracts/     código fuente (Votacion.sol), ABI y bytecode del contrato
  plugins/       auth (JWT + lista negra + roles), manejo de errores
  services/      blockchain (ethers/BFA), log (tabla LOG)
  modules/
    auth/        login votante/admin, logout
    votante/     elecciones vigentes/finalizadas, detalle, votar, constancia de participación
    admin/       CRUD elecciones, integridad, padrón, saldo blockchain
    eleccion/    endpoint compartido de resultados (no lleva prefijo /admin ni /votante)
  jobs/          cron de apertura/cierre automático de elecciones
  utils/         password (bcrypt), errores de dominio, helpers de request
  types/         tipos del JWT
  app.ts         construcción de la app Fastify
  server.ts      arranque + cierre ordenado
prisma/
  schema.prisma  esquema de datos
  seed.ts        datos de prueba
```

---

## Notas de seguridad

- La **clave privada** del backend nunca va al repo ni a los logs (el logger la redacta).
- **Anonimato del voto.** La transacción `votar(idLista, hash)` es pública y lleva
  la lista en claro, así que el sistema evita cualquier vínculo entre un votante y
  su transacción:
  - El `hash` de cada voto son 32 bytes aleatorios. Antes era
    `keccak256(legajo + idEleccion + SALT_SECRETO)`: con el salt y el padrón se
    podía recalcular el hash de cada votante y leer su voto en la cadena, para
    siempre. `SALT_SECRETO` ya no existe.
  - `PARTICIPACION` no guarda el tx hash ni el hash del voto. Se reserva **antes**
    de enviar el voto (el `UNIQUE(id_votante, id_eleccion)` frena el doble voto) con
    un `hash_pendiente` que se borra al confirmarse. Si un envío falla sin saberse
    si entró, el reintento reutiliza ese hash y el contrato rechaza el repetido, así
    que nunca se cuentan dos votos. Las reservas que nadie reintentó se resuelven
    contra el contrato al cerrar la elección (job de snapshot).
  - Con hashes aleatorios el contrato ya no puede saber que dos votos son de la
    misma persona: el doble voto lo frena solo la fila de `PARTICIPACION`. Por eso
    un trigger de la BD (`trg_participacion_proteger_confirmada`) impide borrar o
    modificar una participación confirmada; las reservas pendientes sí se pueden
    borrar o confirmar. Protege contra errores y bugs, no contra alguien con
    permisos para quitar el trigger. `TRUNCATE` (lo que usa `prisma/limpiar.ts`)
    no lo dispara.
  - El votante recibe una **constancia de participación** (elección y fecha), no el
    tx hash: con él podría demostrarle a otro a quién votó. La fecha va solo con
    el día, sin hora, igual que en el CSV de participación: con pocos votos por
    minuto, la hora del voto alcanza para encontrar su transacción por la hora
    del bloque.
  - La auditoría de integridad compara la **cantidad** de participaciones contra el
    total de votos del contrato, en vez de verificar votante por votante.
  - Limitación que queda: la hora de cada voto (`fecha_voto`, tabla `LOG`) se
    puede cruzar con la hora del bloque de cada transacción. Con poco tráfico eso
    alcanza para identificar votos a quien tenga acceso a la BD. Mitigarlo
    requiere enviar los votos en lotes mezclados (trabajo futuro).
- Las contraseñas se hashean con bcrypt; los JWT se firman con `JWT_SECRET`.
- El control de acceso por rol se aplica en cada endpoint protegido.
- Resultados — estrategia híbrida: al finalizar una elección, el job de cron toma
  un **snapshot** de los votos del contrato en BFA y lo guarda en la tabla
  `RESULTADO` (uno por lista) junto con el ganador/empate en `ELECCION`. Esto da
  performance y disponibilidad para consultar resultados de elecciones cerradas
  sin depender de que el nodo de BFA esté disponible en cada lectura. La
  **integridad** del snapshot sigue siendo verificable comparándolo contra BFA
  en cualquier momento: el admin con el control de integridad completo, y
  cualquier usuario con `GET /api/elecciones/:id/verificacion` (votos y nombres
  de cada lista, leídos en vivo del contrato). Como esa verificación igual la
  hace este backend, los resultados también exponen la red y la dirección del
  contrato, para que cualquiera llame a `obtenerTodosLosVotos()` directamente
  en BFA sin depender del sistema. Mientras la elección está **activa**, la app no
  muestra votos en ningún lado (ni el panel ni la verificación de integridad):
  `obtenerTodosLosVotos()` revierte hasta el cierre (`eleccionFinalizada`).
  - Regla de empate: el voto en blanco es una lista más y participa del máximo
    (no se excluye especialmente). Se toma el valor máximo de votos entre
    todas las listas; si una sola lista lo alcanza hay `ganador_unico`, si dos
    o más lo alcanzan hay `empate`. El caso de cero votos también resuelve en
    `empate`, porque todas las listas comparten el máximo (0) sin caso especial.
  - Si la lectura de BFA falla al finalizar, la elección igual pasa a
    `finalizada` (el snapshot no bloquea el cierre); queda con `snapshot_at =
    null` y el cron la reintenta en las corridas siguientes.
- `bcryptjs` se usa en lugar de `bcrypt` para evitar compilación nativa; ambos son
  intercambiables (misma API). Si preferís `bcrypt`, cambiá el import en
  `src/utils/password.ts` y `prisma/seed.ts`.
- `npm audit`: **0 vulnerabilidades** (última corrida). Se actualizó `@fastify/jwt`
  a v10, `fastify` a v5 (con el resto del ecosistema — cors, helmet, rate-limit,
  fastify-plugin, pino — alineado a esa major) y `node-cron` a v4. Detalle completo
  del proceso y de los 3 archivos que hubo que ajustar por el cambio de API de
  Fastify v5 en [`../docs/informe-backend-npm-audit.pdf`](../docs/informe-backend-npm-audit.pdf).
- **Concurrencia en `blockchain.service.ts`**: hay una única wallet (`signer`) que
  firma todas las transacciones del sistema (votos y deploys por igual). Los envíos
  se serializan y el nonce se cuenta en memoria en vez de volver a preguntarle a la
  red en cada transacción — preguntarle a BFA en cada envío no alcanza (es una red
  de consorcio, con más de un nodo detrás de un balanceador, y un nodo puede no
  estar al día con lo que otro acaba de aceptar). Verificado con votos concurrentes
  reales contra BFA; ver [`../docs/informe-nonce-blockchain.pdf`](../docs/informe-nonce-blockchain.pdf)
  para la bitácora completa (incluye un primer intento que parecía andar y falló
  igual bajo más carga). Limitación conocida: esto serializa dentro de un único
  proceso de Node — correr el backend en más de una instancia a la vez
  reintroduciría la condición de carrera (haría falta un lock compartido, ej. Redis).
- Limitaciones de seguridad conocidas, documentadas mas no mitigadas (decisión
  explícita, fuera del alcance de esta tesina): el backend firma todos los votos
  sin intervención criptográfica del votante (firmante único → voto fantasma
  teórico si el backend estuviera comprometido); los roles de BD/Redis no siguen
  mínimo privilegio; se confía en que el nodo RPC de BFA no mienta (inherente a
  blockchain permisionada); un admin puede vaciar el saldo de gas creando
  elecciones sin límite, y un votante puede spamear intentos de voto propios
  mientras el primero no confirma. Detalle de cada uno en
  [`../docs/informe-nonce-blockchain.pdf`](../docs/informe-nonce-blockchain.pdf).
