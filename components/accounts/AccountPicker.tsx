"use client";

import { useId } from "react";
import { labelClass } from "@/components/ui/Field";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { accountTypeLabel } from "@/lib/accounts";
import type { Account } from "@/lib/types";

/**
 * Elegir de qué cuenta sale (o a cuál entra) un movimiento. Mismo patrón de
 * chips que las categorías: con tres o cuatro billeteras se ven todas de un
 * vistazo y se elige con un toque, sin abrir un menú.
 *
 * "Sin cuenta" existe a propósito: no obliga a inventarse una billetera para
 * anotar algo rápido, y es lo que quedan los movimientos de una cuenta
 * borrada.
 */
export function AccountPicker({
  accounts,
  value,
  onChange,
  label = "Cuenta",
}: {
  accounts: Account[];
  value: string | null;
  onChange: (accountId: string | null) => void;
  label?: string;
}) {
  const labelId = useId();

  if (accounts.length === 0) return null;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {accounts.map((account) => {
          const type = accountTypeLabel(account.type);
          // Una cuenta que se llama "Efectivo" no necesita que le repitan
          // "efectivo" al lado.
          const showType = account.name.trim().toLowerCase() !== type.toLowerCase();
          return (
            <ToggleChip
              key={account.id}
              pressed={value === account.id}
              onClick={() => onChange(account.id)}
            >
              {account.name}
              {showType && <span className="text-ink-3">{type.toLowerCase()}</span>}
            </ToggleChip>
          );
        })}
        <ToggleChip pressed={value === null} onClick={() => onChange(null)}>
          Sin cuenta
        </ToggleChip>
      </div>
    </div>
  );
}
