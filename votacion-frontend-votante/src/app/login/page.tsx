import type { Metadata } from "next";
import { FacultadLogo } from "@/components/brand/facultad-logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Votación Electrónica",
};

/**
 * Mobile-first: una sola columna centrada, sin el panel de marca de
 * escritorio del login del admin (acá el caso de uso principal es el
 * celular, no una app nativa ni PWA).
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-1 flex-col items-center bg-[#eef1f5] px-5 py-8 sm:justify-center sm:py-12">
      <div className="mb-6 flex w-full max-w-[380px] flex-col items-center gap-3 sm:mb-8">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#0d3a63_0%,#0a2540_55%,#071a30_100%)] p-3 shadow-[0_10px_24px_rgba(10,37,64,0.25)]">
          <FacultadLogo className="h-full w-full object-contain" />
        </div>
        <div className="text-center">
          <div className="text-[19px] leading-[1.2] font-extrabold tracking-[-0.3px] text-[#0a2540]">
            Votación Electrónica
          </div>
          <div className="mt-1 text-[13px] leading-[1.4] text-[#5b6b7c]">
            Facultad de Ingeniería — UNCuyo
          </div>
        </div>
      </div>

      <div className="w-full max-w-[380px] rounded-[20px] bg-white px-6 py-7 shadow-[0_20px_45px_rgba(10,37,64,0.12)] sm:px-8 sm:py-8">
        <LoginForm />
      </div>

      <div className="mt-6 text-center text-[11px] text-[#9aa7b3]">
        © 2026 Facultad de Ingeniería — Uso exclusivo de votantes
      </div>
    </div>
  );
}
