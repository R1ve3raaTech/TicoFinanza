import type { CSSProperties } from "react";

/**
 * La marca cargando: las cuatro piezas se encienden en orden.
 *
 * **No es un círculo girando a propósito.** Un spinner genérico no dice qué
 * app es ni cuánto falta; la marca animada hace que la espera se lea como
 * parte de TicoFinanza y no como el navegador pensando. Va siempre
 * acompañada del esqueleto de la pantalla, que es lo que dice *qué* se está
 * cargando.
 *
 * Es la misma geometría de `BrandMark` —no se puede reusar ese componente
 * porque acá cada pieza necesita su propio retraso— así que si cambia el
 * símbolo, cambia en los dos lados (y en `public/brand/mark.svg`).
 *
 * Con `prefers-reduced-motion` las piezas se quedan quietas y encendidas:
 * se ve la marca, sin parpadeo.
 */
export function BrandLoader({
  size = 28,
  accent = true,
  label = "Cargando",
  className = "",
}: {
  size?: number;
  accent?: boolean;
  /** Lo que anuncia el lector de pantalla. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={label}
      className={`brand-load ${className}`}
    >
      <path
        d="M10.5 2.5H21.5V7.5H10.5A2.5 2.5 0 0 1 10.5 2.5Z"
        fill="currentColor"
        style={{ "--i": 0 } as CSSProperties}
      />
      <rect
        x="2.5"
        y="9.5"
        width="13"
        height="5"
        fill="currentColor"
        style={{ "--i": 1 } as CSSProperties}
      />
      <rect
        x="17.5"
        y="9.5"
        width="4"
        height="5"
        fill={accent ? "var(--brand-accent)" : "currentColor"}
        style={{ "--i": 2 } as CSSProperties}
      />
      <rect
        x="2.5"
        y="16.5"
        width="19"
        height="5"
        fill="currentColor"
        style={{ "--i": 3 } as CSSProperties}
      />
    </svg>
  );
}

/**
 * La marca cargando, en una pastilla fija arriba del contenido.
 *
 * Va fija y no dentro del esqueleto para que se vea igual en las cinco
 * pantallas y no haya que acomodarla en cada una. Debajo de la píldora de
 * navegación en escritorio (`md:top-[76px]`), y arriba del todo en
 * teléfono, donde esa píldora vive abajo.
 */
export function LoadingBadge() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center md:top-[76px]"
    >
      <span className="flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-ink shadow-[0_8px_24px_-12px_rgb(0_0_0/0.4)] backdrop-blur">
        <BrandLoader size={18} />
      </span>
    </div>
  );
}
