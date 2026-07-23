"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CerrarSesionDialogProps {
  onConfirm: () => void | Promise<void>;
}

/**
 * Botón "Cerrar sesión" del sidebar + confirmación: mismo criterio que el
 * panel de administración (ver
 * votacion-frontend-admin/src/components/admin/cerrar-sesion-dialog.tsx),
 * evita un logout accidental por un click de más.
 */
export function CerrarSesionDialog({ onConfirm }: CerrarSesionDialogProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // No reseteamos `isLoggingOut` a false tras el `await`: un logout exitoso
  // navega a /login y desmonta este componente, así que volver a habilitar
  // los botones acá solo generaría un parpadeo previo a la redirección.
  async function handleConfirm() {
    setIsLoggingOut(true);
    await onConfirm();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className="flex items-center gap-2 pt-3 text-[12.5px] font-semibold text-white/60 transition-colors hover:text-white/80">
        Cerrar sesión
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12h13M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a salir del sistema de votación. Vas a necesitar volver a
            ingresar tus credenciales para entrar de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoggingOut}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="flex items-center justify-center gap-2"
          >
            {isLoggingOut && (
              <span
                className="h-3.5 w-3.5 animate-spin-fast rounded-full border-2 border-white/40"
                style={{ borderTopColor: "#fff" }}
                aria-hidden="true"
              />
            )}
            {isLoggingOut ? "Cerrando sesión..." : "Sí, cerrar sesión"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
