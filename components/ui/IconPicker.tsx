"use client";

import { MATERIAL_SYMBOLS, SYMBOL_NAMES } from "@/lib/materialSymbols";

/**
 * La grilla de íconos, compartida por las categorías y las cuentas.
 *
 * Son Material Symbols de Google con los trazos guardados en el repo (ver
 * lib/materialSymbols.ts): sin fuente externa, así siguen dibujándose sin
 * señal.
 *
 * **"Automático" es una opción de verdad, y es la de arranque.** Sin elegir
 * nada, la app decide: por el nombre en una categoría, por el tipo en una
 * cuenta. Obligar a elegir convertiría crear cualquiera de las dos en un
 * trámite de más decisiones.
 */
export function IconPicker({
  value,
  onChange,
  label = "Ícono",
  autoHint = "Auto",
}: {
  /** Nombre del símbolo, o null para el automático. */
  value: string | null;
  onChange: (icon: string | null) => void;
  label?: string;
  /** Qué dice el botón del automático. */
  autoHint?: string;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="pb-2 text-label text-ink-2">{label}</p>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
        <button
          type="button"
          aria-pressed={value === null}
          aria-label="Ícono automático"
          onClick={() => onChange(null)}
          className={`flex h-10 cursor-pointer items-center justify-center rounded-control border text-micro transition-[border-color,transform] duration-150 active:scale-[0.94] motion-reduce:active:scale-100 ${
            value === null ? "border-ink text-ink" : "border-line text-ink-3 hover:border-line-strong"
          }`}
        >
          {autoHint}
        </button>
        {SYMBOL_NAMES.map((symbol) => {
          const selected = value === symbol;
          return (
            <button
              key={symbol}
              type="button"
              aria-pressed={selected}
              aria-label={MATERIAL_SYMBOLS[symbol].label}
              title={MATERIAL_SYMBOLS[symbol].label}
              onClick={() => onChange(symbol)}
              className={`flex h-10 cursor-pointer items-center justify-center rounded-control border transition-[border-color,color,transform] duration-150 active:scale-[0.94] motion-reduce:active:scale-100 ${
                selected
                  ? "border-ink text-ink"
                  : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              <svg viewBox="0 -960 960 960" width={20} height={20} fill="currentColor" aria-hidden>
                <path d={MATERIAL_SYMBOLS[symbol].path} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
