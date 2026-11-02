"use client";

import { useState, useTransition } from "react";
import { completeGoalCycle } from "@/app/dashboard/plan/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { useToast } from "@/components/Toast";
import {
  AmountInput,
  CategoryPicker,
  formatAmountInput,
  parseAmount,
} from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { suggestFor } from "@/lib/smartMatch";
import type { Account, SavingsGoal } from "@/lib/types";

/**
 * "Ya pagué el marchamo": cierra el ciclo y arranca el del año siguiente.
 *
 * El monto se pide en vez de darlo por hecho porque el recibo de este año
 * casi nunca es el del anterior, y es justo la diferencia la que hay que
 * ver: lo apartado vuelve a la cuenta y el pago la saca, así que el saldo
 * queda igual al del banco sin cuadrar nada a mano.
 */
export function CompleteCycleDialog({
  open,
  onClose,
  goal,
  accounts,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  accounts: Account[];
  categories: string[];
}) {
  const toast = useToast();
  const suggested = goal ? suggestFor(goal.name, categories).category : null;

  const [amount, setAmount] = useState(goal ? formatAmountInput(goal.target_amount) : "");
  const [category, setCategory] = useState(suggested ?? categories[0] ?? "Otro");
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!goal) return;
    setError(null);
    const value = parseAmount(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Poné cuánto pagaste.");
      return;
    }

    startTransition(async () => {
      const result = await completeGoalCycle({
        goalId: goal.id,
        amount: value,
        accountId,
        category,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(`${goal.name}: pagado, arranca el ciclo del año que viene`);
      onClose();
    });
  }

  const paid = parseAmount(amount);
  // Lo que no alcanzó a cubrir lo apartado: sale del bolsillo este mes.
  const gap = goal && Number.isFinite(paid) ? paid - goal.current_amount : 0;

  return (
    <Dialog
      open={open && Boolean(goal)}
      onClose={onClose}
      dismissible={!pending}
      size="sm"
      title={goal ? `¿Ya pagaste ${goal.name}?` : "Cerrar el ciclo"}
      description="Se registra el gasto y la meta arranca el ciclo del año que viene."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Todavía no
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Sí, lo pagué"}
          </Button>
        </>
      }
    >
      {goal && (
        <div className="flex flex-col gap-5">
          <AmountInput value={amount} onChange={setAmount} autoFocus label="¿Cuánto pagaste?" />

          <CategoryPicker
            categories={categories}
            value={category}
            onChange={setCategory}
            label="Categoría del gasto"
          />

          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label="¿De qué cuenta salió?"
          />

          <p className="text-meta leading-relaxed text-ink-3">
            Tenías apartado <Money value={goal.current_amount} className="text-ink-2" />.
            {gap > 0 ? (
              <>
                {" "}
                Los <Money value={gap} className="text-ink-2" /> que faltaban salen de la cuenta
                este mes.
              </>
            ) : gap < 0 ? (
              <>
                {" "}
                Te sobran <Money value={-gap} className="text-ink-2" />, que se quedan en la
                cuenta.
              </>
            ) : (
              " El pago lo cubre justo, así que el saldo de la cuenta no se mueve."
            )}
          </p>

          <FormError>{error}</FormError>
        </div>
      )}
    </Dialog>
  );
}
