import type { Metadata } from "next";
import { FacultadLogo } from "@/components/brand/facultad-logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Votación Electrónica",
};

/**
 * Dos layouts alternativos según ancho (breakpoint `md`, igual criterio que
 * el login del admin), no uno solo "responsivizado" a fuerza de clases: en
 * el celular el patrón es una sola columna a pantalla completa (bottom
 * sheet); en escritorio es el split-screen del admin (panel de marca +
 * formulario) dentro de una caja de alto acotado, para que entre siempre
 * sin scroll en vez de depender de que la ventana sea suficientemente alta.
 *
 * El contenedor mobile fija `overflow-x-hidden` (los círculos decorativos
 * tienen offsets negativos que si no se recortan generan scroll horizontal)
 * pero deja `overflow-y-auto` como red de seguridad: en el caso normal el
 * contenido entra justo en `h-dvh` y no se nota, pero si el banner de error
 * ("Credenciales incorrectas", "Cuenta bloqueada", etc.) agranda la
 * tarjeta, o el celu tiene menos alto disponible que el promedio, hay
 * scroll en vez de contenido recortado.
 */
export default function LoginPage() {
  return (
    <>
      {/* Mobile (< md): una columna a pantalla completa, tarjeta pegada al
          borde inferior con bordes rectos abajo. */}
      <div className="relative flex h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-[linear-gradient(160deg,#0d3a63_0%,#0a2540_55%,#071a30_100%)] md:hidden">
        <div className="pointer-events-none absolute top-[-60px] right-[-60px] h-[220px] w-[220px] rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute right-[-20px] bottom-[-80px] h-[260px] w-[260px] rounded-full border border-white/[0.06]" />

        <div className="z-10 flex w-full flex-1 flex-col items-center justify-center gap-3 px-6 pt-10 pb-8">
          <FacultadLogo className="h-[104px] w-auto object-contain drop-shadow-[0_8px_18px_rgba(5,20,40,0.35)]" />
          <div className="text-center">
            <div className="text-[20px] leading-[1.2] font-extrabold tracking-[-0.3px] text-white">
              Votación Electrónica
            </div>
            <div className="mt-1 text-[13px] leading-[1.4] text-white/70">
              Facultad de Ingeniería — UNCuyo
            </div>
          </div>
        </div>

        <div className="z-10 flex w-full flex-col items-center px-5">
          <div className="animate-slide-up w-full max-w-[380px] rounded-t-[20px] bg-white px-6 pt-7 pb-[max(2.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_45px_rgba(4,14,26,0.35)]">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Desktop (≥ md): mismo patrón split-screen del login del admin —
          caja de alto acotado centrada en la ventana, no una página larga
          que dependa de scroll. */}
      <div className="hidden min-h-dvh w-full flex-1 items-center justify-center bg-[#eef1f5] px-6 py-6 md:flex md:px-12">
        <div className="flex w-full max-w-[920px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_rgba(10,37,64,0.25)] md:min-h-[460px] md:flex-row">
          {/* Panel izquierdo: marca */}
          <div className="relative flex flex-col overflow-hidden bg-[linear-gradient(160deg,#0d3a63_0%,#0a2540_55%,#071a30_100%)] px-9 py-6 md:basis-[42%] md:px-14 md:py-8">
            <div className="pointer-events-none absolute top-[-60px] right-[-60px] h-[220px] w-[220px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute right-[-20px] bottom-[-80px] h-[260px] w-[260px] rounded-full border border-white/[0.06]" />

            <div className="z-10 h-[84px] w-[75%]">
              <FacultadLogo className="h-full w-auto object-contain" />
            </div>

            <div className="z-10 mt-6 md:mt-8">
              <div className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.5px] text-white md:text-[32px]">
                Votación
                <br />
                Electrónica
              </div>
              <div className="mt-3.5 max-w-[280px] text-sm leading-[1.5] text-white/65">
                Sistema de votación electrónica de la Facultad de Ingeniería
                — UNCuyo.
              </div>
            </div>

            <div className="flex-1" />

            <div className="z-10 text-[11px] text-white/40">
              © 2026 Facultad de Ingeniería — Uso exclusivo de votantes
            </div>
          </div>

          {/* Panel derecho: formulario */}
          <div className="flex flex-col justify-center bg-white px-8 py-6 md:basis-[58%] md:px-14 md:py-8 lg:px-16">
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
}
