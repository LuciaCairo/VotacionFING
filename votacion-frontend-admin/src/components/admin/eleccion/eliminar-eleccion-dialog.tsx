"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { useEliminarEleccion } from "@/hooks/use-eliminar-eleccion";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";

interface EliminarEleccionDialogProps {
  eleccionId: number;
  nombreEleccion: string;
}

/**
 * Botón "Eliminar Elección" + confirmación (irreversible). El backend puede
 * rechazar el borrado con 409 si la elección ya comenzó o su fecha de inicio
 * ya pasó (ver useEliminarEleccion) — ese mensaje se muestra tal cual, no un
 * error genérico, dentro del mismo diálogo (no se cierra en error, así el
 * mensaje queda visible y se puede reintentar sin volver a abrirlo).
 */
export function EliminarEleccionDialog({
  eleccionId,
  nombreEleccion,
}: EliminarEleccionDialogProps) {
  const router = useRouter();
  const mutation = useEliminarEleccion();
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    // Al reabrir, limpiamos el error de un intento anterior para no arrastrar
    // un mensaje viejo a una confirmación nueva.
    if (nextOpen) mutation.reset();
    setOpen(nextOpen);
  }

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(eleccionId);
      router.push("/admin");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAdminSession();
        router.replace("/login");
      }
      // 409 (regla de fecha), 404 o red: el diálogo queda abierto con el
      // mensaje de mutation.error visible más abajo.
    }
  }

  const mensajeError =
    mutation.error instanceof ApiError && mutation.error.status !== 401
      ? mutation.error.message
      : mutation.error
        ? "No pudimos eliminar la elección. Intentá nuevamente."
        : null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        disabled={mutation.isPending}
        className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-[#f0b8b8] bg-[#fdecec] px-[22px] py-3 text-[13.5px] font-bold text-[#c23b3b] transition-colors hover:bg-[#fbe0e0] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Eliminar Elección
        <Trash2 className="size-4" aria-hidden="true" />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta elección?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar <strong>{nombreEleccion}</strong> junto con todas
            sus listas. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mensajeError && (
          <p
            role="alert"
            className="rounded-[8px] bg-[#fdecec] px-3.5 py-2.5 text-[13px] font-semibold text-[#c23b3b]"
          >
            {mensajeError}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Eliminando…" : "Sí, eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
