"use client";

import { useId, useState, useTransition } from "react";
import { Check, Trash } from "@phosphor-icons/react";
import { createGoal, deleteGoal, updateGoal } from "@/app/dashboard/plan/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { AmountInput, formatAmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass, labelClass } from "@/components/ui/Field";
import { GOAL_COLORS, goalColorVar } from "@/lib/goals";
import type { GoalColor, SavingsGoal } from "@/lib/types";

/** Alta y edición de una meta. Lo abonado no se toca acá: sale de los abonos. */
export function GoalDialog({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal?: SavingsGoal | null;
}) {
  const toast = useToast();
  const formId = useId();
  const colorLabelId = useId();
  const editing = Boolean(goal);

  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? formatAmountInput(goal.target_amount) : "");
  const [date, setDate] = useState(goal?.target_date ?? "");
  const [color, setColor] = useState<GoalColor>(goal?.color ?? "celeste");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = parseAmount(target);
    if (!name.trim()) {
      setError("Ponele un nombre (ej. Fondo de emergencia, Marchamo, Viaje).");
      return;
    }
    if (!target || !Number.isFinite(value) || value <= 0) {
      setError("El objetivo debe ser mayor a cero.");
      return;
    }

    startTransition(async () => {
      const input = { name, targetAmount: value, targetDate: date || null, color };
      const result = goal ? await updateGoal(goal.id, input) : await createGoal(input);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Meta actualizada" : "Meta creada");
      onClose();
    });
  }

  function remove() {
    if (!goal) return;
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      toast.success("Meta eliminada");
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!pending}
        title={editing ? "Editar meta" : "Nueva meta"}
        description={editing ? undefined : "Un apartado para algo concreto que estás juntando."}
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
              placeholder="Fondo de emergencia, Marchamo, Viaje…"
              className={inputClass}
            />
          </Field>

          <AmountInput value={target} onChange={setTarget} label="Objetivo" />

          <Field label="Fecha objetivo" hint="Opcional. Con ella la app calcula cuánto apartar por mes.">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div role="group" aria-labelledby={colorLabelId} className="flex flex-col gap-2">
            <span id={colorLabelId} className={labelClass}>
              Color
            </span>
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((option) => {
                const selected = color === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={option.label}
                    onClick={() => setColor(option.value)}
                    style={{ background: goalColorVar(option.value) }}
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-control text-white transition-[box-shadow] duration-150 ${
                      selected ? "shadow-[0_0_0_2px_var(--ground),0_0_0_4px_var(--ink)]" : ""
                    }`}
                  >
                    {selected && <Check size={14} weight="bold" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>

          {editing && goal && goal.current_amount > 0 && (
            <p className="text-meta leading-relaxed text-ink-3">
              Lo abonado se cambia desde el botón Abonar de la meta, no acá.
            </p>
          )}

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar esta meta?"
        description="Se borran también sus abonos, así que esa plata vuelve a contar en el saldo de tus cuentas."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
