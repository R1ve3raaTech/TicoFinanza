import Link from "next/link";
import { AguinaldoPanel } from "@/components/incomes/AguinaldoPanel";
import { FixedIncomesList } from "@/components/incomes/FixedIncomesList";
import { InstallAppButton } from "@/components/InstallAppButton";
import { LeadFigure, SectionLead } from "@/components/shell/SectionLead";
import { PageHeader } from "@/components/shell/PageHeader";
import { Money } from "@/components/ui/Money";
import type { Aguinaldo } from "@/lib/aguinaldo";
import { incomeTotals } from "@/lib/fixedIncomes";
import type { FixedTotals, UpcomingPayment } from "@/lib/fixedExpenses";
import type { Account, FixedExpense, FixedIncome, UserCategory } from "@/lib/types";
import { AddFixedExpenseButton, FixedExpenseEntryProvider } from "./FixedExpenseEntry";
import { FixedExpensesList } from "./FixedExpensesList";

/**
 * Membresías y gastos fijos. Composición separada de la carga de datos
 * (page.tsx) para poder verla con datos de ejemplo.
 */
export function FixedExpensesView({
  expenses,
  payments,
  totals,
  customCategories,
  accounts,
  todayKey,
  monthLabel,
  tab,
  incomes,
  currentMonth,
  aguinaldo,
}: {
  expenses: FixedExpense[];
  payments: UpcomingPayment[];
  totals: FixedTotals;
  customCategories: UserCategory[];
  accounts: Account[];
  todayKey: string;
  monthLabel: string;
  /** Qué pestaña se está viendo. */
  tab: "gastos" | "ingresos";
  incomes: FixedIncome[];
  currentMonth: string;
  aguinaldo: Aguinaldo;
}) {
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  // Cuentas del mes para el encabezado de la pestaña de ingresos. Es una
  // función pura sobre datos que ya bajaron: no hay consulta de más.
  const incomes30 = incomeTotals(incomes, currentMonth);

  return (
    <FixedExpenseEntryProvider
      customCategories={customCategories}
      accounts={accounts}
      todayKey={todayKey}
    >
      <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
        <PageHeader
          title="Fijos"
          meta={tab === "gastos" ? "Lo que se cobra todos los meses" : "Lo que entra todos los meses"}
          actions={tab === "gastos" ? <AddFixedExpenseButton /> : undefined}
          mobileActions={
            <>
              <InstallAppButton />
              {tab === "gastos" && <AddFixedExpenseButton iconOnly />}
            </>
          }
        />

        {/* Pestañas como enlaces, igual que en Plan: lo que estás viendo
            vive en la URL y se puede volver atrás. */}
        <nav aria-label="Secciones de fijos" className="flex gap-1 pt-3 md:pt-0">
          {([
            { id: "gastos", label: "Gastos" },
            { id: "ingresos", label: "Ingresos" },
          ] as const).map((item) => (
            <Link
              key={item.id}
              href={item.id === "gastos" ? "/dashboard/fijos" : "/dashboard/fijos?ver=ingresos"}
              aria-current={tab === item.id ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-control px-3 text-label transition-colors duration-150 ${
                tab === item.id
                  ? "bg-surface-raised text-ink"
                  : "font-normal text-ink-3 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {tab === "ingresos" ? (
          <div>
            <SectionLead
              label={`Entra todos los meses en ${monthLabel}`}
              value={incomes30.expected}
              note={
                incomes.length === 0
                  ? "Todavía no anotaste ningún ingreso fijo."
                  : incomes30.pending > 0
                    ? "Lo que ya entró y lo que falta por confirmar."
                    : "Todo lo del mes ya entró y quedó confirmado."
              }
              aside={
                incomes.length > 0 ? (
                  <>
                    <LeadFigure label="Confirmado">
                      <Money value={incomes30.confirmed} />
                    </LeadFigure>
                    <LeadFigure label="Por confirmar">
                      <Money value={incomes30.pending} />
                    </LeadFigure>
                  </>
                ) : undefined
              }
            />
            <FixedIncomesList
              incomes={incomes}
              accounts={accounts}
              customCategories={customCategories}
              todayKey={todayKey}
              currentMonth={currentMonth}
            />
            <AguinaldoPanel data={aguinaldo} />
          </div>
        ) : (
        <>
        <SectionLead
          label={`Se te va en fijos en ${monthLabel}`}
          value={-totals.total}
          note={
            expenses.length === 0
              ? "Todavía no anotaste ningún gasto fijo."
              : pendingCount === 0
                ? "Todo pagado este mes."
                : `Te faltan ${pendingCount} pago${pendingCount === 1 ? "" : "s"} por hacer este mes.`
          }
          aside={
            expenses.length > 0 ? (
              <>
                <LeadFigure label="Pagado">
                  <Money value={totals.paid} />
                </LeadFigure>
                <LeadFigure label="Por pagar">
                  <Money value={totals.pending} />
                </LeadFigure>
              </>
            ) : undefined
          }
        />

        <div className="border-t border-line pt-4">
          <FixedExpensesList expenses={expenses} payments={payments} accounts={accounts} />
        </div>
        </>
        )}
      </main>
    </FixedExpenseEntryProvider>
  );
}
