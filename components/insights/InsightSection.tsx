import type { ReactNode } from "react";

/**
 * Bloque de Estadísticas: una línea fina arriba, título y contexto, y el
 * contenido directo sobre la página. En una grilla de dos columnas cada
 * bloque trae su propia línea, así se leen como columnas de un informe y no
 * como widgets encajonados.
 */
export function InsightSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="min-w-0 border-t border-line pb-10 pt-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={`${id}-titulo`} className="text-heading text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-meta text-ink-3">{description}</p>}
        </div>
        {action && <div className="-mt-1 shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
