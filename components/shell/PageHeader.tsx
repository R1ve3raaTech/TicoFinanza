import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

/**
 * Encabezado interno de cada pantalla. Va dentro del contenedor de la página
 * (que en teléfono tiene `px-4`).
 *
 * - Teléfono: barra fija arriba, compacta, con el símbolo, el título y las
 *   acciones como íconos.
 * - md+: título de tamaño de sección (no de portada), contexto debajo y las
 *   acciones con texto a la derecha. El rail ya lleva la marca.
 */
export function PageHeader({
  title,
  meta,
  actions,
  mobileActions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 flex h-14 items-center justify-between gap-3 border-b border-line bg-ground px-4 md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={18} className="shrink-0 text-ink" />
          <h1 className="truncate text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
            {title}
          </h1>
        </div>
        {mobileActions && (
          <div className="flex shrink-0 items-center gap-1">{mobileActions}</div>
        )}
      </header>

      <header className="hidden items-end justify-between gap-6 pb-6 pt-8 md:flex xl:pt-10">
        <div className="min-w-0">
          <h1 className="text-title text-ink">{title}</h1>
          {meta && <p className="mt-0.5 text-sm text-ink-3">{meta}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
    </>
  );
}
