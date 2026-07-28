"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { loginVotanteSchema, type LoginVotanteInput } from "@/lib/validations/auth";
import { classifyLoginError, useLoginVotante } from "@/hooks/use-login";
import { saveVotanteSession, useVotanteSession } from "@/lib/auth/session";
import { LoginBanner } from "./login-banner";

/** A dónde redirigir tras un login exitoso. */
const POST_LOGIN_REDIRECT = "/votante";
/** Tiempo que se muestra la animación de éxito antes de redirigir. */
const SUCCESS_REDIRECT_DELAY_MS = 1400;

/**
 * Credenciales de un votante de prueba (`votacion-backend/prisma/seed.ts`).
 * Solo para el botón de inicio rápido de desarrollo: `NODE_ENV` se resuelve
 * en build time, así que este bloque se elimina del bundle de producción.
 */
const DEV_VOTANTE_CREDENTIALS: LoginVotanteInput = {
  legajo: "12345",
  password: "votante1234",
};

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const mutation = useLoginVotante();
  const existingSession = useVotanteSession();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    resetField,
    setValue,
    formState: { errors },
  } = useForm<LoginVotanteInput>({
    resolver: zodResolver(loginVotanteSchema),
    defaultValues: { legajo: "", password: "" },
  });

  const classifiedError = classifyLoginError(mutation.error);
  const isLocked = classifiedError?.kind === "locked";
  const isPending = mutation.isPending;
  const isSuccess = mutation.isSuccess;
  const isFormDisabled = isPending || isLocked || isSuccess;

  // Si ya hay una sesión de votante guardada, no tiene sentido mostrar el
  // formulario de login: mandamos directo al sistema. `existingSession` es
  // reactivo (useSyncExternalStore), así que el chequeo también gatea el
  // render más abajo y evita que el formulario llegue a verse un instante
  // antes de redirigir. `mounted` retrasa esa decisión un render (mismo
  // patrón que VotanteGuard, ver components/votante/votante-guard.tsx): en
  // el primer render de hidratación `existingSession` siempre da `null`
  // aunque haya sesión guardada, así que sin este retraso se vería el
  // formulario completo un instante antes de saltar a "Redirigiendo...".
  useEffect(() => {
    if (mounted && existingSession) router.replace(POST_LOGIN_REDIRECT);
  }, [mounted, existingSession, router]);

  // Al loguear con éxito: persistimos la sesión y, tras la animación,
  // redirigimos.
  useEffect(() => {
    if (!mutation.isSuccess || !mutation.data) return;

    saveVotanteSession({
      token: mutation.data.token,
      votante: mutation.data.votante,
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
  // necesario ni que un submit accidental reenvíe la misma contraseña
  // rechazada.
  useEffect(() => {
    if (mutation.isError) resetField("password");
  }, [mutation.isError, resetField]);

  function onSubmit(values: LoginVotanteInput) {
    if (isFormDisabled) return;
    mutation.mutate(values);
  }

  // Si el usuario vuelve a editar los campos, dejamos que reintente: el
  // banner (incluido "cuenta bloqueada") no debe quedar pegado para siempre
  // si ya pasó la ventana de bloqueo del backend.
  function handleFieldChange() {
    if (mutation.isError) mutation.reset();
  }

  function handleQuickStart() {
    if (isFormDisabled) return;
    setValue("legajo", DEV_VOTANTE_CREDENTIALS.legajo);
    setValue("password", DEV_VOTANTE_CREDENTIALS.password);
    handleSubmit(onSubmit)();
  }

  if (!mounted) {
    return null;
  }

  if (existingSession) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <span
          className="h-8 w-8 animate-spin-fast rounded-full border-[3px] border-[#cfe6f9]"
          style={{ borderTopColor: "#1f8fe0" }}
          aria-hidden="true"
        />
        <p className="text-sm text-[#5b6b7c]">Redirigiendo...</p>
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
          Autenticación verificada. Te estamos redirigiendo al sistema de
          votación.
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
        : classifiedError || errors.legajo || errors.password
          ? "Error de acceso"
          : "Bienvenido";

  return (
    <div>
      <div className="mb-1.5 text-xs font-bold tracking-[1px] text-[#1f8fe0] uppercase">
        {eyebrow}
      </div>
      <h1 className="mb-2 text-[24px] font-extrabold text-[#0a2540]">
        Iniciar sesión
      </h1>

      {classifiedError?.kind === "invalid_credentials" && (
        <LoginBanner
          variant="error"
          title="Credenciales incorrectas"
          text="El legajo o la contraseña no coinciden. Verificá los datos e intentá nuevamente."
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
            htmlFor="legajo"
            className="text-[12.5px] font-semibold text-[#33475b]"
          >
            Legajo
          </label>
          <input
            id="legajo"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="12345"
            disabled={isFormDisabled}
            aria-invalid={!!errors.legajo}
            aria-describedby={errors.legajo ? "legajo-error" : undefined}
            className="rounded-[10px] border-[1.5px] px-3.5 py-3 text-base outline-none disabled:cursor-not-allowed sm:py-2.5 sm:text-sm"
            style={{
              borderColor: errors.legajo ? "#d64545" : "#d7dde3",
              backgroundColor: isFormDisabled ? "#f4f6f8" : "#fff",
            }}
            {...register("legajo", { onChange: handleFieldChange })}
          />
          {errors.legajo && (
            <span id="legajo-error" className="text-xs font-medium text-[#d64545]">
              {errors.legajo.message}
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isFormDisabled}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="w-full rounded-[10px] border-[1.5px] px-3.5 py-3 pr-11 text-base outline-none disabled:cursor-not-allowed sm:py-2.5 sm:text-sm"
              style={{
                borderColor: errors.password ? "#d64545" : "#d7dde3",
                backgroundColor: isFormDisabled ? "#f4f6f8" : "#fff",
              }}
              {...register("password", { onChange: handleFieldChange })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={isFormDisabled}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9aa7b3] transition-colors hover:text-[#5b6b7c] disabled:cursor-not-allowed"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </button>
          </div>
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
          className="mt-1.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border-none py-3.5 text-[15px] font-bold text-white transition-colors disabled:cursor-not-allowed sm:py-3"
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
          ⚡ Inicio rápido (dev) — votante de prueba
        </button>
      )}

      {/* En mobile la tarjeta ya está apretada de espacio (bottom sheet a
          pantalla completa); este disclaimer solo se muestra desde el
          panel de escritorio, que tiene lugar de sobra. */}
      <div className="mt-4 hidden text-center text-xs text-[#9aa7b3] md:block">
        Sistema de Votación Electrónica — Acceso restringido a votantes
      </div>
    </div>
  );
}
