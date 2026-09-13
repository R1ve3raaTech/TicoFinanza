import type { ButtonHTMLAttributes } from "react";

/**
 * Jerarquía de botones de la app. La regla: una sola `primary` por pantalla
 * (la acción que la pantalla existe para hacer), y todo lo demás baja a
 * `secondary` o `ghost`. Antes casi cada acción era una pastilla celeste y
 * ninguna se destacaba.
 *
 * - primary: la acción principal de la pantalla o del diálogo.
 * - secondary: alternativa importante (con borde, sin relleno de color).
 * - ghost: acciones contextuales dentro de listas, filas y encabezados.
 * - danger: confirmación destructiva final (dentro de un diálogo).
 * - danger-ghost: el disparador de algo destructivo, antes de confirmar.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
// "field" iguala el alto de un campo de texto (más alto en teléfono), para
// botones que van pegados a un input.
export type ButtonSize = "sm" | "md" | "lg" | "field";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium transition-colors duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-deep",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-hover",
  ghost: "text-ink-2 hover:bg-surface-hover hover:text-ink",
  danger: "bg-danger text-on-danger hover:bg-danger-hover",
  "danger-ghost": "text-expense hover:bg-expense/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-label",
  md: "h-9 px-3.5 text-sm",
  lg: "h-10 px-4 text-sm",
  field: "h-10 px-3.5 text-sm sm:h-9",
};

// Solo ícono: cuadrado del mismo alto que el botón con texto del mismo
// tamaño, para que queden alineados cuando van juntos.
const ICON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
  field: "h-10 w-10 sm:h-9 sm:w-9",
};

export function buttonClass({
  variant = "secondary",
  size = "md",
  icon = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${icon ? ICON_SIZES[size] : SIZES[size]} ${className}`;
}

export function Button({
  variant,
  size,
  icon,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Botón de solo ícono: requiere `aria-label`. */
  icon?: boolean;
}) {
  return <button type={type} className={buttonClass({ variant, size, icon, className })} {...props} />;
}
