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
import { Switch } from "@/components/ui/Switch";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { Money } from "@/components/ui/Money";
import { ANNUAL_GOAL_PRESETS, GOAL_COLORS, goalColorVar } from "@/lib/goals";
import type { GoalColor, GoalRecurrence, SavingsGoal } from "@/lib/types";

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
  const [annual, setAnnual] = useState(goal?.recurrence === "anual");
  const [error, setError] = useState<string | null>(null);

  // Derivado en el render y no en estado: el objetivo ya vive arriba, y una
  // copia en estado se desincroniza en el primer teclazo.
  const targetValue = parseAmount(target);
  const perMonth =
    Number.isFinite(targetValue) && targetValue > 0 ? Math.ceil(targetValue / 12) : null;
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
    if (annual && !date) {
      setError("Poné la fecha en que se paga: sin ella no hay ritmo mensual que calcular.");
      return;
    }

    const recurrence: GoalRecurrence = annual ? "anual" : "una-vez";

    startTransition(async () => {
      const input = { name, targetAmount: value, targetDate: date || null, color, recurrence };
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

          <div className="flex flex-col gap-2 rounded-surface border border-line bg-surface-raised/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-label text-ink">Se repite todos los años</span>
                <span className="mt-0.5 block text-meta leading-relaxed text-ink-3">
                  El marchamo, el seguro, los impuestos. Se divide entre doce y la meta vuelve a
                  arrancar sola cuando la pagás.
                </span>
              </span>
              <Switch
                checked={annual}
                onChange={() => setAnnual((v) => !v)}
                label="Se repite todos los años"
              />
            </div>

            {annual && (
              <>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ANNUAL_GOAL_PRESETS.map((preset) => (
                    <ToggleChip
                      key={preset}
                      pressed={name.trim().toLowerCase() === preset.toLowerCase()}
                      onClick={() => setName(preset)}
                    >
                      {preset}
                    </ToggleChip>
                  ))}
                </div>
                {perMonth !== null && (
                  <p className="text-meta text-ink-2">
                    Son <Money value={perMonth} className="font-medium text-ink" /> por mes
                    durante doce meses.
                  </p>
                )}
              </>
            )}
          </div>

          <Field
            label={annual ? "¿Qué día se paga?" : "Fecha objetivo"}
            hint={
              annual
                ? "Se cobra todos los años en esta fecha. El marchamo vence el 31 de diciembre."
                : "Opcional. Con ella la app calcula cuánto apartar por mes."
            }
          >
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
