"use client";

import type { ReactNode } from "react";
import { Check } from "@phosphor-icons/react";

/**
 * Opción que se prende y apaga dentro de un grupo (categorías, bancos,
 * filtros). Rectangular y chica, no una pastilla de color: la elegida se
 * marca con borde de tinta y un check, así no depende solo del color.
 */
export function ToggleChip({
  pressed,
  onClick,
  children,
  className = "",
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-label transition-colors duration-150 cursor-pointer ${
        pressed
          ? "border-ink/60 bg-surface-selected text-ink"
          : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
      } ${className}`}
    >
      {pressed && <Check size={12} weight="bold" aria-hidden className="shrink-0" />}
      {children}
    </button>
  );
}
