"use client";

import { useState, useTransition } from "react";
import { setFixedExpenseStatus } from "@/app/dashboard/fijos/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { Switch } from "@/components/ui/Switch";
import type { Account, FixedExpense } from "@/lib/types";

/**
 * Marcar un gasto fijo como pagado, con la opción de registrar el
 * movimiento en la cuenta.
 *
 * Viene prendida: el caso normal es que el cobro salió de una cuenta de
 * verdad y el saldo tiene que bajar. Antes marcar pagado no tocaba ningún
 * saldo, así que el número de la app se alejaba del banco un poco más cada
 * mes — el mismo problema que tener mal el saldo de partida, pero
 * repitiéndose solo.
 */
export function MarkPaidDialog({
  open,
  onClose,
  expense,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  expense: FixedExpense | null;
  accounts: Account[];
}) {
  const toast = useToast();
  const [register, setRegister] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(
    expense?.account_id ?? accounts[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!expense) return;
    setError(null);
    startTransition(async () => {
      const result = await setFixedExpenseStatus(expense.id, "PAID", {
        registerMovement: register,
        accountId: register ? accountId : null,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(
        register ? `${expense.name}: pagado y descontado` : `${expense.name}: pagado`
      );
      onClose();
    });
  }

  return (
    <Dialog
      open={open && Boolean(expense)}
      onClose={onClose}
      dismissible={!pending}
      size="sm"
      title={expense ? `¿Pagaste ${expense.name}?` : "Marcar como pagado"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Marcar como pagado"}
          </Button>
        </>
      }
    >
      {expense && (
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-relaxed text-ink-2">
            <Money value={expense.amount} className="font-medium text-ink" /> de{" "}
            {expense.category ?? "gasto fijo"}.
          </p>

          <div className="flex items-start justify-between gap-4 border-y border-line py-3">
            <div className="min-w-0">
              <p className="text-label text-ink">Descontarlo de la cuenta</p>
              <p className="mt-0.5 text-meta text-ink-3">
                Registra el gasto y baja el saldo. Si lo apagás, solo queda marcado como pagado y
                el saldo no se mueve.
              </p>
            </div>
            <Switch
              checked={register}
              onChange={() => setRegister((v) => !v)}
              disabled={pending}
              label="Descontar el gasto de la cuenta"
            />
          </div>

          {register && (
            <AccountPicker
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
              label="¿De qué cuenta salió?"
            />
          )}

          <FormError>{error}</FormError>
        </div>
      )}
    </Dialog>
  );
}
