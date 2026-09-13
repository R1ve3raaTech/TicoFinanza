"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { deleteBudget, setBudget } from "@/app/dashboard/settings/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, inputClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { Budget } from "@/lib/types";

export function BudgetManager({
  budgets,
  categories,
}: {
  budgets: Budget[];
  categories: string[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const available = categories.filter((c) => !budgets.some((b) => b.category === c));
  const [category, setCategory] = useState(available[0] ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Si la categoría elegida ya tiene presupuesto (se acaba de agregar), el
  // selector cae a la primera que queda libre.
  const target = available.includes(category) ? category : (available[0] ?? "");

  function submit() {
    if (!target || !amount) return;
    setError(null);
    startTransition(async () => {
      const result = await setBudget(target, Number(amount.replace(",", ".")));
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setAmount("");
        toast.success(`Presupuesto de ${target} guardado`);
      }
    });
  }

  function remove(id: string, categoryName: string) {
    startTransition(async () => {
      await deleteBudget(id);
      toast.success(`Presupuesto de ${categoryName} eliminado`);
    });
  }

  return (
    <>
      {budgets.length === 0 ? (
        <p className="border-b border-line py-3.5 text-sm text-ink-2">
          No tenés presupuestos configurados.
        </p>
      ) : (
        <ul>
          {budgets.map((b) => (
            <li key={b.id} className="flex items-center gap-3 border-b border-line py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{b.category}</span>
              <span className="text-sm text-ink-2">
                <Money value={b.monthly_limit} />
                <span className="ml-1 text-meta text-ink-3">al mes</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon
                onClick={() => remove(b.id, b.category)}
                aria-label={`Borrar presupuesto de ${b.category}`}
                className="-mr-2"
              >
                <X size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-end"
        >
          <Field label="Categoría" className="sm:w-56">
            <Select value={target} onChange={(e) => setCategory(e.target.value)}>
              {available.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Límite mensual" className="sm:w-44">
            <span className="relative block">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3"
              >
                ₡
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className={`${inputClass} money pl-7`}
              />
            </span>
          </Field>
          <Button type="submit" variant="secondary" size="field" disabled={pending || !amount}>
            Agregar presupuesto
          </Button>
        </form>
      )}
      <FormError>{error}</FormError>
    </>
  );
}
