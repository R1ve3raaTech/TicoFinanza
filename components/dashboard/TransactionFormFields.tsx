"use client";

import { useId } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { labelClass } from "@/components/ui/Field";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { BANK_BRAND } from "@/lib/bankBrand";
import { manualBankOptions } from "@/lib/transactionFormOptions";
import type { BankName, TransactionType } from "@/lib/types";
import { BankLogo } from "./BankLogo";

/** Piezas compartidas por "anotar efectivo" y "editar movimiento". */

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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
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
  status,
}: {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  /** Aviso corto al lado del rótulo (ej. que la categoría se sugirió sola). */
  status?: string | null;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span id={labelId} className={labelClass}>
          Categoría
        </span>
        <span aria-live="polite" className="text-meta text-ink-3">
          {status}
        </span>
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

export function BankPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BankName;
  onChange: (bank: BankName) => void;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {manualBankOptions.map((b) => (
          <ToggleChip key={b} pressed={value === b} onClick={() => onChange(b)} className="pl-1.5">
            <BankLogo bank={b} size={18} />
            {BANK_BRAND[b].initials}
          </ToggleChip>
        ))}
      </div>
    </div>
  );
}
