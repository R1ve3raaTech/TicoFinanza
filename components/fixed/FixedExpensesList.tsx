"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, WarningCircle } from "@phosphor-icons/react";
import { setFixedExpenseStatus } from "@/app/dashboard/fijos/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { categoryClasses, categoryIcon } from "@/components/ui/CategoryMark";
import { Money } from "@/components/ui/Money";
import type { UpcomingPayment } from "@/lib/fixedExpenses";
import type { Account, FixedExpense } from "@/lib/types";
import { AddFixedExpenseButton, useFixedExpenseEntry } from "./FixedExpenseEntry";
import { MarkPaidDialog } from "./MarkPaidDialog";

function dueText(payment: UpcomingPayment): string {
  if (payment.status === "PAID") return "Pagado este mes";
  if (payment.dueInDays < 0) {
    const days = Math.abs(payment.dueInDays);
    return `Venció hace ${days} día${days === 1 ? "" : "s"}`;
  }
  if (payment.dueInDays === 0) return "Se cobra hoy";
  if (payment.dueInDays === 1) return "Se cobra mañana";
  return `En ${payment.dueInDays} días`;
}

/**
 * Lista de membresías y gastos fijos, ordenada por día de cobro — así se lee
 * como el mes. Cada fila se abre para editar; el estado se
 * cambia con el botón de la derecha, sin abrir nada.
 */
export function FixedExpensesList({
  expenses,
  payments,
  accounts = [],
}: {
  expenses: FixedExpense[];
  payments: UpcomingPayment[];
  accounts?: Account[];
}) {
  const toast = useToast();
  const { edit } = useFixedExpenseEntry();
  const [pending, startTransition] = useTransition();
  const [marking, setMarking] = useState<FixedExpense | null>(null);
  const [session, setSession] = useState(0);

  const byId = useMemo(() => new Map(payments.map((p) => [p.id, p])), [payments]);
  const sorted = useMemo(
    () =>
      [...expenses].sort(
        (a, b) => a.charge_day - b.charge_day || a.name.localeCompare(b.name, "es")
      ),
    [expenses]
  );

  function toggleStatus(expense: FixedExpense, paid: boolean) {
    // Marcar pagado abre el diálogo (hay que decidir si se descuenta de la
    // cuenta); desmarcar es directo y deshace el movimiento de este mes.
    if (paid) {
      setSession((n) => n + 1);
      setMarking(expense);
      return;
    }
    startTransition(async () => {
      const result = await setFixedExpenseStatus(expense.id, "PENDING");
      if (result?.error) toast.error(result.error);
      else toast.success(`${expense.name}: pendiente`);
    });
  }

  return (
    <section aria-labelledby="fijos-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="fijos-titulo" className="text-heading text-ink">
          Todos los gastos fijos
          {expenses.length > 0 && (
            <span className="ml-2 text-meta font-normal text-ink-3">{expenses.length}</span>
          )}
        </h2>
      </div>

      {expenses.length === 0 ? (
        <div className="mt-2 border-t border-line py-10">
          <p className="text-heading text-ink">Todavía no hay gastos fijos</p>
          <p className="mt-1.5 text-sm text-ink-2">
            Alquiler, agua, luz, internet, suscripciones: con su día de cobro.
          </p>
          <div className="mt-5">
            <AddFixedExpenseButton variant="secondary" label="Agregar el primero" />
          </div>
        </div>
      ) : (
        <ul className="border-t border-line">
          {sorted.map((expense) => {
            const payment = byId.get(expense.id);
            const paid = payment?.status === "PAID";
            const alert = Boolean(payment?.urgent) && !paid;
            const tone = categoryClasses(expense.category);
            const CategoryIcon = categoryIcon(expense.category);
            return (
              <li
                key={expense.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-3 sm:grid-cols-[minmax(0,1fr)_auto_7.5rem]"
              >
                <button
                  type="button"
                  onClick={() => edit(expense)}
                  className="-mx-2 flex min-w-0 cursor-pointer items-center gap-3 rounded-control px-2 py-1 text-left transition-colors duration-150 hover:bg-surface-hover/70"
                >
                  {/* El día del mes como "sello": es el dato que ordena la
                      lista y el que la gente busca con la vista. Va teñido
                      con el color de la categoría, así la lista se agrupa
                      sola a la vista —todos los servicios del mismo color—
                      sin perder el día, que es para lo que se mira. */}
                  <span
                    aria-hidden
                    className={`money flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-label leading-none ${tone.soft} ${tone.text}`}
                  >
                    {expense.charge_day}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {expense.name}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-3">
                      {alert && (
                        <WarningCircle
                          size={12}
                          weight="fill"
                          aria-hidden
                          className="shrink-0 text-expense"
                        />
                      )}
                      <span className="truncate">
                        <span className={alert ? "text-expense" : undefined}>
                          {payment ? dueText(payment) : `Día ${expense.charge_day}`}
                        </span>
                      </span>
                      <span aria-hidden>·</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <CategoryIcon size={11} weight="fill" aria-hidden className={tone.text} />
                        {expense.category ?? "Sin categoría"}
                      </span>
                    </span>
                  </span>
                </button>

                <Money
                  value={-expense.amount}
                  className="order-last text-right text-sm font-medium text-ink sm:order-none"
                />

                <Button
                  variant={paid ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={paid}
                  disabled={pending}
                  onClick={() => toggleStatus(expense, !paid)}
                  className="justify-self-start sm:justify-self-end"
                >
                  {paid ? (
                    <>
                      <Check size={13} weight="bold" aria-hidden />
                      Pagado
                    </>
                  ) : (
                    "Marcar pagado"
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <MarkPaidDialog
        key={session}
        open={Boolean(marking)}
        onClose={() => setMarking(null)}
        expense={marking}
        accounts={accounts}
      />
    </section>
  );
}
