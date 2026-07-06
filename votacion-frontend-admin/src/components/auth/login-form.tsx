"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginAdminSchema, type LoginAdminInput } from "@/lib/validations/auth";
import { classifyLoginError, useLoginAdmin } from "@/hooks/use-login";
import { saveAdminSession, useAdminSession } from "@/lib/auth/session";
import { LoginBanner } from "./login-banner";

/** A dónde redirigir tras un login exitoso. */
const POST_LOGIN_REDIRECT = "/admin";
/** Tiempo que se muestra la animación de éxito antes de redirigir. */
const SUCCESS_REDIRECT_DELAY_MS = 1400;

/**
 * Credenciales del admin de prueba (`votacion-backend/prisma/seed.ts`).
 * Solo para el botón de inicio rápido de desarrollo: `NODE_ENV` se resuelve
 * en build time, así que este bloque (import, botón y handler) se elimina
 * del bundle de producción.
 */
const DEV_ADMIN_CREDENTIALS: LoginAdminInput = {
  correo: "admin@fing.uncuyo.edu.ar",
  password: "admin1234",
};

export function LoginForm() {
  const router = useRouter();
  const mutation = useLoginAdmin();
  const existingSession = useAdminSession();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    resetField,
    setValue,
    formState: { errors },
  } = useForm<LoginAdminInput>({
    resolver: zodResolver(loginAdminSchema),
    defaultValues: { correo: "", password: "" },
  });

  const classifiedError = classifyLoginError(mutation.error);
  const isLocked = classifiedError?.kind === "locked";
  const isPending = mutation.isPending;
  const isSuccess = mutation.isSuccess;
  const isFormDisabled = isPending || isLocked || isSuccess;

  // Si ya hay una sesión de administrador guardada, no tiene sentido mostrar
  // el formulario de login: mandamos directo al panel. `existingSession` es
  // reactivo (useSyncExternalStore), así que el chequeo también gatea el
  // render más abajo y evita que el formulario llegue a verse un instante
  // antes de redirigir.
  useEffect(() => {
    if (existingSession) router.replace(POST_LOGIN_REDIRECT);
  }, [existingSession, router]);

  // Al loguear con éxito: persistimos la sesión y, tras la animación,
  // redirigimos al panel.
  useEffect(() => {
    if (!mutation.isSuccess || !mutation.data) return;

    saveAdminSession({
      token: mutation.data.token,
      admin: mutation.data.admin,
    });

    redirectTimeoutRef.current = setTimeout(() => {
      router.push(POST_LOGIN_REDIRECT);
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess, mutation.data]);

  // Tras un intento fallido, borramos la contraseña tanto del campo como del
  // estado del form: no queremos que quede en el DOM más tiempo del
  // necesario (shoulder surfing, devtools, etc.) ni que un submit accidental
  // reenvíe la misma contraseña rechazada.
  useEffect(() => {
    if (mutation.isError) resetField("password");
  }, [mutation.isError, resetField]);

  function onSubmit(values: LoginAdminInput) {
    if (isFormDisabled) return;
    mutation.mutate(values);
  }

  // Si el usuario vuelve a editar los campos, dejamos que reintente: el
  // banner (incluido "cuenta bloqueada") no debe quedar pegado para
  // siempre si ya pasó la ventana de bloqueo del backend.
  function handleFieldChange() {
    if (mutation.isError) mutation.reset();
  }

  function handleQuickStart() {
    if (isFormDisabled) return;
    setValue("correo", DEV_ADMIN_CREDENTIALS.correo);
    setValue("password", DEV_ADMIN_CREDENTIALS.password);
    handleSubmit(onSubmit)();
  }

  if (existingSession) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <span
          className="h-8 w-8 animate-spin-fast rounded-full border-[3px] border-[#cfe6f9]"
          style={{ borderTopColor: "#1f8fe0" }}
          aria-hidden="true"
        />
        <p className="text-sm text-[#5b6b7c]">Redirigiendo al panel...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex animate-pop-in flex-col items-center gap-[18px] text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#e6f6ee]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12.5l5 5L20 6"
              stroke="#1e9e5c"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-[22px] font-extrabold text-[#0a2540]">
          Inicio de sesión exitoso
        </div>
        <div className="max-w-[320px] text-sm text-[#5b6b7c]">
          Autenticación verificada. Te estamos redirigiendo al panel de
          administración.
        </div>
        <div className="mt-1.5 flex items-center gap-2.5 text-[13px] font-semibold text-[#1f8fe0]">
          <span
            className="h-4 w-4 animate-spin-fast rounded-full border-2 border-[#cfe6f9]"
            style={{ borderTopColor: "#1f8fe0" }}
            aria-hidden="true"
          />
          Redirigiendo...
        </div>
      </div>
    );
  }

  const eyebrow =
    classifiedError?.kind === "network"
      ? "Error de conexión"
      : isLocked
        ? "Acceso restringido"
        : classifiedError || errors.correo || errors.password
          ? "Error de acceso"
          : "Bienvenido";

  return (
    <div>
      <div className="mb-1.5 text-xs font-bold tracking-[1px] text-[#1f8fe0] uppercase">
        {eyebrow}
      </div>
      <h1 className="mb-2 text-[26px] font-extrabold text-[#0a2540]">
        Iniciar sesión
      </h1>
      <p className="mb-5 text-sm text-[#5b6b7c]">
        Ingresá con tus credenciales de administrador.
      </p>

      {classifiedError?.kind === "invalid_credentials" && (
        <LoginBanner
          variant="error"
          title="Credenciales incorrectas"
          text="El correo o la contraseña no coinciden. Verificá los datos e intentá nuevamente."
        />
      )}
      {classifiedError?.kind === "locked" && (
        <LoginBanner
          variant="error"
          title="Cuenta bloqueada temporalmente"
          text={classifiedError.message}
        />
      )}
      {classifiedError?.kind === "network" && (
        <LoginBanner
          variant="warning"
          title="Sin conexión con el servidor"
          text="No pudimos comunicarnos con el sistema. Revisá tu conexión a internet e intentá de nuevo."
        />
      )}
      {classifiedError?.kind === "unknown" && (
        <LoginBanner
          variant="error"
          title="No se pudo iniciar sesión"
          text={classifiedError.message}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-3 flex flex-col gap-1.5">
          <label
            htmlFor="correo"
            className="text-[12.5px] font-semibold text-[#33475b]"
          >
            Correo electrónico
          </label>
          <input
            id="correo"
            type="email"
            autoComplete="username"
            placeholder="admin@ingenieria.edu"
            disabled={isFormDisabled}
            aria-invalid={!!errors.correo}
            aria-describedby={errors.correo ? "correo-error" : undefined}
            className="rounded-[10px] border-[1.5px] px-3.5 py-2.5 text-sm outline-none disabled:cursor-not-allowed"
            style={{
              borderColor: errors.correo ? "#d64545" : "#d7dde3",
              backgroundColor: isFormDisabled ? "#f4f6f8" : "#fff",
            }}
            {...register("correo", { onChange: handleFieldChange })}
          />
          {errors.correo && (
            <span id="correo-error" className="text-xs font-medium text-[#d64545]">
              {errors.correo.message}
            </span>
          )}
        </div>

        <div className="mb-2 flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-[12.5px] font-semibold text-[#33475b]"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isFormDisabled}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="rounded-[10px] border-[1.5px] px-3.5 py-2.5 text-sm outline-none disabled:cursor-not-allowed"
            style={{
              borderColor: errors.password ? "#d64545" : "#d7dde3",
              backgroundColor: isFormDisabled ? "#f4f6f8" : "#fff",
            }}
            {...register("password", { onChange: handleFieldChange })}
          />
          {errors.password && (
            <span id="password-error" className="text-xs font-medium text-[#d64545]">
              {errors.password.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isFormDisabled}
          aria-busy={isPending}
          className="mt-1.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border-none py-3 text-[15px] font-bold text-white transition-colors disabled:cursor-not-allowed"
          style={{
            backgroundColor: isLocked ? "#9fc8ec" : "#1f8fe0",
            boxShadow: isLocked ? "none" : "0 8px 20px rgba(31,143,224,0.35)",
          }}
        >
          {isPending && (
            <span
              className="h-4 w-4 animate-spin-fast rounded-full border-2 border-white/40"
              style={{ borderTopColor: "#fff" }}
              aria-hidden="true"
            />
          )}
          {isLocked
            ? "Cuenta bloqueada"
            : isPending
              ? "Verificando..."
              : "Iniciar sesión"}
        </button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={handleQuickStart}
          disabled={isFormDisabled}
          className="mt-3 w-full rounded-[10px] border border-dashed border-[#c8d3dc] py-2 text-xs font-semibold text-[#5b6b7c] transition-colors hover:bg-[#f4f6f8] disabled:cursor-not-allowed"
        >
          ⚡ Inicio rápido (dev) — admin de prueba
        </button>
      )}

      <div className="mt-4 text-center text-xs text-[#9aa7b3]">
        Sistema de Votación Electrónica — Acceso restringido
      </div>
    </div>
  );
}
