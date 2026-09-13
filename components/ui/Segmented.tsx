"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Color del texto cuando está elegida. Solo para opciones con significado
   *  de plata (ej. "Ingreso"); el resto queda neutro. */
  tone?: "income" | "expense";
}

/**
 * Control segmentado para elegir una opción entre pocas (tipo de movimiento,
 * tema). Se comporta como un grupo de radios: una sola parada de Tab y
 * flechas para moverse, como espera un lector de pantalla.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  fullWidth = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${fullWidth ? "flex w-full" : "inline-flex"} rounded-control bg-surface-raised p-0.5`}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        const toneClass =
          selected && option.tone === "income"
            ? "text-income"
            : selected && option.tone === "expense"
              ? "text-expense"
              : selected
                ? "text-ink"
                : "text-ink-2 hover:text-ink";
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] px-3 text-label transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-7 ${
              fullWidth ? "flex-1" : ""
            } ${selected ? "bg-surface-selected shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(0_0_0/0.06)]" : ""} ${toneClass}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
