"use client";

import { useState } from "react";
import { useLogout } from "@/hooks/use-logout";
import { VotanteShell } from "@/components/votante/votante-shell";
import type { VotanteSeccion } from "@/components/votante/votante-sidebar";

/**
 * Única página del área del votante: el nav (sidebar) no navega de verdad
 * entre "Elecciones vigentes"/"Elecciones finalizadas" — cambia
 * `activeSeccion`, igual que el Home del admin con sus 3 secciones. El
 * contenido de cada sección es un placeholder a propósito: viene con su
 * propio prompt y prototipo de referencia, trabajo aparte de este nav.
 */
export default function VotantePage() {
  const logout = useLogout();
  const [activeSeccion, setActiveSeccion] = useState<VotanteSeccion>("vigentes");

  return (
    <VotanteShell
      activeSeccion={activeSeccion}
      onSelectSeccion={setActiveSeccion}
      onLogout={logout}
    >
      <div className="text-sm text-[#5b6b7c]">
        {activeSeccion === "vigentes"
          ? "Elecciones vigentes — próximamente."
          : "Elecciones finalizadas — próximamente."}
      </div>
    </VotanteShell>
  );
}
