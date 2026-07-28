"use client";

import { useRouter } from "next/navigation";
import { LifeBuoy, Mail, Phone, Clock } from "lucide-react";

/**
 * Datos de contacto INVENTADOS a modo de placeholder — no hay una mesa de
 * ayuda real del sistema de votación todavía. Reemplazar por los datos
 * reales cuando existan.
 */
const CONTACTO_SOPORTE = {
  nombre: "Mesa de Ayuda — Sistema de Votación Electrónica FING",
  correo: "votacion-soporte@fing.uncuyo.edu.ar",
  telefono: "0261 4135000, interno 4321",
  horario: "Lunes a viernes de 8:00 a 18:00 hs",
};

/** Pantalla de soporte, accesible desde el estado de error de la boleta. */
export default function SoportePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-[#d7dde3] p-4 md:p-10 lg:flex lg:h-screen lg:items-center lg:justify-center">
      <div className="mx-auto max-w-[480px] rounded-[20px] bg-[#eef1f5] p-6 shadow-[0_20px_50px_rgba(10,37,64,0.14)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#e7f2fb]">
            <LifeBuoy className="size-7 text-[#1f8fe0]" aria-hidden="true" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-[#0a2540]">
              {CONTACTO_SOPORTE.nombre}
            </div>
            <div className="mt-1 text-[13px] text-[#5b6b7c]">
              Si tuviste un problema al votar, contactate por estos medios.
            </div>
          </div>
        </div>

        <dl className="mt-5 flex flex-col gap-3 rounded-[14px] bg-white p-4 shadow-[0_4px_14px_rgba(10,37,64,0.06)]">
          <div className="flex items-center gap-3">
            <Mail className="size-4.5 shrink-0 text-[#1f8fe0]" aria-hidden="true" />
            <div>
              <dt className="text-[11.5px] font-bold tracking-[0.3px] text-[#5b6b7c]">
                CORREO
              </dt>
              <dd className="text-[13.5px] font-semibold text-[#0a2540]">
                {CONTACTO_SOPORTE.correo}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="size-4.5 shrink-0 text-[#1f8fe0]" aria-hidden="true" />
            <div>
              <dt className="text-[11.5px] font-bold tracking-[0.3px] text-[#5b6b7c]">
                TELÉFONO
              </dt>
              <dd className="text-[13.5px] font-semibold text-[#0a2540]">
                {CONTACTO_SOPORTE.telefono}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="size-4.5 shrink-0 text-[#1f8fe0]" aria-hidden="true" />
            <div>
              <dt className="text-[11.5px] font-bold tracking-[0.3px] text-[#5b6b7c]">
                HORARIO DE ATENCIÓN
              </dt>
              <dd className="text-[13.5px] font-semibold text-[#0a2540]">
                {CONTACTO_SOPORTE.horario}
              </dd>
            </div>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => router.push("/votante")}
          className="mt-5 w-full rounded-full bg-[#1f8fe0] px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#1a7cc4]"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
