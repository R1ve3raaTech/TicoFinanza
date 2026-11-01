"use client";

import { useId, useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { contributeToGoal, deleteContribution } from "@/app/dashboard/plan/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { useToast } from "@/components/Toast";
import { AmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { accountNames } from "@/lib/accounts";
import { CR_TZ } from "@/lib/fixedExpenses";
import type { Account, GoalContribution, SavingsGoal } from "@/lib/types";

const dayFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: CR_TZ,
  day: "numeric",
  month: "short",
});

/**
 * Abonar a una meta: saca plata de una cuenta y la aparta.
 *
 * No es un gasto —la plata sigue siendo tuya, solo que apartada— así que no
 * toca el superávit del mes; lo que baja es el saldo de la cuenta. Los
 * últimos abonos quedan a la vista con su botón de deshacer, que es la forma
 * de corregir un monto mal puesto.
 */
export function ContributeDialog({
  open,
  onClose,
  goal,
  accounts,
  contributions,
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  accounts: Account[];
  contributions: GoalContribution[];
}) {
  const toast = useToast();
  const formId = useId();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const names = accountNames(accounts);
  const remaining = goal ? Math.max(goal.target_amount - goal.current_amount, 0) : 0;

  function submit() {
    if (!goal) return;
    setError(null);
    const value = parseAmount(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }

    startTransition(async () => {
      const result = await contributeToGoal({ goalId: goal.id, accountId, amount: value });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(`Abonaste a ${goal.name}`);
      onClose();
    });
  }

  function undo(id: string) {
    startTransition(async () => {
      const result = await deleteContribution(id);
      if (result?.error) toast.error(result.error);
      else toast.success("Abono deshecho");
    });
  }

  return (
    <Dialog
      open={open && Boolean(goal)}
      onClose={onClose}
      dismissible={!pending}
      size="sm"
      title={goal ? `Abonar a ${goal.name}` : "Abonar"}
      description="Sale de una cuenta y queda apartado. No cuenta como gasto."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={pending}>
            {pending ? "Guardando..." : "Abonar"}
          </Button>
        </>
      }
    >
      {goal && (
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          <AmountInput value={amount} onChange={setAmount} autoFocus />

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(remaining))}
              className="-mt-2 w-fit cursor-pointer text-meta text-accent underline-offset-4 hover:underline"
            >
              Faltan <Money value={remaining} /> para completarla
            </button>
          )}

          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label="¿De qué cuenta sale?"
          />

          {contributions.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <span className="text-label text-ink-2">Últimos abonos</span>
              <ul className="flex flex-col">
                {contributions.map((contribution) => (
                  <li
                    key={contribution.id}
                    className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0"
                  >
                    <span className="min-w-0 truncate text-meta text-ink-3">
                      {dayFormat.format(new Date(contribution.created_at))}
                      {contribution.account_id && (
                        <> · {names.get(contribution.account_id) ?? "Cuenta eliminada"}</>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Money value={contribution.amount} className="text-label text-ink" />
                      <button
                        type="button"
                        onClick={() => undo(contribution.id)}
                        disabled={pending}
                        aria-label={`Deshacer abono de ${contribution.amount}`}
                        className="flex h-6 w-6 items-center justify-center rounded-[4px] text-ink-3 transition-colors duration-150 cursor-pointer hover:bg-surface-hover hover:text-ink disabled:opacity-45"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FormError>{error}</FormError>
        </form>
      )}
    </Dialog>
  );
}
