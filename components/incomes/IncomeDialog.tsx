"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import {
  createFixedIncome,
  deleteFixedIncome,
  updateFixedIncome,
} from "@/app/dashboard/ingresos/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import {
  AmountInput,
  CategoryPicker,
  formatAmountInput,
  parseAmount,
} from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { incomeCategories } from "@/lib/categories";
import type { Account, FixedIncome, UserCategory } from "@/lib/types";

/** Alta y edición de un ingreso que se repite todos los meses. */
export function IncomeDialog({
  open,
  onClose,
  income,
  accounts = [],
  customCategories = [],
}: {
  open: boolean;
  onClose: () => void;
  income?: FixedIncome | null;
  accounts?: Account[];
  customCategories?: UserCategory[];
}) {
  const toast = useToast();
  const formId = useId();
  const editing = Boolean(income);
  const categories = incomeCategories(customCategories);

  const [name, setName] = useState(income?.name ?? "");
  const [amount, setAmount] = useState(income ? formatAmountInput(income.amount) : "");
  const [category, setCategory] = useState(income?.category ?? categories[0]);
  const [payDay, setPayDay] = useState(String(income?.pay_day ?? 15));
  // Quincena: dos depósitos al mes en vez de dos ingresos separados que
  // haya que mantener a la par.
  const [twice, setTwice] = useState(Boolean(income?.second_pay_day));
  const [secondDay, setSecondDay] = useState(String(income?.second_pay_day ?? 30));
  const [accountId, setAccountId] = useState<string | null>(
    income ? income.account_id : (accounts[0]?.id ?? null)
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = parseAmount(amount);
    if (!name.trim()) {
      setError("Ponele un nombre (ej. Salario, Quincena, Alquiler que cobro).");
      return;
    }
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }

    startTransition(async () => {
      const input = {
        name,
        amount: value,
        category,
        payDay: Number.parseInt(payDay, 10),
        secondPayDay: twice ? Number.parseInt(secondDay, 10) : null,
        accountId,
      };
      const result = income
        ? await updateFixedIncome(income.id, input)
        : await createFixedIncome(input);

      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Ingreso actualizado" : "Ingreso fijo agregado");
      onClose();
    });
  }

  function remove() {
    if (!income) return;
    startTransition(async () => {
      const result = await deleteFixedIncome(income.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      toast.success("Ingreso eliminado");
      onClose();
    });
  }

  const dayInput = (value: string, set: (v: string) => void) => (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 2))}
      className={`${inputClass} money`}
    />
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!pending}
        title={editing ? "Editar ingreso fijo" : "Nuevo ingreso fijo"}
        footer={
          <>
            {editing && (
              <Button
                variant="danger-ghost"
                onClick={() => setConfirmingDelete(true)}
                disabled={pending}
                className="sm:mr-auto"
              >
                <Trash size={15} />
                Eliminar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          <AmountInput
            value={amount}
            onChange={setAmount}
            autoFocus
            label={twice ? "Monto de cada depósito" : "Monto"}
          />

          <Field label="Nombre">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Salario, quincena, pensión…"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={twice ? "Primer pago" : "Día de pago"} hint="Día del mes, 1 a 31.">
              {dayInput(payDay, setPayDay)}
            </Field>
            {twice && (
              <Field label="Segundo pago" hint="El 31 se corre al último día.">
                {dayInput(secondDay, setSecondDay)}
              </Field>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            aria-pressed={twice}
            onClick={() => setTwice((v) => !v)}
            className="-ml-2 self-start"
          >
            {twice ? "Es un solo pago al mes" : "Me pagan dos veces al mes"}
          </Button>

          <CategoryPicker
            categories={categories}
            value={category}
            onChange={setCategory}
            label="Tipo de ingreso"
          />

          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label="¿A qué cuenta entra?"
          />

          <p className="text-meta leading-relaxed text-ink-3">
            No se registra solo al llegar la fecha: ese día aparece en el resumen para que lo
            confirmes de un toque. Si el depósito se atrasa o viene distinto, el saldo no miente.
          </p>

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar este ingreso fijo?"
        description="Los movimientos que ya confirmaste no se borran."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
