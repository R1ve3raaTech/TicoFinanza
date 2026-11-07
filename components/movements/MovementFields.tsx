"use client";

import { useId } from "react";
import { labelClass } from "@/components/ui/Field";
import { handleAmountChange } from "@/components/ui/MoneyInput";
import { Segmented } from "@/components/ui/Segmented";
import { ToggleChip } from "@/components/ui/ToggleChip";
import type { TransactionType } from "@/lib/types";

/** Piezas compartidas por el formulario de movimiento y el de gasto fijo. */

export function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}) {
  return (
    <Segmented
      ariaLabel="Tipo de movimiento"
      value={value}
      onChange={onChange}
      fullWidth
      options={[
        { value: "EXPENSE", label: "Gasto" },
        { value: "INCOME", label: "Ingreso", tone: "income" },
      ]}
    />
  );
}

export function AmountInput({
  value,
  onChange,
  autoFocus = false,
  label = "Monto",
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  label?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <span className="flex items-baseline gap-1.5 border-b border-line-strong pb-1 transition-colors duration-150 focus-within:border-accent">
        <span aria-hidden className="text-[1.5rem] leading-none text-ink-3">
          ₡
        </span>
        <input
          // El Dialog enfoca `data-autofocus` al abrirse (autoFocus de React
          // no deja el atributo en el DOM y el foco se lo ganaba el panel).
          data-autofocus={autoFocus ? "" : undefined}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          // Solo dígitos, y los miles se agrupan al escribir: ver
          // lib/amount.ts y components/ui/MoneyInput.tsx.
          onChange={(e) => handleAmountChange(e, onChange)}
          placeholder="0"
          // `money` son cifras de ancho fijo. Acá no es un detalle de
          // alineación: al agrupar los miles el texto cambia de largo
          // debajo del cursor, y con dígitos de ancho variable la cifra
          // entera se corre un pelo con cada tecla.
          className="money w-full min-w-0 bg-transparent text-[2.25rem] font-medium leading-tight tracking-[-0.03em] text-ink outline-none placeholder:text-ink-3/50 focus-visible:outline-none"
        />
      </span>
    </label>
  );
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  label = "Categoría",
}: {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  label?: string;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <ToggleChip key={c} pressed={value === c} onClick={() => onChange(c)}>
            {c}
          </ToggleChip>
        ))}
      </div>
    </div>
  );
}

/**
 * `parseAmount` y `formatAmountInput` viven ahora en lib/amount.ts, junto
 * con la limpieza de lo que se escribe (que antes no existía: el campo
 * aceptaba letras). Se re-exportan desde acá porque los doce diálogos de la
 * app las importan de este archivo.
 */
export { formatAmountInput, parseAmount } from "@/lib/amount";
