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
} from "@/components/ui/alert-dialog";

interface ConfirmarCreacionDialogProps {
  open: boolean;
  isPending: boolean;
  /** `null` cuando no hay error, o cuando el error ya se está manejando aparte (ej. 401 -> redirect a /login). */
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación de inmutabilidad antes del POST real (no está en el mock: la
 * elección y sus listas quedan definitivas apenas se crea el contrato en
 * BFA). Solo se abre si las validaciones del formulario ya pasaron — ver
 * app/admin/elecciones/nueva/page.tsx. Mismo patrón de AlertDialog que
 * EliminarEleccionDialog: en error el diálogo NO se cierra, el mensaje queda
 * visible para reintentar sin perder el contexto.
 */
export function ConfirmarCreacionDialog({
  open,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmarCreacionDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Mientras el deploy está en curso no se puede cancelar (ni con
        // Escape ni clickeando afuera): ya se disparó una operación cara e
        // irreversible, cerrar el diálogo no la cancela.
        if (!nextOpen && !isPending) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmás la creación?</AlertDialogTitle>
          <AlertDialogDescription>
            Una vez creada, esta elección y sus listas quedan definitivas: no
            existe forma de editarlas después. Revisá bien los datos antes de
            continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-[8px] bg-[#fdecec] px-3.5 py-2.5 text-[13px] font-semibold text-[#c23b3b]"
          >
            {errorMessage}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Revisar de nuevo
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? "Creando…" : "Confirmar y crear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
