"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { deleteBudget, setBudget } from "@/app/dashboard/plan/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { AmountInput, formatAmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Select } from "@/components/ui/Field";
import type { BudgetProgress } from "@/lib/budgets";

/**
 * Poner o cambiar el tope de una categoría para un mes.
 *
 * La categoría solo se elige al crear: cambiarla sería borrar un tope y
 * crear otro, y hacerlo sin decirlo deja el historial del mes raro.
 */
export function BudgetDialog({
  open,
  onClose,
  monthYear,
  monthLabel,
  categories,
  budget,
  presetCategory,
}: {
  open: boolean;
  onClose: () => void;
  monthYear: string;
  monthLabel: string;
  /** Categorías que todavía no tienen tope este mes. */
  categories: string[];
  /** Presupuesto a editar, o null para crear uno. */
  budget?: BudgetProgress | null;
  /** Categoría preseleccionada al crear (desde "sin tope"). */
  presetCategory?: string | null;
}) {
  const toast = useToast();
  const formId = useId();
  const categoryId = useId();
  const editing = Boolean(budget);

  const options = budget ? [budget.category] : categories;
  const [category, setCategory] = useState(
    budget?.category ?? presetCategory ?? categories[0] ?? ""
  );
  const [limit, setLimit] = useState(budget ? formatAmountInput(budget.limit) : "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = parseAmount(limit);
    if (!category) {
      setError("Elegí una categoría.");
      return;
    }
    if (!limit || !Number.isFinite(value) || value <= 0) {
      setError("El tope debe ser mayor a cero.");
      return;
    }

    startTransition(async () => {
      const result = await setBudget({ category, monthlyLimit: value, monthYear });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Tope actualizado" : `Tope de ${category} guardado`);
      onClose();
    });
  }

  function remove() {
    if (!budget) return;
    startTransition(async () => {
      const result = await deleteBudget(budget.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      toast.success("Tope eliminado");
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!pending}
        size="sm"
        title={editing ? "Editar tope" : "Nuevo tope"}
        description={`Para ${monthLabel}. El tope vale solo para ese mes.`}
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
            <Button
              variant="primary"
              type="submit"
              form={formId}
              disabled={pending || options.length === 0}
            >
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        {options.length === 0 ? (
          <p className="py-4 text-sm leading-relaxed text-ink-2">
            Todas tus categorías de gasto ya tienen tope este mes. Tocá una para cambiarlo.
          </p>
        ) : (
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-5"
          >
            <Field label="Categoría">
              <Select
                id={categoryId}
                value={category}
                disabled={editing}
                onChange={(e) => setCategory(e.target.value)}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>

            <AmountInput
              value={limit}
              onChange={setLimit}
              autoFocus
              label="Tope del mes"
            />

            <p className="text-meta leading-relaxed text-ink-3">
              Se compara contra todo lo que gastés en la categoría, incluidos los gastos fijos que
              tengan esa misma categoría.
            </p>

            <FormError>{error}</FormError>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar este tope?"
        description="Los gastos de la categoría no se tocan; solo deja de medirse contra un límite."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
