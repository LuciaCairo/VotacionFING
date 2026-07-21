import { VotanteGuard } from "@/components/votante/votante-guard";

export default function VotanteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VotanteGuard>{children}</VotanteGuard>;
}
