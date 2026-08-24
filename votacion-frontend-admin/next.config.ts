import type { NextConfig } from "next";

// Origen real del backend (ver lib/api/http.ts) — connect-src lo necesita
// explícito porque el fetch es cross-origin (frontend :8081, backend :3000).
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Next inyecta scripts/estilos inline propios (hidratación, next/font) sin
// nonce en este setup, por eso 'unsafe-inline' en script-src/style-src — la
// contención real contra robo del JWT (guardado en localStorage, ver
// lib/auth/session.ts) la da connect-src: aunque un script inyectado
// lograra ejecutar, el navegador le bloquea cualquier request a un origen
// que no sea 'self' o el backend real.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
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
