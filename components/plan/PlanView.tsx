import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { DebtsSection } from "@/components/debts/DebtsSection";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PageHeader } from "@/components/shell/PageHeader";
import type { BudgetProgress } from "@/lib/budgets";
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
  availableCategories: string[];
  untracked: { category: string; spent: number }[];
  goals: SavingsGoal[];
  accounts: Account[];
  contributions: GoalContribution[];
  debts: Debt[];
  todayKey: string;
}) {
  return (
    <main id="contenido" className="mx-auto w-full max-w-[1000px] px-4 pb-12 md:px-8 xl:px-12">
      <PageHeader
        title="Plan"
        meta="Topes de gasto, metas de ahorro y deudas."
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

          <div className="pt-4">
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
        <div className="pt-5">
          <GoalsSection
            goals={goals}
            accounts={accounts}
            contributions={contributions}
            todayKey={todayKey}
          />
        </div>
      ) : (
        <div className="max-w-[760px] pt-5">
          <DebtsSection debts={debts} accounts={accounts} todayKey={todayKey} />
        </div>
      )}
    </main>
  );
}
