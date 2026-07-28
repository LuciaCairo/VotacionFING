# Frontend Admin — Sistema de Votación Electrónica FING (UNCuyo)

Panel de administración del prototipo de votación electrónica sobre **Blockchain
Federal Argentina (BFA)**. Tesina de grado — Facultad de Ingeniería, UNCuyo.

**Next.js 16 (App Router) + React 19 + TypeScript**, con **Tailwind CSS v4**,
componentes **shadcn** (estilo `base-nova`, sobre `@base-ui/react`, no Radix),
**TanStack Query v5** para estado de servidor, **React Hook Form + Zod** para
formularios y validaciones espejadas del backend.

Consume la API REST de [`votacion-backend`](../votacion-backend) — necesitás
tenerlo corriendo para usar este panel.

---

## Estado actual

Panel de administración **completo**, sin pantallas pendientes:

- ✅ Login (`/login`), con guard de sesión para todo `/admin/*`.
- ✅ Home (`/admin`): elecciones agrupadas por estado (creada / publicada / finalizada).
- ✅ Detalle de elección creada/publicada (`/admin/elecciones/[id]`).
- ✅ Resultados de elección finalizada (`/admin/elecciones/[id]/resultados`), con
  descarga de CSV de participación (quién votó y quién no).
- ✅ Control de Integridad — auditoría BD vs. contrato en BFA
  (`/admin/elecciones/[id]/integridad`).
- ✅ Padrón Electoral — búsqueda, paginado y descarga de CSV (`/admin/padron`).
- ✅ Crear Elección — formulario, listas con color, confirmación de inmutabilidad
  (`/admin/elecciones/nueva`).

El **módulo votante** es otro frontend (`../votacion-frontend-votante`), también
completo — ver su propio README.

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

El panel queda en `http://localhost:8081` (puerto fijo por script, no el 3000
default de Next — ese ya lo usa el backend). Requiere el backend corriendo
(ver [`../votacion-backend/README.md`](../votacion-backend/README.md)) con Postgres,
Redis y la cuenta BFA configurados.

### Credenciales del seed

- Admin: `admin@fing.uncuyo.edu.ar` / `admin1234`

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
    login/page.tsx                             login (split-screen)
    admin/layout.tsx                            envuelve /admin/* en <AdminGuard>
    admin/page.tsx                              Home: 3 secciones por estado
    admin/padron/page.tsx                        Padrón Electoral
    admin/elecciones/nueva/page.tsx               Crear Elección
    admin/elecciones/[id]/page.tsx                detalle de una elección
    admin/elecciones/[id]/integridad/page.tsx     auditoría BD vs. BFA
    admin/elecciones/[id]/resultados/page.tsx    resultados de elección finalizada
  components/
    ui/               shadcn (button, alert-dialog, ...)
    auth/              login-form, login-banner
    admin/             shell compartido (sidebar + topbar), election-card, empty-state
    admin/eleccion/    tarjetas de fecha/lista, diálogos de lista y confirmación
  lib/
    validations/       schemas Zod espejados del backend (auth, eleccion)
    api/               fetch autenticado (http, auth, elecciones, padron, blockchain, errors)
    auth/session.ts    sesión en localStorage (JWT, sin cookies)
    format.ts          helpers de fecha
    colors.ts           contraste de texto sobre color de lista
  hooks/               TanStack Query: elecciones, padrón, integridad, login/logout
```

---

## Autenticación

El backend no setea cookies: el JWT de admin viaja en el body de
`POST /api/auth/login/admin` y se guarda en `localStorage`
(`lib/auth/session.ts`). Todas las llamadas autenticadas mandan
`Authorization: Bearer <token>`. Una respuesta 401 limpia la sesión local y
redirige a `/login`.

---

## Notas de diseño

- El diálogo de agregar/editar lista (Crear Elección) es un componente custom
  sobre `@base-ui/react/dialog`, no el `AlertDialog` de shadcn — el look
  (gradiente, swatch de color) no comparte estilo con los diálogos de
  confirmación del resto del panel.
- El color de una lista se guarda tal cual lo elige el admin al crearla (no hay
  paleta por índice del lado del backend); el voto en blanco siempre tiene
  color fijo `#FFFFFF` y lo agrega el backend automáticamente, nunca el
  frontend.
- El botón "Filtrar" del Padrón está deshabilitado a propósito: el backend
  solo soporta búsqueda por nombre/legajo, no hay otro criterio implementado.
