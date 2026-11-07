import type { ReactNode } from "react";
import { MoneyDisplay } from "@/components/ui/Money";

/**
 * La cifra con la que abre una sección, y la frase que la explica.
 *
 * Es la misma anatomía del resumen —rótulo chico, cifra grande, oración— y
 * existe para que las otras pantallas dejen de sentirse flojas: entraban
 * directo a una lista, o a tres cifras del mismo tamaño que no decían cuál
 * importaba. Cada sección contesta una pregunta y acá va la respuesta.
 *
 * Una sola cifra `display` por pantalla, como manda el sistema: las demás
 * bajan a `aside`, en línea y a tamaño de metadata.
 */
export function SectionLead({
  label,
  value,
  tone = "ink",
  note,
  aside,
}: {
  /** El rótulo chico de arriba: qué es la cifra. */
  label: string;
  value: number;
  /** "expense" solo cuando el signo significa algo malo de verdad. */
  tone?: "ink" | "expense" | "income";
  /** Una oración que interpreta la cifra. */
  note?: ReactNode;
  /** Las cifras de apoyo, en línea debajo. */
  aside?: ReactNode;
}) {
  const color =
    tone === "expense" ? "text-expense" : tone === "income" ? "text-income" : "text-ink";

  return (
    <section aria-label={label} className="pb-6 pt-4 md:pt-2">
      <p className="text-meta text-ink-3">{label}</p>
      <p className={`mt-1 text-display md:text-display-lg ${color}`}>
        <MoneyDisplay value={value} />
      </p>
      {aside && (
        <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-meta">{aside}</dl>
      )}
      {note && <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ink-2">{note}</p>}
    </section>
  );
}

/** Una cifra de apoyo del encabezado: rótulo y monto en la misma línea. */
export function LeadFigure({
  label,
  children,
  swatch,
}: {
  label: string;
  children: ReactNode;
  /** Clase de color del cuadradito de serie, si la cifra tiene una. */
  swatch?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      {swatch && (
        <span aria-hidden className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-[2px] ${swatch}`} />
      )}
      <dt className="text-ink-3">{label}</dt>
      <dd className="money font-medium text-ink-2">{children}</dd>
    </div>
  );
}
