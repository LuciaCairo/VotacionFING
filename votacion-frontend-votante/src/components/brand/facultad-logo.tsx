import Image from "next/image";

interface FacultadLogoProps {
  className?: string;
}

/** Isotipo de la Facultad de Ingeniería (blanco, pensado para fondos oscuros). */
export function FacultadLogo({ className }: FacultadLogoProps) {
  return (
    <Image
      src="/logo-fing.png"
      alt="Facultad de Ingeniería"
      width={264}
      height={90}
      priority
      className={className}
    />
  );
}
