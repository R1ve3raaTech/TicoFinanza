"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { createSavingsGoal, deleteSavingsGoal, updateSavingsGoal } from "@/app/dashboard/actions";
import { AmountInput } from "@/components/dashboard/TransactionFormFields";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import type { SavingsGoal } from "@/lib/types";

export function GoalModal({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  /** null = crear una meta nueva; una meta = editarla. */
  goal: SavingsGoal | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const formId = useId();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reinicializa el formulario cada vez que el modal se abre (para una meta
  // nueva o para editar otra) comparando contra la sesión anterior durante
  // el render, en vez de un efecto — evita un render extra innecesario.
  const sessionKey = open ? (goal?.id ?? "new") : null;
  const [lastSessionKey, setLastSessionKey] = useState<string | null>(null);
  if (sessionKey !== null && sessionKey !== lastSessionKey) {
    setLastSessionKey(sessionKey);
    setName(goal?.name ?? "");
    setAmount(goal ? String(goal.target_amount) : "");
    setTargetDate(goal?.target_date ?? "");
    setConfirmingDelete(false);
    setError(null);
  }
  if (sessionKey === null && lastSessionKey !== null) setLastSessionKey(null);

  function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Ponele un nombre a la meta.");
      return;
    }
    if (!amount || Number(amount.replace(",", ".")) <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    startTransition(async () => {
      const input = {
        name: name.trim(),
        targetAmount: Number(amount.replace(",", ".")),
        targetDate: targetDate || null,
      };
      const result = goal
        ? await updateSavingsGoal(goal.id, input)
        : await createSavingsGoal(input);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(goal ? "Meta actualizada" : "Meta creada");
        onClose();
      }
    });
  }

  function handleDelete() {
    if (!goal) return;
    startTransition(async () => {
      const result = await deleteSavingsGoal(goal.id);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Meta eliminada");
        setConfirmingDelete(false);
        onClose();
      }
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!isPending}
        title={goal ? "Editar meta" : "Nueva meta de ahorro"}
        footer={
          <>
            {goal && (
              <Button
                variant="danger-ghost"
                onClick={() => setConfirmingDelete(true)}
                disabled={isPending}
                className="sm:mr-auto"
              >
                <Trash size={15} />
                Eliminar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={isPending}>
              {isPending ? "Guardando..." : goal ? "Guardar cambios" : "Crear meta"}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-5"
        >
          <Field label="Nombre">
            <input
              data-autofocus=""
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Para qué? (ej. Viaje a Nicaragua)"
              className={inputClass}
            />
          </Field>

          <AmountInput label="Monto objetivo" value={amount} onChange={setAmount} />

          <Field
            label={
              <>
                ¿Para cuándo? <span className="font-normal text-ink-3">(opcional)</span>
              </>
            }
          >
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={`${inputClass} sm:max-w-[12rem]`}
            />
          </Field>

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar esta meta?"
        description="Esta acción no se puede deshacer."
        pending={isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
