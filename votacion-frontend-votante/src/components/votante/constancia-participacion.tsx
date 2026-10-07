import { formatFechaHora } from "@/lib/format";

interface ConstanciaParticipacionProps {
  eleccion: string;
  fechaVoto: string;
}

/**
 * Constancia de que el votante participó en la elección. Se usa tanto en la
 * confirmación de un voto recién emitido como en la pantalla de "ya votaste"
 * (ver VotarResponse / ComprobanteDTO en lib/api/elecciones.ts).
 *
 * A propósito no muestra ningún hash: con el hash de la transacción en BFA se
 * puede leer la lista elegida, y entonces el votante podría demostrarle a
 * otra persona a quién votó.
 */
export function ConstanciaParticipacion({
  eleccion,
  fechaVoto,
}: ConstanciaParticipacionProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[12px] border border-[#e2e7ec] bg-[#f7f9fb] p-3.5 text-left">
      <div className="text-[11.5px] font-bold tracking-[0.4px] text-[#5b6b7c]">
        CONSTANCIA DE PARTICIPACIÓN
      </div>
      <dl className="flex flex-col gap-1.5 text-[13px] leading-[1.45]">
        <div className="flex flex-wrap gap-x-1.5">
          <dt className="text-[#5b6b7c]">Elección:</dt>
          <dd className="font-bold text-[#0a2540]">{eleccion}</dd>
        </div>
        <div className="flex flex-wrap gap-x-1.5">
          <dt className="text-[#5b6b7c]">Fecha y hora:</dt>
          <dd className="font-bold text-[#0a2540]">
            {formatFechaHora(fechaVoto)}
          </dd>
        </div>
      </dl>
      <p className="text-[12px] leading-[1.45] text-[#5b6b7c]">
        No incluye la opción que elegiste ni ningún dato que permita encontrar
        tu voto en la blockchain: así nadie puede saber ni demostrar a quién
        votaste.
      </p>
    </div>
  );
}
