import { VotanteGuard } from "@/components/votante/votante-guard";

export default function EleccionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VotanteGuard>{children}</VotanteGuard>;
}
