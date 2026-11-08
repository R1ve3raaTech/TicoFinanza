"use client";

import { useState } from "react";
import { ArrowDownLeft } from "@phosphor-icons/react";
import { ConfirmIncomeDialog } from "@/components/incomes/ConfirmIncomeDialog";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import type { ExpectedIncome } from "@/lib/fixedIncomes";
import type { Account } from "@/lib/types";

/**
 * "¿Te entró el salario?" en el resumen.
 *
 * Solo aparece cuando hay algo que confirmar — o sea, cuando la fecha de
 * pago ya llegó y nadie lo marcó. El resto del mes no ocupa espacio.
 *
 * Es la contraparte de no registrar los ingresos solos: si la app no los da
 * por hechos, tiene que preguntarlo en el lugar donde la persona ya está
 * mirando, no escondido en otra pantalla.
 */
export function ExpectedIncomes({
  incomes,
  accounts,
}: {
  /** Solo los confirmables; el filtro lo hace quien llama. */
  incomes: ExpectedIncome[];
  accounts: Account[];
}) {
  const [confirming, setConfirming] = useState<ExpectedIncome | null>(null);
  const [session, setSession] = useState(0);

  if (incomes.length === 0) return null;

  return (
    <section aria-labelledby="por-confirmar-titulo" className="mt-8 min-w-0">
      <h2 id="por-confirmar-titulo" className="text-heading text-ink">
        {incomes.length === 1 ? "Un ingreso por confirmar" : "Ingresos por confirmar"}
      </h2>
      <p className="mt-1 text-sm text-ink-2">Ya pasó la fecha de pago.</p>

      <ul className="mt-4 border-t border-line">
        {incomes.map((income, i) => (
          <li
            key={`${income.id}-${income.dueKey}-${i}`}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-3"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-raised text-ink-3"
              >
                <ArrowDownLeft size={15} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{income.name}</span>
                <span className="block text-meta text-ink-3">
                  {income.dueInDays === 0
                    ? "Esperado hoy"
                    : `Esperado hace ${Math.abs(income.dueInDays)} ${
                        Math.abs(income.dueInDays) === 1 ? "día" : "días"
                      }`}
                </span>
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <Money value={income.amount} plus className="text-sm font-medium text-ink" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSession((n) => n + 1);
                  setConfirming(income);
                }}
              >
                Confirmar
              </Button>
            </span>
          </li>
        ))}
      </ul>

      <ConfirmIncomeDialog
        key={session}
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        income={confirming}
        accounts={accounts}
      />
    </section>
  );
}
