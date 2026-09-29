import type { NextConfig } from "next";

// Origen real del backend (ver lib/api/http.ts) — connect-src lo necesita
// explícito porque el fetch es cross-origin (frontend :8082, backend :3000).
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Next inyecta scripts/estilos inline propios (hidratación, next/font) sin
// nonce en este setup, por eso 'unsafe-inline' en script-src/style-src — la
// contención real contra robo del JWT (guardado en localStorage, ver
// lib/auth/session.ts) la da connect-src: aunque un script inyectado
// lograra ejecutar, el navegador le bloquea cualquier request a un origen
// que no sea 'self' o el backend real.
// React usa eval() en modo desarrollo (reconstrucción de callstacks); en
// producción nunca, así que 'unsafe-eval' solo se agrega en `next dev`.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Destino del proxy /api/* (ver rewrites abajo). Solo lo usa el servidor de
// Next, nunca el navegador. Sirve para exponer la app por un túnel con una
// sola URL por frontend: con NEXT_PUBLIC_API_URL vacío el fetch va a
// /api/... del mismo origen y Next lo reenvía al backend local.
const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
