import type { ReactNode } from "react";

/**
 * Fila de ajuste.
 * - Normal: etiqueta a la izquierda y control a la derecha (apilados en
 *   teléfono).
 * - `inline`: descripción a la izquierda y una acción corta a la derecha,
 *   en todos los tamaños (ej. "Descargar CSV", un interruptor).
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  inline = false,
  alignTop = false,
  children,
}: {
  label?: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  inline?: boolean;
  alignTop?: boolean;
  children?: ReactNode;
}) {
  const text = (
    <div className="min-w-0">
      {label &&
        (htmlFor ? (
          <label htmlFor={htmlFor} className="block text-label text-ink">
            {label}
          </label>
        ) : (
          <div className="text-label text-ink">{label}</div>
        ))}
      {description && <p className="mt-0.5 text-meta text-ink-3">{description}</p>}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-b border-line py-2.5">
        <div className="min-w-[12rem] flex-1">{text}</div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1.5 border-b border-line py-2.5 sm:grid sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6 ${
        alignTop ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <div className={alignTop ? "sm:pt-2" : undefined}>{text}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
