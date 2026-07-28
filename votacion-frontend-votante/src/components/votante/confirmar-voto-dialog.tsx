"use client";

import { Loader2 } from "lucide-react";
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

interface ConfirmarVotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreEleccion: string;
  etiquetaOpcion: string;
  isSubmitting: boolean;
  onConfirm: () => void;
}

/**
 * Modal de confirmación del voto. Controlado desde afuera (`open`/
 * `onOpenChange`) en vez de un `AlertDialogTrigger` propio, porque lo abre
 * el botón "Votar" de la boleta. Mismo patrón que
 * `CerrarSesionDialog` (ver votacion-frontend-votante/src/components/votante/cerrar-sesion-dialog.tsx):
 * ambas acciones se deshabilitan mientras `isSubmitting`, para no permitir
 * un doble submit con un segundo tap. El `AlertDialog` de base-ui ya es
 * no-descartable por click afuera / Escape (ver AlertDialogRoot), así que
 * la única forma de cerrarlo durante el envío sería estos botones — de ahí
 * alcanza con deshabilitarlos.
 */
export function ConfirmarVotoDialog({
  open,
  onOpenChange,
  nombreEleccion,
  etiquetaOpcion,
  isSubmitting,
  onConfirm,
}: ConfirmarVotoDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmás tu voto?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a votar en <strong>{nombreEleccion}</strong> por:{" "}
            <strong>{etiquetaOpcion}</strong>. Una vez confirmado no se puede
            modificar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <Loader2
                className="size-4 animate-spin-fast"
                aria-hidden="true"
              />
            )}
            {isSubmitting ? "Registrando tu voto..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
