"use client";

import { useState, useTransition } from "react";
import { Copy, Plus } from "@phosphor-icons/react";
import { copyBudgetsFromPreviousMonth } from "@/app/dashboard/plan/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { budgetTotals, type BudgetProgress } from "@/lib/budgets";
import { BudgetDialog } from "./BudgetDialog";
import { BudgetMeter } from "./BudgetMeter";

/**
 * Presupuestos del mes: un tope por categoría y cuánto se lleva gastado de
 * cada uno. Debajo, las categorías en las que ya se gastó algo y todavía no
 * tienen tope — que es de donde salen casi todos los presupuestos nuevos.
 */
export function BudgetsSection({
  progress,
  monthYear,
  monthLabel,
  availableCategories,
  untracked,
}: {
  progress: BudgetProgress[];
  monthYear: string;
  monthLabel: string;
  /** Categorías de gasto sin tope este mes. */
  availableCategories: string[];
  /** Categorías con gasto del mes pero sin tope, de mayor a menor. */
  untracked: { category: string; spent: number }[];
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetProgress | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const [copying, startCopy] = useTransition();

  function openDialog(budget: BudgetProgress | null, category: string | null = null) {
    setEditing(budget);
    setPreset(category);
    setSession((s) => s + 1);
    setOpen(true);
  }

  function copyPrevious() {
    startCopy(async () => {
      const result = await copyBudgetsFromPreviousMonth(monthYear);
      if (result.error) toast.error(result.error);
      else if (result.copied === 0) toast.success("No había topes el mes pasado");
      else toast.success(`${result.copied} tope${result.copied === 1 ? "" : "s"} copiado${result.copied === 1 ? "" : "s"}`);
    });
  }

  const totals = budgetTotals(progress);

  return (
    <section aria-labelledby="presupuestos-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        {/* El mes ya está en el selector de arriba: repetirlo acá partía el
            título en dos renglones en teléfono. */}
        <h2 id="presupuestos-titulo" className="text-heading text-ink">
          Topes
          {totals.over > 0 && (
            <span className="ml-2 text-meta font-normal text-expense">
              {totals.over} excedido{totals.over === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPrevious}
            disabled={copying}
            title="Copiar los topes del mes pasado"
          >
            <Copy size={14} />
            Copiar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openDialog(null)} className="-mr-2">
            <Plus size={14} weight="bold" />
            Nuevo
          </Button>
        </div>
      </div>

      {progress.length === 0 ? (
        <div className="border-t border-line py-8">
          <p className="max-w-[54ch] text-sm leading-relaxed text-ink-2">
            Poné un tope mensual a las categorías que se te van de las manos. La app compara lo
            que llevás gastado contra ese número y te avisa antes de pasarte, no después.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openDialog(null)}>
              <Plus size={15} weight="bold" />
              Poner el primero
            </Button>
            <Button variant="ghost" onClick={copyPrevious} disabled={copying}>
              <Copy size={15} />
              Copiar los del mes pasado
            </Button>
          </div>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-6 border-y border-line py-3">
            <div className="min-w-0">
              <dt className="text-meta text-ink-3">Tope total</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={totals.limit} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-meta text-ink-3">Gastado</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={totals.spent} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-meta text-ink-3">Disponible</dt>
              <dd
                className={`money mt-0.5 text-label ${
                  totals.limit - totals.spent < 0 ? "text-expense" : "text-ink"
                }`}
              >
                <Money value={totals.limit - totals.spent} />
              </dd>
            </div>
          </dl>

          <ul>
            {progress.map((item) => (
              <li key={item.id} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => openDialog(item)}
                  className="-mx-2 w-[calc(100%+1rem)] cursor-pointer rounded-control px-2 py-3.5 text-left transition-colors duration-150 hover:bg-surface-hover/70"
                >
                  <BudgetMeter item={item} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {untracked.length > 0 && (
        <div className="pt-6">
          <h3 className="text-label text-ink-2">Sin tope este mes</h3>
          <p className="mt-1 text-meta text-ink-3">
            Categorías en las que ya gastaste y todavía no tienen límite.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {untracked.map((item) => (
              <li key={item.category}>
                <button
                  type="button"
                  onClick={() => openDialog(null, item.category)}
                  className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-control border border-line px-2.5 text-label text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink"
                >
                  <Plus size={12} weight="bold" aria-hidden />
                  {item.category}
                  <Money value={item.spent} className="text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BudgetDialog
        key={session}
        open={open}
        onClose={() => setOpen(false)}
        monthYear={monthYear}
        monthLabel={monthLabel}
        categories={availableCategories}
        budget={editing}
        presetCategory={preset}
      />
    </section>
  );
}
