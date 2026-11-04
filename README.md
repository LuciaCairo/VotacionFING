# VotacionFING

Prototipo de votación electrónica para la Facultad de Ingeniería (FING) de la
UNCuyo, pensado para las elecciones del Centro de Estudiantes, que registra los
votos en la red de pruebas de la **Blockchain Federal Argentina (BFA)**. Tesina
Final de Grado de la Licenciatura en Ciencias de la Computación. Se probó en la
red de pruebas de la BFA y con una prueba con usuarios; no se usó en elecciones
reales.

## Por qué

Las elecciones del Centro de Estudiantes se hacen en papel, en una jornada
presencial y con conteo manual. Este prototipo explora una alternativa: cada
voto se registra en un contrato de la BFA, donde no puede modificarse, y
cualquiera puede comparar los resultados publicados con los del contrato. La
base de datos registra quién votó, pero no qué votó.

## Estructura del repositorio

```
votacion-backend/          API REST (Fastify + Prisma/PostgreSQL + Redis + ethers.js/BFA)
votacion-frontend-admin/   Panel de administración (Next.js, puerto 8081)
votacion-frontend-votante/ App del votante (Next.js, puerto 8082)
```

| Módulo | Estado |
|---|---|
| Backend | ✅ Completo — auth, admin (elecciones, integridad, padrón) y votante |
| Frontend admin | ✅ Completo — login, elecciones, resultados, integridad, padrón, crear elección |
| Frontend votante | ✅ Completo — login, elecciones vigentes/finalizadas, boleta y voto, constancia de participación, resultados, soporte |

Cada subproyecto tiene su propio README con instrucciones de puesta en
marcha: [`votacion-backend/README.md`](votacion-backend/README.md),
[`votacion-frontend-admin/README.md`](votacion-frontend-admin/README.md) y
[`votacion-frontend-votante/README.md`](votacion-frontend-votante/README.md).

## Arquitectura, en resumen

- El backend despliega un **contrato Solidity nuevo por elección** en BFA
  (Geth v1.9.22), y expone la API que consumen los frontends de admin y de
  votante. El código del contrato está en
  [`votacion-backend/src/contracts/Votacion.sol`](votacion-backend/src/contracts/Votacion.sol).
- Los resultados de elecciones finalizadas usan una **estrategia híbrida**: al
  cierre, un cron toma un snapshot de los votos del contrato y lo guarda en
  Postgres (performance y disponibilidad), pero la integridad del snapshot
  sigue siendo verificable contra BFA en cualquier momento (pantalla de
  Control de Integridad del panel admin).
- El JWT viaja en el body de login (no hay cookies) y se guarda en
  `localStorage` en el frontend, mandado como header `Authorization: Bearer`
  en cada llamada autenticada.

## Seguridad

Se corrió `npm audit` en las tres apps (llevándolas a 0 vulnerabilidades reportadas) y una revisión manual encontró y corrigió una condición de carrera real en cómo el backend firma transacciones en BFA: bajo votos concurrentes, dos transacciones podían pedir el mismo número de secuencia (nonce) y una quedaba rechazada. Todo el proceso, con las pruebas reales de concurrencia contra la blockchain, está documentado en [`docs/`](docs/):

- [`docs/informe-backend-npm-audit.pdf`](docs/informe-backend-npm-audit.pdf) — backend: 6 → 0 vulnerabilidades (incluye el bump de Fastify a v5 y los 3 archivos que hubo que ajustar).
- [`docs/informe-frontends-npm-audit.pdf`](docs/informe-frontends-npm-audit.pdf) — ambos frontends: 9 → 0 vulnerabilidades, solo bump de versión, sin cambios de código.
- [`docs/informe-nonce-blockchain.pdf`](docs/informe-nonce-blockchain.pdf) — la condición de carrera del nonce: cómo se encontró, los dos intentos de arreglo y las pruebas reales que confirmaron el segundo.

Limitaciones de seguridad conocidas, con decisión explícita de documentar (no mitigar) por estar fuera del alcance de esta tesina — detalle en el último informe de arriba: voto fantasma por firmante único, roles de base de datos sin mínimo privilegio, confianza en el nodo RPC de BFA, y DoS económico por creación de elecciones (admin) o votos repetidos (votante) sin límite.

## Pruebas

Las planillas de casos de prueba están en [`docs/pruebas/`](docs/pruebas/):

- [`pruebas-api.xlsx`](docs/pruebas/pruebas-api.xlsx) — casos de prueba de la API, por endpoint.
- [`pruebas-panel-administracion.xlsx`](docs/pruebas/pruebas-panel-administracion.xlsx) — casos de prueba del panel de administración, por pantalla.
- [`pruebas-aplicacion-votante.xlsx`](docs/pruebas/pruebas-aplicacion-votante.xlsx) — casos de prueba de la app del votante, por pantalla.
- [`pruebas-integridad-registro.xlsx`](docs/pruebas/pruebas-integridad-registro.xlsx) — pruebas de integridad del registro: comparan la base de datos con lo que registra la BFA, incluso con datos alterados a propósito.

No se incluyen los casos de funciones que el sistema ya no tiene ni los que no llegaron a ejecutarse.

## Puesta en marcha rápida

```bash
# Backend (puerto 3000)
cd votacion-backend
npm install
cp .env.example .env   # completar DATABASE_URL, REDIS_URL, claves BFA, etc.
npm run prisma:migrate
npm run seed            # datos de prueba
npm run dev

# Frontend admin (puerto 8081), en otra terminal
cd votacion-frontend-admin
npm install
cp .env.example .env.local
npm run dev

# Frontend votante (puerto 8082), en otra terminal
cd votacion-frontend-votante
npm install
cp .env.example .env.local
npm run dev
```

Credenciales de prueba (seed): admin `admin@fing.uncuyo.edu.ar` / `admin1234`;
votantes con legajos `12345`, `67890`, `11111` / `votante1234`.
