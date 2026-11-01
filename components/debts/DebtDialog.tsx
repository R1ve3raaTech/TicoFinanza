"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { createDebt, deleteDebt, updateDebt } from "@/app/dashboard/plan/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { AmountInput, formatAmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import type { Debt, DebtType } from "@/lib/types";

/**
 * Alta y edición de una deuda, en el mismo formulario. `type` decide la
 * dirección: si te deben o si debés.
 */
export function DebtDialog({
  open,
  onClose,
  debt,
  presetType = "me_deben",
}: {
  open: boolean;
  onClose: () => void;
  /** Deuda a editar, o null para una nueva. */
  debt?: Debt | null;
  presetType?: DebtType;
}) {
  const toast = useToast();
  const formId = useId();
  const editing = Boolean(debt);

  const [type, setType] = useState<DebtType>(debt?.type ?? presetType);
  const [personName, setPersonName] = useState(debt?.person_name ?? "");
  const [amount, setAmount] = useState(debt ? formatAmountInput(debt.amount) : "");
  const [dueDate, setDueDate] = useState(debt?.due_date ?? "");
  const [notes, setNotes] = useState(debt?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = parseAmount(amount);
    if (!personName.trim()) {
      setError("Poné el nombre de la persona.");
      return;
    }
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }

    startTransition(async () => {
      const input = {
        type,
        personName,
        amount: value,
        dueDate: dueDate || null,
        notes,
      };
      const result = debt ? await updateDebt(debt.id, input) : await createDebt(input);

      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Deuda actualizada" : "Deuda registrada");
      onClose();
    });
  }

  function remove() {
    if (!debt) return;
    startTransition(async () => {
      const result = await deleteDebt(debt.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      toast.success("Deuda eliminada");
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!pending}
        title={editing ? "Editar deuda" : "Nueva deuda"}
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
          <Segmented
            ariaLabel="Dirección de la deuda"
            value={type}
            onChange={setType}
            fullWidth
            options={[
              { value: "me_deben", label: "Me deben" },
              { value: "debo", label: "Debo" },
            ]}
          />

          <AmountInput value={amount} onChange={setAmount} autoFocus />

          <Field label={type === "me_deben" ? "¿Quién te debe?" : "¿A quién le debés?"}>
            <input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Nombre de la persona"
              className={inputClass}
            />
          </Field>

          <Field
            label="Fecha acordada"
            hint="Opcional. Si la ponés, la app te avisa cuando se acerca."
          >
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Nota" hint="Opcional. Para qué era, cómo se acordó pagar.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Le presté para el marchamo…"
              className={`${inputClass} h-auto resize-y py-2`}
            />
          </Field>

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar esta deuda?"
        description="Si ya la habías saldado registrando un movimiento, ese movimiento no se borra."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
