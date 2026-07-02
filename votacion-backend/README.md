# Backend — Sistema de Votación Electrónica FING (UNCuyo)

Backend del prototipo de votación electrónica sobre **Blockchain Federal Argentina (BFA)**.
Tesina de grado — Facultad de Ingeniería, UNCuyo.

API REST en **Node.js 20 + Fastify + TypeScript**, con **Prisma/PostgreSQL**,
**Redis** (lista negra de JWT y bloqueo de login), **ethers.js** (BFA) y **node-cron**
(apertura/cierre automático de elecciones).

---

## Estado actual

Esta entrega incluye la **base del proyecto** completa y funcional:

- ✅ Estructura de carpetas y configuración (`package.json`, `tsconfig`, env tipado con Zod).
- ✅ Esquema Prisma completo (7 tablas, enums, restricciones `UNIQUE` compuestas y FKs).
- ✅ Configuración base: env, logger (Pino), Prisma, Redis.
- ✅ Servicio de blockchain (deploy, voto, lectura de resultados, hash con salt).
- ✅ Plugins: autenticación JWT + lista negra, guard por rol, manejo de errores global.
- ✅ **Módulo de autenticación completo** (login votante, login admin, logout) con bloqueo
  de 5 intentos / 10 minutos en Redis.
- ✅ Cron jobs de transición de estados de elecciones.
- ✅ Seed de datos de prueba.

Pendiente (siguientes pasos, endpoint por endpoint): módulos **votante** (5 endpoints)
y **admin** (8 endpoints). Las rutas ya están "cableadas" en `app.ts` (comentadas) para
ir activándolas.

---

## Requisitos previos

- Node.js 20 LTS
- Una base PostgreSQL (Neon.tech) y un Redis (Upstash) — o locales.
- La cuenta BFA del backend (`0x9e63...`) y su clave privada.
- El **bytecode** del contrato `Votacion.sol` compilado con Solidity **0.5.4** + EVM
  **byzantium** (ver más abajo).

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    → completar DATABASE_URL, REDIS_URL, JWT_SECRET, SALT_SECRETO,
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
  contracts/     ABI y bytecode del contrato Votacion.sol
  plugins/       auth (JWT + lista negra + roles), manejo de errores
  services/      blockchain (ethers/BFA), log (tabla LOG)
  modules/
    auth/        login votante/admin, logout
    votante/     (pendiente)
    admin/       (pendiente)
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

- El **salt** del voto (`SALT_SECRETO`) y la **clave privada** del backend nunca van al
  repo ni a los logs (el logger los redacta).
- Las contraseñas se hashean con bcrypt; los JWT se firman con `JWT_SECRET`.
- El control de acceso por rol se aplica en cada endpoint protegido.
- Resultados — estrategia híbrida: al finalizar una elección, el job de cron toma
  un **snapshot** de los votos del contrato en BFA y lo guarda en la tabla
  `RESULTADO` (uno por lista) junto con el ganador/empate en `ELECCION`. Esto da
  performance y disponibilidad para consultar resultados de elecciones cerradas
  sin depender de que el nodo de BFA esté disponible en cada lectura. La
  **integridad** del snapshot sigue siendo verificable comparándolo contra BFA
  en cualquier momento. Para elecciones **activas**, el panel de control lee
  siempre en vivo del contrato (no hay snapshot todavía).
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
```
