import type { ReactNode } from "react";
import { Money } from "@/components/ui/Money";
import type { Comparison } from "@/lib/comparison";
import { comparisonTone } from "@/lib/comparison";
import { formatMoney } from "@/lib/format";
import type { MonthSummary } from "@/lib/insights";

/**
 * "12 % más que en octubre a esta altura". Se compara contra el mismo día
 * del mes pasado, no contra el mes completo: medio mes contra uno entero
 * siempre diría que vas mejorando.
 */
function variationHint(comparison?: Comparison): string | null {
  if (!comparison || comparison.percent === null) return null;
  const tone = comparisonTone(comparison);
  if (tone === "igual") return "Igual que el mes pasado a esta altura";
  const percent = Math.abs(Math.round(comparison.percent));
  return `${percent} % ${tone} que el mes pasado a esta altura`;
}

function Card({
  label,
  hint,
  swatch,
  children,
}: {
  label: string;
  hint?: string;
  swatch?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-surface border border-line bg-surface p-4">
      <dt className="flex items-center gap-2 text-meta text-ink-3">
        {swatch && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${swatch}`} />}
        {label}
      </dt>
      <dd className="mt-2 text-figure">{children}</dd>
      {hint && <p className="mt-1 text-micro text-ink-3">{hint}</p>}
    </div>
  );
}

/**
 * Resumen ejecutivo del mes: lo que entró, lo que ya está comprometido en
 * gastos fijos, lo que se fue en gastos del día a día, y lo que queda.
 *
 * El neto es la única cifra que cambia de color, y solo porque el signo ahí
 * significa algo (superávit o déficit); las otras tres van en tinta con su
 * cuadradito de serie, el mismo que usan los gráficos.
 *
 * **El neto cuenta solo los fijos YA PAGADOS.** Antes restaba todos los del
 * mes: el día 2 mostraba un déficit rojo aunque lo único que pasara fuera
 * que el salario todavía no había entrado. Lo que falta por pagar se dice
 * aparte, en la misma tarjeta, sin pintarlo de rojo — es un compromiso, no
 * una pérdida.
 */
export function SummaryCards({
  summary,
  comparison,
}: {
  summary: MonthSummary;
  comparison?: Comparison;
}) {
  const deficit = summary.net < 0;
  // En cero no hay ni superávit ni déficit: el verde ahí sobra.
  const netTone = deficit ? "text-expense" : summary.net > 0 ? "text-income" : "text-ink";

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Ingreso total" swatch="bg-chart-income">
        <Money value={summary.income} plus tabular={false} className="text-ink" />
      </Card>
      <Card
        label="Gastos fijos"
        swatch="bg-chart-ramp-1"
        hint={
          summary.fixedPending > 0
            ? `${formatMoney(summary.fixedPaid)} pagados · ${formatMoney(summary.fixedPending)} por pagar`
            : "Todos pagados este mes"
        }
      >
        <Money value={-summary.fixedExpenses} tabular={false} className="text-ink" />
      </Card>
      <Card
        label="Gastos variables"
        swatch="bg-chart-expense"
        hint={variationHint(comparison) ?? "Lo anotado a mano este mes"}
      >
        <Money value={-summary.variableExpenses} tabular={false} className="text-ink" />
      </Card>
      <Card
        label={deficit ? "Déficit del mes" : "Superávit del mes"}
        hint={
          summary.fixedPending > 0
            ? `Ya ejecutado. Faltan ${formatMoney(summary.fixedPending)} de fijos por pagar.`
            : "Ingresos − fijos − variables"
        }
      >
        <Money value={summary.net} plus tabular={false} className={netTone} />
      </Card>
    </dl>
  );
}
