import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { DebtsSection } from "@/components/debts/DebtsSection";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { LeadFigure, SectionLead } from "@/components/shell/SectionLead";
import { Money } from "@/components/ui/Money";
import { budgetTotals, type BudgetProgress } from "@/lib/budgets";
import { debtTotals } from "@/lib/debts";
import { goalsTotal } from "@/lib/goals";
import type { Account, Debt, GoalContribution, SavingsGoal } from "@/lib/types";
import { BudgetsSection } from "./BudgetsSection";
import { GoalsSection } from "./GoalsSection";

export type PlanTab = "presupuestos" | "metas" | "deudas";

const TABS: { id: PlanTab; label: string; shortLabel?: string }[] = [
  { id: "presupuestos", label: "Presupuestos", shortLabel: "Topes" },
  { id: "metas", label: "Metas" },
  { id: "deudas", label: "Deudas" },
];

/**
 * Plan: lo que uno se propone, separado de lo que ya pasó. Dos pestañas —
 * los topes de gasto del mes y las metas de ahorro— en vez de dos entradas
 * más en la navegación, que en teléfono ya está al límite con cinco.
 *
 * Las pestañas son links y no estado de cliente: así el mes que estás viendo
 * y la pestaña viven en la URL, se puede volver atrás y la página se arma en
 * el servidor con los datos justos.
 */
export function PlanView({
  tab,
  monthYear,
  monthLabel,
  previousMonth,
  nextMonth,
  progress,
  availableCategories,
  expenseCategoryOptions,
  untracked,
  goals,
  accounts,
  contributions,
  debts,
  todayKey,
}: {
  tab: PlanTab;
  monthYear: string;
  monthLabel: string;
  previousMonth: string;
  nextMonth: string;
  progress: BudgetProgress[];
  /** Categorías sin tope todavía: las que se pueden presupuestar. */
  availableCategories: string[];
  /** Todas las de gasto, para el movimiento que genera una meta anual. */
  expenseCategoryOptions: string[];
  untracked: { category: string; spent: number }[];
  goals: SavingsGoal[];
  accounts: Account[];
  contributions: GoalContribution[];
  debts: Debt[];
  todayKey: string;
}) {
  // Funciones puras sobre datos que ya bajaron: ninguna consulta de más.
  const budgets = budgetTotals(progress);
  const goalsSum = goalsTotal(goals);
  const debts30 = debtTotals(debts, todayKey);

  return (
    <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
      <PageHeader
        title="Plan"
        meta="Lo que te proponés: topes de gasto del mes, metas de ahorro y las deudas con otras personas."
        mobileActions={<InstallAppButton />}
      />

      <nav aria-label="Secciones del plan" className="flex gap-1 pt-3 md:pt-0">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={item.id === "presupuestos" ? "/dashboard/plan" : `/dashboard/plan?ver=${item.id}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-control px-3 text-label transition-colors duration-150 ${
                active
                  ? "bg-surface-raised text-ink"
                  : "font-normal text-ink-3 hover:text-ink"
              }`}
            >
              {/* A 360px tres pestañas con la palabra completa no caben. */}
              <span className={item.shortLabel ? "sm:hidden" : undefined}>
                {item.shortLabel ?? item.label}
              </span>
              {item.shortLabel && <span className="hidden sm:inline">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {tab === "presupuestos" ? (
        <div className="max-w-[760px] pt-5">
          {/* El mes vive en la URL: los topes son por mes, y poder ir al
              anterior es la forma de ver cómo cerró. */}
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <Link
              href={`/dashboard/plan?mes=${previousMonth}`}
              aria-label="Mes anterior"
              className="inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
            >
              <CaretLeft size={14} aria-hidden />
            </Link>
            <span className="text-label text-ink first-letter:uppercase">{monthLabel}</span>
            <Link
              href={`/dashboard/plan?mes=${nextMonth}`}
              aria-label="Mes siguiente"
              className="inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
            >
              <CaretRight size={14} aria-hidden />
            </Link>
          </div>

          {progress.length > 0 && (
            <SectionLead
              label={`Te queda de tus topes de ${monthLabel}`}
              value={budgets.limit - budgets.spent}
              tone={budgets.limit - budgets.spent < 0 ? "expense" : "ink"}
              note={
                budgets.over > 0
                  ? `Ya te pasaste en ${budgets.over} categoría${budgets.over === 1 ? "" : "s"}. El tope se mide contra los movimientos y los gastos fijos de esa categoría.`
                  : "Lo que podés seguir gastando sin pasarte de lo que vos mismo te pusiste."
              }
              aside={
                <>
                  <LeadFigure label="Tope total">
                    <Money value={budgets.limit} />
                  </LeadFigure>
                  <LeadFigure label="Gastado">
                    <Money value={budgets.spent} />
                  </LeadFigure>
                </>
              }
            />
          )}

          <div className={progress.length > 0 ? "border-t border-line pt-4" : "pt-4"}>
            <BudgetsSection
              progress={progress}
              monthYear={monthYear}
              monthLabel={monthLabel}
              availableCategories={availableCategories}
              untracked={untracked}
            />
          </div>
        </div>
      ) : tab === "metas" ? (
        <div>
          {goals.length > 0 && (
            <SectionLead
              label="Llevás apartado"
              value={goalsSum.saved}
              note={
                goalsSum.saved >= goalsSum.target
                  ? "Ya juntaste todo lo que te propusiste."
                  : `Te faltan ${Math.round(((goalsSum.target - goalsSum.saved) / goalsSum.target) * 100)} % para llegar a lo que te propusiste. Esta plata sigue en tus cuentas: apartarla es una marca, no un movimiento.`
              }
              aside={
                <LeadFigure label="Objetivo">
                  <Money value={goalsSum.target} />
                </LeadFigure>
              }
            />
          )}
          <GoalsSection
            goals={goals}
            accounts={accounts}
            contributions={contributions}
            categories={expenseCategoryOptions}
            todayKey={todayKey}
          />
        </div>
      ) : (
        <div className="max-w-[760px]">
          {debts.length > 0 && (
            <SectionLead
              label={debts30.net < 0 ? "Debés más de lo que te deben" : "Te deben más de lo que debés"}
              value={debts30.net}
              tone={debts30.net < 0 ? "expense" : "ink"}
              note={
                debts30.overdueCount > 0
                  ? `${debts30.overdueCount} deuda${debts30.overdueCount === 1 ? " está vencida" : "s están vencidas"}. Una deuda no toca tus cuentas hasta que la saldás.`
                  : "Una deuda no toca tus cuentas hasta que la saldás: prestar no es un gasto y que te deban no es un ingreso."
              }
              aside={
                <>
                  <LeadFigure label="Te deben">
                    <Money value={debts30.owedToMe} />
                  </LeadFigure>
                  <LeadFigure label="Debés">
                    <Money value={debts30.owedByMe} />
                  </LeadFigure>
                </>
              }
            />
          )}
          <DebtsSection debts={debts} accounts={accounts} todayKey={todayKey} />
        </div>
      )}
    </main>
  );
}
