# Frontend Votante — Sistema de Votación Electrónica FING (UNCuyo)

App del votante del prototipo de votación electrónica sobre **Blockchain
Federal Argentina (BFA)**. Tesina de grado — Facultad de Ingeniería, UNCuyo.

**Next.js 16 (App Router) + React 19 + TypeScript**, con **Tailwind CSS v4**,
componentes **shadcn** (estilo `base-nova`, sobre `@base-ui/react`, no Radix),
**TanStack Query v5** para estado de servidor, **React Hook Form + Zod** para
validaciones espejadas del backend.

Consume la API REST de [`votacion-backend`](../votacion-backend) — necesitás
tenerlo corriendo para usar esta app.

---

## Estado actual

App del votante **completa**, sin pantallas pendientes:

- ✅ Login (`/login`), con guard de sesión para todo `/votante/*` y `/elecciones/*`.
- ✅ Home (`/votante`): elecciones vigentes y finalizadas, con estado "ya votaste".
- ✅ Detalle de elección + boleta y emisión de voto (`/elecciones/[id]`) — muestra
  la constancia de participación si ya votaste, y bloquea la boleta si la elección ya
  finalizó (defensa por si se llega por URL directa).
- ✅ Resultados de elección finalizada (`/elecciones/[id]/resultados`) — mismo
  endpoint compartido con el panel admin, sin el botón "Ver Integridad" (acción
  exclusiva de admin). En su lugar, una tarjeta de **verificación en
  blockchain**: dirección del contrato, botón "Verificar contra BFA" (compara en
  vivo los votos publicados con los del contrato) y los pasos para verificarlo
  sin depender del sistema.
- ✅ Soporte (`/soporte`) — datos de contacto ante problemas para votar.

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
#    → NEXT_PUBLIC_API_URL debe apuntar al backend (default: http://localhost:3000)

# 3. Arrancar en desarrollo
npm run dev
```

La app queda en `http://localhost:8082` (puerto fijo por script — el 3000 lo
usa el backend y el 8081 el panel admin). Requiere el backend corriendo (ver
[`../votacion-backend/README.md`](../votacion-backend/README.md)) con
Postgres, Redis y la cuenta BFA configurados.

### Credenciales del seed

- Votantes: legajos `12345`, `67890`, `11111` — password `votante1234`

### Otros comandos

```bash
npm run build       # build de producción
npm run start        # sirve el build
npm run lint          # eslint
npm run typecheck   # tsc --noEmit
```

---

## Estructura

```
src/
  app/
    login/page.tsx                          login (split-screen)
    votante/layout.tsx                       envuelve /votante y /elecciones/* en <VotanteGuard>
    votante/page.tsx                         Home: vigentes / finalizadas
    elecciones/[id]/page.tsx                  detalle + boleta + voto / constancia
    elecciones/[id]/resultados/page.tsx      resultados de elección finalizada
    soporte/page.tsx                          contacto de soporte
  components/
    ui/               shadcn (button, alert-dialog, ...)
    auth/              login-form, login-banner
    votante/           shell compartido (sidebar + topbar), boleta, constancia,
                        diálogo de confirmación de voto, cards de elección
  lib/
    validations/       schemas Zod espejados del backend (auth)
    api/               fetch autenticado (http, auth, elecciones, errors)
    auth/session.ts    sesión en localStorage (JWT, sin cookies)
    format.ts          helpers de fecha
    colors.ts           contraste de texto sobre color de lista
  hooks/               TanStack Query: elecciones, detalle, voto, comprobante, login/logout
```

---

## Autenticación

El backend no setea cookies: el JWT de votante viaja en el body de
`POST /api/auth/login/votante` y se guarda en `localStorage`
(`lib/auth/session.ts`). Todas las llamadas autenticadas mandan
`Authorization: Bearer <token>`. Una respuesta 401 limpia la sesión local y
redirige a `/login`.

---

## Notas de diseño

- El voto es irreversible: la boleta pide confirmación explícita
  (`ConfirmarVotoDialog`) antes de emitir, y una vez votado el detalle de la
  elección solo muestra una constancia de participación (elección y fecha) —
  nunca la lista elegida, ni siquiera al propio votante, para preservar el
  anonimato. Tampoco muestra el hash de la transacción en BFA: la transacción
  lleva la lista en claro, así que con ese hash el votante podría demostrarle
  a otro a quién votó. Por lo mismo, la fecha va solo con el día, sin hora:
  con pocos votos por minuto, la hora alcanza para encontrar la transacción
  por la hora del bloque.
- El voto en blanco se muestra como una opción más de la boleta (no aparte).
- La emisión de voto (`POST /elecciones/:id/votar`) espera confirmación real
  de la transacción en BFA, así que usa un timeout más largo (60s) que el
  resto de las llamadas (15s por defecto).
