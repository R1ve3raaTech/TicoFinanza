import type { ReactNode } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Money } from "@/components/ui/Money";
import type { FinanceSnapshot } from "@/lib/ai/insightsSummary";
import { BANK_BRAND } from "@/lib/bankBrand";
import type { BreakdownItem, MonthTotal, RecurringItem } from "@/lib/insights";
import type { Budget, SavingsGoal, Transaction } from "@/lib/types";
import { AiSummary } from "./AiSummary";
import { BreakdownList } from "./BreakdownList";
import { BudgetProgress } from "./BudgetProgress";
import { CategorizeButton } from "./CategorizeButton";
import { InsightSection } from "./InsightSection";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { SavingsGoals } from "./SavingsGoals";
import { SubscriptionsList } from "./SubscriptionsList";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Figure({
  label,
  swatch,
  children,
  className = "",
}: {
  label: string;
  swatch?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="flex items-center gap-2 text-label text-ink-2">
        {swatch && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${swatch}`} />}
        {label}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

/**
 * Estadísticas como un informe del mes: tres cifras de cabecera, el resumen
 * escrito, el gráfico de 6 meses a todo el ancho, y debajo el detalle en dos
 * columnas separadas por líneas finas.
 */
export function InsightsView({
  monthName,
  monthYear,
  previousMonthName,
  thisMonth,
  netDelta,
  months,
  aiSnapshot,
  byEntity,
  byCategory,
  uncategorizedCount,
  budgets,
  spentByCategory,
  recurring,
  goals,
  transactions,
}: {
  monthName: string;
  monthYear: string;
  previousMonthName: string;
  thisMonth: MonthTotal;
  netDelta: number | null;
  months: MonthTotal[];
  aiSnapshot: FinanceSnapshot;
  byEntity: BreakdownItem[];
  byCategory: BreakdownItem[];
  uncategorizedCount: number;
  budgets: Budget[];
  spentByCategory: Map<string, number>;
  recurring: RecurringItem[];
  goals: SavingsGoal[];
  transactions: Transaction[];
}) {
  const net = thisMonth.income - thisMonth.expense;
  const meta = `${capitalize(monthYear)} · montos en colones`;
  const figure = "text-figure md:text-[1.75rem] md:leading-9";

  return (
    <main id="contenido" className="mx-auto w-full max-w-[1120px] px-4 pb-12 md:px-8 xl:px-12">
      <PageHeader title="Estadísticas" meta={meta} />
      <p className="pt-4 text-meta text-ink-3 md:hidden">{meta}</p>

      <section aria-label={`Resumen de ${monthName}`} className="pb-8 pt-5 md:pt-0">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 md:gap-x-0">
          <Figure
            label="Neto del mes"
            className="col-span-2 md:order-3 md:col-span-1 md:border-l md:border-line md:pl-8"
          >
            <Money
              value={net}
              plus
              tabular={false}
              className={`${figure} ${net < 0 ? "text-expense" : "text-ink"}`}
            />
            {netDelta !== null && (
              <p className="mt-1 text-meta text-ink-3">
                <span className={netDelta >= 0 ? "text-income" : "text-expense"}>
                  {netDelta >= 0 ? "▲" : "▼"} {Math.abs(netDelta).toFixed(0)}%
                </span>{" "}
                vs {previousMonthName}
              </p>
            )}
          </Figure>
          <Figure label="Ingresos" swatch="bg-chart-income" className="md:order-1 md:pr-8">
            <Money value={thisMonth.income} plus tabular={false} className={`${figure} text-ink`} />
          </Figure>
          <Figure
            label="Gastos"
            swatch="bg-chart-expense"
            className="md:order-2 md:border-l md:border-line md:px-8"
          >
            <Money value={-thisMonth.expense} tabular={false} className={`${figure} text-ink`} />
          </Figure>
        </dl>
      </section>

      <AiSummary snapshot={aiSnapshot} />

      <InsightSection
        id="seis-meses"
        title="Últimos 6 meses"
        description="Ingresos hacia arriba, gastos hacia abajo. El número de cada mes es el neto."
      >
        <div className="pt-3">
          <MonthlyBarChart data={months} size="lg" />
        </div>
      </InsightSection>

      <div className="grid md:grid-cols-2 md:gap-x-12">
        <InsightSection
          id="por-categoria"
          title="Gasto por categoría"
          description={`En ${monthName}`}
          action={<CategorizeButton pendingCount={uncategorizedCount} />}
        >
          <BreakdownList
            items={byCategory}
            emptyLabel="Todavía no hay gastos categorizados este mes."
          />
        </InsightSection>

        <InsightSection id="por-entidad" title="Gasto por entidad" description={`En ${monthName}`}>
          <BreakdownList
            items={byEntity.map((item) => ({
              ...item,
              label: BANK_BRAND[item.label as keyof typeof BANK_BRAND]?.label ?? item.label,
            }))}
            emptyLabel="Todavía no hay gastos este mes."
          />
        </InsightSection>

        <InsightSection
          id="presupuestos"
          title="Presupuestos"
          description={`Lo gastado en ${monthName} contra tu límite`}
        >
          <BudgetProgress budgets={budgets} spentByCategory={spentByCategory} />
        </InsightSection>

        <SavingsGoals goals={goals} transactions={transactions} />
      </div>

      <InsightSection
        id="recurrentes"
        title="Gastos recurrentes"
        description="El mismo gasto en al menos dos meses distintos, con montos parecidos."
      >
        <SubscriptionsList items={recurring} />
      </InsightSection>
    </main>
  );
}
