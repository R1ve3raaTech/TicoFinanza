import type { ReactNode } from "react";
import type { SettingsSectionId } from "./sections";

/**
 * Sección de Ajustes: título, una línea de contexto y filas separadas por
 * líneas finas — como los ajustes de una app nativa. Reemplaza la pila de
 * tarjetas con ícono en círculo que había antes.
 */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: SettingsSectionId;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      // Deja lugar para lo que queda fijo arriba al saltar desde el índice:
      // encabezado + índice en teléfono, solo el índice en tablet.
      className="scroll-mt-28 pb-10 md:scroll-mt-16 md:pb-12 lg:scroll-mt-10"
    >
      <h2 id={`${id}-titulo`} className="text-heading text-ink">
        {title}
      </h2>
      {description && <p className="mt-0.5 max-w-[62ch] text-sm text-ink-3">{description}</p>}
      <div className="mt-4 border-t border-line">{children}</div>
    </section>
  );
}

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
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-3.5">
        <div className="min-w-[12rem] flex-1">{text}</div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 border-b border-line py-3.5 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 ${
        alignTop ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <div className={alignTop ? "sm:pt-2" : undefined}>{text}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
