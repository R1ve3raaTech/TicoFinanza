import { InstallAppButton } from "@/components/InstallAppButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { Money } from "@/components/ui/Money";
import type { FixedTotals, UpcomingPayment } from "@/lib/fixedExpenses";
import type { Account, FixedExpense, UserCategory } from "@/lib/types";
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
}: {
  expenses: FixedExpense[];
  payments: UpcomingPayment[];
  totals: FixedTotals;
  customCategories: UserCategory[];
  accounts: Account[];
  todayKey: string;
  monthLabel: string;
}) {
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  return (
    <FixedExpenseEntryProvider
      customCategories={customCategories}
      accounts={accounts}
      todayKey={todayKey}
    >
      <main id="contenido" className="mx-auto w-full max-w-[1000px] px-4 pb-12 md:px-8 xl:px-12">
        <PageHeader
          title="Gastos fijos"
          meta={`Membresías y pagos recurrentes · ${monthLabel}`}
          actions={<AddFixedExpenseButton />}
          mobileActions={
            <>
              <InstallAppButton />
              <AddFixedExpenseButton iconOnly />
            </>
          }
        />

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
          <FixedExpensesList expenses={expenses} payments={payments} />
        </div>
      </main>
    </FixedExpenseEntryProvider>
  );
}
