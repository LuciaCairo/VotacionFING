import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Panel de Administración",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-1 items-center justify-center bg-[#eef1f5] px-6 py-4 md:px-12 md:py-6">
      <div className="flex w-full max-w-[920px] min-h-[460px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_rgba(10,37,64,0.25)] md:flex-row">
        {/* Panel izquierdo: marca */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[linear-gradient(160deg,#0d3a63_0%,#0a2540_55%,#071a30_100%)] px-9 py-6 md:basis-[42%] md:px-14 md:py-8">
          <div className="pointer-events-none absolute top-[-60px] right-[-60px] h-[220px] w-[220px] rounded-full border border-white/[0.08]" />
          <div className="pointer-events-none absolute right-[-20px] bottom-[-80px] h-[260px] w-[260px] rounded-full border border-white/[0.06]" />

          <FacultadLogo />

          <div className="z-10 mt-6 md:mt-8">
            <div className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.5px] text-white md:text-[32px]">
              INGRESO
              <br />
              ADMINISTRADOR
            </div>
            <div className="mt-3.5 max-w-[280px] text-sm leading-[1.5] text-white/65">
              Panel de administración del sistema de votación electrónica.
            </div>
          </div>

          <div className="flex-1" />

          <div className="z-10 text-[11px] text-white/40">
            © 2026 Facultad de Ingeniería — Uso exclusivo de administradores
          </div>
        </div>

        {/* Panel derecho: formulario */}
        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-6 md:basis-[58%] md:px-14 md:py-8 lg:px-16">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

function FacultadLogo() {
  return (
    <div className="z-10 h-[84px] w-[75%]">
      <Image
        src="/logo-fing.png"
        alt="Facultad de Ingeniería"
        width={264}
        height={90}
        priority
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
