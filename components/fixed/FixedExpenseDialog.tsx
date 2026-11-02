"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import {
  createFixedExpense,
  deleteFixedExpense,
  updateFixedExpense,
} from "@/app/dashboard/fijos/actions";
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
import { Field, FormError, Select, inputClass } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { expenseCategories } from "@/lib/categories";
import { effectiveStatus, monthKeyOf } from "@/lib/fixedExpenses";
import type { Account, FixedExpense, FixedExpenseStatus, UserCategory } from "@/lib/types";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Alta y edición de una membresía o gasto fijo. El estado arranca del valor
 * real de hoy (`effectiveStatus`), no del guardado: si el gasto quedó pagado
 * el mes pasado, el formulario tiene que abrirse en "Pendiente".
 */
export function FixedExpenseDialog({
  open,
  onClose,
  expense,
  customCategories = [],
  accounts = [],
  todayKey,
}: {
  open: boolean;
  onClose: () => void;
  /** Gasto a editar, o null para crear uno nuevo. */
  expense?: FixedExpense | null;
  customCategories?: UserCategory[];
  accounts?: Account[];
  todayKey: string;
}) {
  const toast = useToast();
  const formId = useId();
  const dayId = useId();
  const editing = Boolean(expense);
  const categories = expenseCategories(customCategories);

  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(expense ? formatAmountInput(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category ?? categories[0]);
  const [chargeDay, setChargeDay] = useState(String(expense?.charge_day ?? 1));
  const [accountId, setAccountId] = useState<string | null>(
    expense ? expense.account_id : (accounts[0]?.id ?? null)
  );
  const [status, setStatus] = useState<FixedExpenseStatus>(
    expense ? effectiveStatus(expense, monthKeyOf(todayKey)) : "PENDING"
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = parseAmount(amount);
    if (!name.trim()) {
      setError("Ponele un nombre (ej. Alquiler, Gimnasio, Netflix).");
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
        chargeDay: Number(chargeDay),
        status,
        accountId,
      };
      const result = expense
        ? await updateFixedExpense(expense.id, input)
        : await createFixedExpense(input);

      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Gasto fijo actualizado" : "Gasto fijo agregado");
      onClose();
    });
  }

  function remove() {
    if (!expense) return;
    startTransition(async () => {
      const result = await deleteFixedExpense(expense.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      setConfirmingDelete(false);
      toast.success("Gasto fijo eliminado");
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!pending}
        title={editing ? "Editar gasto fijo" : "Nuevo gasto fijo"}
        description={
          editing ? undefined : "Un pago que se repite todos los meses: casa, servicios, gimnasio, suscripciones."
        }
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
          <Field label="Nombre">
            <input
              data-autofocus=""
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alquiler, Netflix, agua…"
              className={inputClass}
            />
          </Field>

          <AmountInput value={amount} onChange={setAmount} label="Monto mensual" />

          <CategoryPicker categories={categories} value={category} onChange={setCategory} />

          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label="¿De qué cuenta se cobra?"
          />

          <Field label="Día de cobro del mes" hint="Si el mes no llega a ese día, se cobra el último.">
            <Select
              id={dayId}
              value={chargeDay}
              onChange={(e) => setChargeDay(e.target.value)}
              aria-label="Día de cobro del mes"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-label text-ink-2">Estado de este mes</span>
            <Segmented
              ariaLabel="Estado de este mes"
              value={status}
              onChange={setStatus}
              fullWidth
              options={[
                { value: "PENDING", label: "Pendiente" },
                { value: "PAID", label: "Pagado" },
              ]}
            />
            <p className="text-meta text-ink-3">
              Vuelve a Pendiente solo, al empezar el mes siguiente.
            </p>
          </div>

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      {/* `&& open`: la confirmación no sobrevive al diálogo que la abrió. */}
      <ConfirmDialog
        open={confirmingDelete && open}
        title="¿Eliminar este gasto fijo?"
        description="Deja de aparecer en próximos pagos y de contar en el resumen. No se puede deshacer."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
