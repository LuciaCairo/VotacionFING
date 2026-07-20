"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmarCreacionDialog } from "@/components/admin/eleccion/confirmar-creacion-dialog";
import { ListaDialog, PALETA_LISTAS } from "@/components/admin/eleccion/lista-dialog";
import { ListaFormRow } from "@/components/admin/eleccion/lista-form-row";
import { SaldoBlockchainIndicator } from "@/components/admin/eleccion/saldo-blockchain-indicator";
import { useCrearEleccion } from "@/hooks/use-crear-eleccion";
import { useLogout } from "@/hooks/use-logout";
import type { CrearEleccionInput, Seccion } from "@/lib/api/elecciones";
import { ApiError } from "@/lib/api/errors";
import { clearAdminSession } from "@/lib/auth/session";
import {
  MINIMO_LISTAS,
  crearEleccionFormSchema,
  type CrearEleccionFormValues,
} from "@/lib/validations/eleccion";

interface ListaFormState {
  /** Solo para el key de React / identificar cuál se edita — nunca se manda al backend. */
  id: string;
  nombre: string;
  color: string;
}

interface DialogListaState {
  open: boolean;
  modo: "agregar" | "editar";
  editId: string | null;
  initialNombre: string;
  initialColor: string;
}

const DIALOG_CERRADO: DialogListaState = {
  open: false,
  modo: "agregar",
  editId: null,
  initialNombre: "",
  initialColor: PALETA_LISTAS[0],
};

export default function CrearEleccionPage() {
  const router = useRouter();
  const logout = useLogout();
  const mutation = useCrearEleccion();

  const [listas, setListas] = useState<ListaFormState[]>([]);
  const [listasError, setListasError] = useState<string | null>(null);
  const [dialogLista, setDialogLista] = useState<DialogListaState>(DIALOG_CERRADO);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formValues, setFormValues] = useState<CrearEleccionFormValues | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CrearEleccionFormValues>({
    resolver: zodResolver(crearEleccionFormSchema),
    defaultValues: { nombre: "", fechaInicio: "", fechaCierre: "" },
  });

  const fechaInicioValue = watch("fechaInicio");

  // Límite inferior para el input de fecha de inicio (no puede ser pasado).
  // Se calcula una sola vez al montar: no hace falta que seachine cada
  // segundo, alcanza con no ofrecer un default ya vencido.
  const minFechaInicio = useMemo(() => new Date().toISOString().slice(0, 16), []);

  function irASeccion(seccion: Seccion) {
    router.push(`/admin?seccion=${seccion}`);
  }

  function abrirAgregarLista() {
    setDialogLista({
      open: true,
      modo: "agregar",
      editId: null,
      initialNombre: "",
      initialColor: PALETA_LISTAS[0],
    });
  }

  function abrirEditarLista(item: ListaFormState) {
    setDialogLista({
      open: true,
      modo: "editar",
      editId: item.id,
      initialNombre: item.nombre,
      initialColor: item.color,
    });
  }

  function guardarLista(nombre: string, color: string) {
    setListas((prev) => {
      if (dialogLista.editId !== null) {
        return prev.map((item) =>
          item.id === dialogLista.editId ? { ...item, nombre, color } : item,
        );
      }
      return [...prev, { id: crypto.randomUUID(), nombre, color }];
    });
    setListasError(null);
    setDialogLista(DIALOG_CERRADO);
  }

  function eliminarLista(id: string) {
    setListas((prev) => prev.filter((item) => item.id !== id));
  }

  function onValidSubmit(values: CrearEleccionFormValues) {
    if (listas.length < MINIMO_LISTAS) {
      setListasError(
        `Agregá al menos ${MINIMO_LISTAS} listas para poder crear la elección.`,
      );
      return;
    }
    setListasError(null);
    setFormValues(values);
    setConfirmOpen(true);
  }

  async function handleConfirmar() {
    if (!formValues) return;

    const payload: CrearEleccionInput = {
      nombre: formValues.nombre.trim(),
      fecha_inicio: new Date(formValues.fechaInicio).toISOString(),
      fecha_cierre: new Date(formValues.fechaCierre).toISOString(),
      listas: listas.map(({ nombre, color }) => ({ nombre, color })),
    };

    try {
      await mutation.mutateAsync(payload);
      router.push("/admin?seccion=creada");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAdminSession();
        router.replace("/login");
      }
      // Cualquier otro error (validación de negocio, deploy fallido, red):
      // el diálogo de confirmación queda abierto mostrando el mensaje.
    }
  }

  function handleCancelarConfirmacion() {
    setConfirmOpen(false);
    mutation.reset();
  }

  const mensajeErrorConfirmacion =
    mutation.error instanceof ApiError && mutation.error.status !== 401
      ? mutation.error.message
      : mutation.error
        ? "No pudimos crear la elección. Intentá nuevamente."
        : null;

  const nombresExistentes = listas
    .filter((item) => item.id !== dialogLista.editId)
    .map((item) => item.nombre);

  const formDisabled = mutation.isPending;

  return (
    <AdminShell
      activeSeccion={null}
      onSelectSeccion={irASeccion}
      onLogout={logout}
      mobileTitle="Crear Elección"
    >
      <div className="mx-auto w-full max-w-[1080px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-[#0a2540]">Crear Elección</h1>
          <SaldoBlockchainIndicator />
        </div>

        <form
          onSubmit={handleSubmit(onValidSubmit)}
          noValidate
          className="rounded-2xl bg-white p-8 shadow-[0_4px_14px_rgba(10,37,64,0.06)]"
        >
          <div className="mb-[18px] flex flex-col gap-1.5">
            <label htmlFor="nombre" className="text-[12.5px] font-semibold text-[#33475b]">
              Nombre de la elección
            </label>
            <input
              id="nombre"
              type="text"
              placeholder="Ej: Elección Centro de Estudiantes"
              disabled={formDisabled}
              aria-invalid={!!errors.nombre}
              aria-describedby={errors.nombre ? "nombre-error" : undefined}
              className="rounded-[10px] border-[1.5px] px-3.5 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-[#f4f6f8]"
              style={{ borderColor: errors.nombre ? "#d64545" : "#d7dde3" }}
              {...register("nombre")}
            />
            {errors.nombre && (
              <span id="nombre-error" className="text-xs font-medium text-[#d64545]">
                {errors.nombre.message}
              </span>
            )}
          </div>

          <div className="mb-[26px] grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fechaInicio" className="text-[12.5px] font-semibold text-[#33475b]">
                Fecha de inicio
              </label>
              <input
                id="fechaInicio"
                type="datetime-local"
                min={minFechaInicio}
                disabled={formDisabled}
                aria-invalid={!!errors.fechaInicio}
                aria-describedby={errors.fechaInicio ? "fechaInicio-error" : undefined}
                className="rounded-[10px] border-[1.5px] px-3.5 py-3 text-[13.5px] text-[#33475b] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f6f8]"
                style={{ borderColor: errors.fechaInicio ? "#d64545" : "#d7dde3" }}
                {...register("fechaInicio")}
              />
              {errors.fechaInicio && (
                <span id="fechaInicio-error" className="text-xs font-medium text-[#d64545]">
                  {errors.fechaInicio.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fechaCierre" className="text-[12.5px] font-semibold text-[#33475b]">
                Fecha de cierre
              </label>
              <input
                id="fechaCierre"
                type="datetime-local"
                min={fechaInicioValue || minFechaInicio}
                disabled={formDisabled}
                aria-invalid={!!errors.fechaCierre}
                aria-describedby={errors.fechaCierre ? "fechaCierre-error" : undefined}
                className="rounded-[10px] border-[1.5px] px-3.5 py-3 text-[13.5px] text-[#33475b] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f6f8]"
                style={{ borderColor: errors.fechaCierre ? "#d64545" : "#d7dde3" }}
                {...register("fechaCierre")}
              />
              {errors.fechaCierre && (
                <span id="fechaCierre-error" className="text-xs font-medium text-[#d64545]">
                  {errors.fechaCierre.message}
                </span>
              )}
            </div>
          </div>

          <div className="mb-3 text-[12.5px] font-bold tracking-[0.4px] text-[#5b6b7c] uppercase">
            Listas
          </div>

          <div className="mb-4 flex flex-col gap-2.5">
            {listas.map((item) => (
              <ListaFormRow
                key={item.id}
                nombre={item.nombre}
                color={item.color}
                disabled={formDisabled}
                onEdit={() => abrirEditarLista(item)}
                onDelete={() => eliminarLista(item.id)}
              />
            ))}

            {listas.length === 0 && (
              <div className="rounded-[10px] border border-dashed border-[#d7dde3] p-4 text-center text-[13px] text-[#9aa7b3]">
                Todavía no agregaste listas.
              </div>
            )}
          </div>

          {listasError && (
            <p role="alert" className="mb-4 text-xs font-semibold text-[#d64545]">
              {listasError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={abrirAgregarLista}
              disabled={formDisabled}
              className="rounded-[10px] border-none bg-[#1f8fe0] px-6 py-3 text-sm font-bold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar Lista
            </button>

            <button
              type="submit"
              disabled={formDisabled}
              className="rounded-[10px] border-none bg-[#0a2540] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(10,37,64,0.25)] transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Crear Elección
            </button>
          </div>
        </form>
      </div>

      <ListaDialog
        open={dialogLista.open}
        modo={dialogLista.modo}
        initialNombre={dialogLista.initialNombre}
        initialColor={dialogLista.initialColor}
        nombresExistentes={nombresExistentes}
        onCancel={() => setDialogLista(DIALOG_CERRADO)}
        onSave={guardarLista}
      />

      <ConfirmarCreacionDialog
        open={confirmOpen}
        isPending={mutation.isPending}
        errorMessage={mensajeErrorConfirmacion}
        onConfirm={handleConfirmar}
        onCancel={handleCancelarConfirmacion}
      />
    </AdminShell>
  );
}
