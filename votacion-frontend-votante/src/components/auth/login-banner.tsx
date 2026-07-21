export type LoginBannerVariant = "error" | "warning";

interface LoginBannerProps {
  variant: LoginBannerVariant;
  title: string;
  text: string;
}

const VARIANT_STYLES: Record<
  LoginBannerVariant,
  { bg: string; border: string; icon: string; title: string; text: string }
> = {
  error: {
    bg: "#fdecec",
    border: "#f6c6c6",
    icon: "#d64545",
    title: "#9c2b2b",
    text: "#a83d3d",
  },
  warning: {
    bg: "#fff4e5",
    border: "#f6d9a8",
    icon: "#c9821a",
    title: "#8a5a10",
    text: "#9c6a1f",
  },
};

/**
 * Banner de error/advertencia del formulario de login. Reutilizable para
 * credenciales inválidas, cuenta bloqueada y falla de conexión (mismo
 * componente que el panel de administración).
 */
export function LoginBanner({ variant, title, text }: LoginBannerProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role="alert"
      className="mb-[22px] flex animate-shake items-start gap-2.5 rounded-[10px] border px-3.5 py-3"
      style={{ backgroundColor: styles.bg, borderColor: styles.border }}
    >
      <div className="mt-px h-[18px] w-[18px] flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke={styles.icon} strokeWidth="1.8" />
          <path d="M12 7v6" stroke={styles.icon} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.2" r="1" fill={styles.icon} />
        </svg>
      </div>
      <div>
        <div className="text-[13.5px] font-bold" style={{ color: styles.title }}>
          {title}
        </div>
        <div className="mt-0.5 text-[13px] leading-[1.4]" style={{ color: styles.text }}>
          {text}
        </div>
      </div>
    </div>
  );
}
