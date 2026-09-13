import type { ReactNode, SelectHTMLAttributes } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

/**
 * Campos de formulario. En teléfono el texto va a 16px: con menos, Safari de
 * iOS hace zoom al enfocar el campo y deja la pantalla corrida.
 */
export const inputClass =
  "block h-10 w-full min-w-0 rounded-control border border-line-strong bg-surface px-3 text-base text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:ring-1 focus:ring-accent focus-visible:outline-none disabled:opacity-50 sm:h-9 sm:text-sm";

export const labelClass = "text-label text-ink-2";

/** Etiqueta encima del campo, con ayuda opcional debajo. */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="text-meta text-ink-3">{hint}</span>}
    </label>
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative block min-w-0 ${className}`}>
      <select {...props} className={`${inputClass} cursor-pointer appearance-none pr-8`}>
        {children}
      </select>
      <CaretDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </span>
  );
}

/** Mensaje de error de un formulario, anunciado por lectores de pantalla. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-label font-normal text-expense">
      {children}
    </p>
  );
}
