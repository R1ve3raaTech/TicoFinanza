"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDownLeft, Check, Clock, Plus } from "@phosphor-icons/react";
import { unconfirmFixedIncome } from "@/app/dashboard/ingresos/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { expectedIncomes, incomeTotals, type ExpectedIncome } from "@/lib/fixedIncomes";
import type { Account, FixedIncome, UserCategory } from "@/lib/types";
import { ConfirmIncomeDialog } from "./ConfirmIncomeDialog";
import { IncomeDialog } from "./IncomeDialog";

function dueText(row: ExpectedIncome): string {
  if (row.status === "CONFIRMED") return "Confirmado este mes";
  if (row.dueInDays === 0) return "Entra hoy";
  if (row.dueInDays === 1) return "Entra mañana";
  if (row.dueInDays > 0) return `En ${row.dueInDays} días`;
  const days = Math.abs(row.dueInDays);
  return `Esperado hace ${days} ${days === 1 ? "día" : "días"}`;
}

/**
 * Ingresos que se repiten todos los meses, ordenados por día de pago.
 *
 * Lo que vence sin confirmar NO se pinta de rojo: que el salario no haya
 * entrado el día exacto es normal, no una alarma. El rojo de esta app
 * significa plata que sale.
 */
export function FixedIncomesList({
  incomes,
  accounts,
  customCategories,
  todayKey,
  currentMonth,
}: {
  incomes: FixedIncome[];
  accounts: Account[];
  customCategories: UserCategory[];
  todayKey: string;
  currentMonth: string;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<FixedIncome | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState<ExpectedIncome | null>(null);
  const [session, setSession] = useState(0);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => expectedIncomes(incomes, todayKey), [incomes, todayKey]);
  const totals = incomeTotals(incomes, currentMonth);
  const byId = useMemo(() => new Map(incomes.map((i) => [i.id, i])), [incomes]);

  function open(income: FixedIncome | null) {
    setEditing(income);
    setSession((n) => n + 1);
    setDialogOpen(true);
  }

  function undo(row: ExpectedIncome) {
    startTransition(async () => {
      const result = await unconfirmFixedIncome(row.id);
      if (result?.error) toast.error(result.error);
      else toast.success(`${row.name}: sin confirmar`);
    });
  }

  return (
    <section aria-labelledby="ingresos-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="ingresos-titulo" className="text-heading text-ink">
          Ingresos fijos
          {incomes.length > 0 && (
            <span className="ml-2 text-meta font-normal text-ink-3">{incomes.length}</span>
          )}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => open(null)} className="-mr-2">
          <Plus size={14} weight="bold" />
          Nuevo
        </Button>
      </div>

      {incomes.length === 0 ? (
        <div className="border-t border-line py-8">
          <p className="text-sm text-ink-2">
            El salario o la quincena, con el día en que entra.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => open(null)}>
            <Plus size={15} weight="bold" />
            Agregar el primero
          </Button>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-6 border-y border-line py-3">
            <div className="min-w-0">
              <dt className="text-meta text-ink-3">Esperado</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={totals.expected} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-meta text-ink-3">Confirmado</dt>
              <dd className="money mt-0.5 text-label text-income">
                <Money value={totals.confirmed} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-meta text-ink-3">Por entrar</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={totals.pending} />
              </dd>
            </div>
          </dl>

          <ul>
            {rows.map((row, i) => {
              const income = byId.get(row.id);
              const confirmed = row.status === "CONFIRMED";
              return (
                <li
                  key={`${row.id}-${row.dueKey}-${i}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-3 sm:grid-cols-[minmax(0,1fr)_auto_8.5rem]"
                >
                  <button
                    type="button"
                    onClick={() => income && open(income)}
                    className="-mx-2 flex min-w-0 cursor-pointer items-center gap-3 rounded-control px-2 py-1 text-left transition-colors duration-150 hover:bg-surface-hover/70"
                  >
                    <span
                      aria-hidden
                      className="money flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-raised text-label leading-none text-ink-2"
                    >
                      {Number(row.dueKey.slice(8, 10))}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {row.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-meta text-ink-3">
                        {row.late && <Clock size={12} aria-hidden className="shrink-0" />}
                        {dueText(row)}
                      </span>
                    </span>
                  </button>

                  <Money
                    value={row.amount}
                    plus
                    className={`order-last text-right text-sm font-medium sm:order-none ${
                      confirmed ? "text-income" : "text-ink"
                    }`}
                  />

                  {confirmed ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => undo(row)}
                      className="justify-self-start sm:justify-self-end"
                    >
                      <Check size={13} weight="bold" />
                      Confirmado
                    </Button>
                  ) : (
                    <Button
                      variant={row.confirmable ? "secondary" : "ghost"}
                      size="sm"
                      disabled={!row.confirmable || pending}
                      onClick={() => {
                        setSession((n) => n + 1);
                        setConfirming(row);
                      }}
                      className="justify-self-start sm:justify-self-end"
                    >
                      <ArrowDownLeft size={13} />
                      {row.confirmable ? "Confirmar" : "Por entrar"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <IncomeDialog
        key={`ingreso-${session}`}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        income={editing}
        accounts={accounts}
        customCategories={customCategories}
      />
      <ConfirmIncomeDialog
        key={`confirmar-${session}`}
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        income={confirming}
        accounts={accounts}
      />
    </section>
  );
}
