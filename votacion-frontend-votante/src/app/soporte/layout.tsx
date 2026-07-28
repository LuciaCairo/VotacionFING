import { VotanteGuard } from "@/components/votante/votante-guard";

export default function SoporteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VotanteGuard>{children}</VotanteGuard>;
}
