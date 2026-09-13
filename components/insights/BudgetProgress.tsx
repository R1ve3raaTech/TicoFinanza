import Link from "next/link";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { buttonClass } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import type { Budget } from "@/lib/types";

export function BudgetProgress({
  budgets,
  spentByCategory,
}: {
  budgets: Budget[];
  spentByCategory: Map<string, number>;
}) {
  if (budgets.length === 0) {
    return (
      <div className="border-t border-line pt-3">
        <p className="text-sm text-ink-3">
          No tenés presupuestos. Poné un límite mensual por categoría para ver acá cuánto llevás.
        </p>
        <Link
          href="/dashboard/settings#presupuestos"
          className={buttonClass({ variant: "secondary", size: "sm", className: "mt-3" })}
        >
          Crear un presupuesto
        </Link>
      </div>
    );
  }

  return (
    <ul className="border-t border-line">
      {budgets.map((b) => {
        const spent = spentByCategory.get(b.category) ?? 0;
        const ratio = spent / b.monthly_limit;
        const pct = Math.min(1, ratio);
        const over = spent > b.monthly_limit;
        const near = !over && ratio > 0.8;

        return (
          <li key={b.id} className="border-b border-line py-3 last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm text-ink">{b.category}</span>
                {/* El estado no puede depender solo del color de la barra:
                    ícono y texto lo dicen igual con daltonismo. */}
                {(over || near) && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-meta font-medium ${
                      over ? "text-expense" : "text-warn"
                    }`}
                  >
                    <Warning size={12} weight="bold" aria-hidden />
                    {over ? "Te pasaste" : "Casi al límite"}
                  </span>
                )}
              </span>
              <span className="text-meta text-ink-3">
                <Money value={spent} className="text-sm text-ink" /> de{" "}
                <Money value={b.monthly_limit} />
                <span className="money ml-2">{Math.round(ratio * 100)}%</span>
              </span>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-[2px] bg-chart-track"
              role="progressbar"
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Presupuesto de ${b.category}`}
            >
              <div
                className={`h-full rounded-r-[3px] ${
                  over ? "bg-expense" : near ? "bg-warn" : "bg-chart-neutral"
                }`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
