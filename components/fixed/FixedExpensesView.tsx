import Link from "next/link";
import { AguinaldoPanel } from "@/components/incomes/AguinaldoPanel";
import { FixedIncomesList } from "@/components/incomes/FixedIncomesList";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { Money } from "@/components/ui/Money";
import type { Aguinaldo } from "@/lib/aguinaldo";
import type { FixedTotals, UpcomingPayment } from "@/lib/fixedExpenses";
import type { Account, FixedExpense, FixedIncome, UserCategory } from "@/lib/types";
import { AddFixedExpenseButton, FixedExpenseEntryProvider } from "./FixedExpenseEntry";
import { FixedExpensesList } from "./FixedExpensesList";

function Figure({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="mt-1 text-figure text-ink">
        <Money value={value} tabular={false} />
      </dd>
      {hint && <p className="mt-0.5 text-micro text-ink-3">{hint}</p>}
    </div>
  );
}

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

  return (
    <FixedExpenseEntryProvider
      customCategories={customCategories}
      accounts={accounts}
      todayKey={todayKey}
    >
      <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
        <PageHeader
          title="Fijos"
          meta={
            tab === "gastos"
              ? `Lo que se cobra todos los meses, con su día. Marcás pagado y en ${monthLabel} vuelve a empezar.`
              : "Lo que entra todos los meses. El día del pago lo confirmás de un toque, no se registra solo."
          }
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
          <div className="max-w-[900px] pt-5">
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
        <dl className="grid grid-cols-2 gap-6 border-b border-line pb-6 pt-5 sm:grid-cols-3">
          <Figure label="Total del mes" value={-totals.total} />
          <Figure
            label="Pendiente"
            value={-totals.pending}
            hint={
              pendingCount === 0
                ? "Todo al día"
                : `${pendingCount} pago${pendingCount === 1 ? "" : "s"} por hacer`
            }
          />
          <Figure label="Pagado" value={-totals.paid} />
        </dl>

        <div className="pt-4">
          <FixedExpensesList expenses={expenses} payments={payments} accounts={accounts} />
        </div>
        </>
        )}
      </main>
    </FixedExpenseEntryProvider>
  );
}
