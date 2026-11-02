"use client";

import { useState, useTransition } from "react";
import { confirmFixedIncome } from "@/app/dashboard/ingresos/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { useToast } from "@/components/Toast";
import { AmountInput, formatAmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import type { ExpectedIncome } from "@/lib/fixedIncomes";
import type { Account } from "@/lib/types";

/**
 * "¿Te entró el salario?" — un toque al mes.
 *
 * El monto viene cargado con lo esperado pero es editable, porque el caso
 * real es la quincena que vino distinta: un rebajo, horas extra, un
 * aguinaldo adelantado. Confirmar el número que de verdad entró es lo que
 * mantiene el saldo igual al del banco.
 */
export function ConfirmIncomeDialog({
  open,
  onClose,
  income,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  income: ExpectedIncome | null;
  accounts: Account[];
}) {
  const toast = useToast();
  const [amount, setAmount] = useState(income ? formatAmountInput(income.amount) : "");
  const [accountId, setAccountId] = useState<string | null>(
    income?.accountId ?? accounts[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!income) return;
    setError(null);
    const value = parseAmount(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Ingresá el monto que entró.");
      return;
    }

    startTransition(async () => {
      const result = await confirmFixedIncome({ id: income.id, amount: value, accountId });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(`${income.name}: registrado`);
      onClose();
    });
  }

  const different = income ? parseAmount(amount) !== income.amount : false;

  return (
    <Dialog
      open={open && Boolean(income)}
      onClose={onClose}
      dismissible={!pending}
      size="sm"
      title={income ? `¿Te entró ${income.name}?` : "Confirmar ingreso"}
      description="Se registra como movimiento y sube el saldo de la cuenta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Todavía no
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Sí, entró"}
          </Button>
        </>
      }
    >
      {income && (
        <div className="flex flex-col gap-5">
          <AmountInput value={amount} onChange={setAmount} autoFocus label="¿Cuánto entró?" />

          {different && parseAmount(amount) > 0 && (
            <p className="-mt-2 text-meta text-ink-3">
              Distinto a lo esperado. Se registra lo que escribiste, que es lo que de verdad
              llegó.
            </p>
          )}

          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label="¿A qué cuenta entró?"
          />

          <FormError>{error}</FormError>
        </div>
      )}
    </Dialog>
  );
}
