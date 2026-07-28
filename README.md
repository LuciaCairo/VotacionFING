# VotacionFING

Prototipo de sistema de votación electrónica para las elecciones del Centro de
Estudiantes de la Facultad de Ingeniería (FING), UNCuyo, basado en
**Blockchain Federal Argentina (BFA)**. Tesina final de carrera — Licenciatura
en Ciencias de la Computación.

## Por qué

Reemplaza el sistema manual en papel, que tiene problemas de accesibilidad,
integridad y transparencia. El Art. 154 del Estatuto de la UNCuyo obliga a
votar (con sanciones por no hacerlo), lo que hace de la accesibilidad un tema
de equidad. El sistema se apoya en blockchain para dar integridad y
transparencia verificable a los resultados, manteniendo el anonimato del voto.

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
| Frontend votante | ✅ Completo — login, elecciones vigentes/finalizadas, boleta y voto, comprobante, resultados, soporte |

Cada subproyecto tiene su propio README con instrucciones de puesta en
marcha: [`votacion-backend/README.md`](votacion-backend/README.md),
[`votacion-frontend-admin/README.md`](votacion-frontend-admin/README.md) y
[`votacion-frontend-votante/README.md`](votacion-frontend-votante/README.md).

## Arquitectura, en resumen

- El backend despliega un **contrato Solidity nuevo por elección** en BFA
  (Geth v1.9.22), y expone la API que consumen los frontends de admin y de
  votante.
- Los resultados de elecciones finalizadas usan una **estrategia híbrida**: al
  cierre, un cron toma un snapshot de los votos del contrato y lo guarda en
  Postgres (performance y disponibilidad), pero la integridad del snapshot
  sigue siendo verificable contra BFA en cualquier momento (pantalla de
  Control de Integridad del panel admin).
- El JWT viaja en el body de login (no hay cookies) y se guarda en
  `localStorage` en el frontend, mandado como header `Authorization: Bearer`
  en cada llamada autenticada.

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
