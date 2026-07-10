"use client";

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
  onConfirm: () => void;
}

/**
 * Botón "Cerrar sesión" del sidebar + confirmación: evita un logout
 * accidental por un click de más (el botón está pegado abajo del todo,
 * cerca de otras acciones del sidebar).
 */
export function CerrarSesionDialog({ onConfirm }: CerrarSesionDialogProps) {
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
            Vas a salir del panel de administración. Vas a necesitar volver a
            ingresar tus credenciales para entrar de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Sí, cerrar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
