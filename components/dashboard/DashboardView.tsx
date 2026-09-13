import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { InstallAppButton } from "@/components/InstallAppButton";
import { MonthlyBarChart } from "@/components/insights/MonthlyBarChart";
import { PageHeader } from "@/components/shell/PageHeader";
import type { MonthTotal } from "@/lib/insights";
import type { Transaction, UserCategory } from "@/lib/types";
import { BalanceSummary } from "./BalanceSummary";
import { AddCashButton, CashEntryProvider } from "./CashEntry";
import { DateRangeFilter } from "./DateRangeFilter";
import { SyncGmailButton } from "./SyncGmailButton";
import { TransactionList } from "./TransactionList";

/**
 * Composición del dashboard, separada de la carga de datos (page.tsx) para
 * poder verla con datos de ejemplo.
 *
 * Arriba el saldo como protagonista, con el período pegado encima porque es
 * lo que lo cambia. Abajo, el libro de movimientos ocupa el ancho principal y
 * en escritorio el gráfico de 6 meses acompaña en una columna angosta.
 */
export function DashboardView({
  balance,
  filtered,
  month,
  monthLabel,
  rangeLabel,
  todayLabel,
  months,
  transactions,
  customCategories,
}: {
  balance: number;
  filtered: boolean;
  month?: { income: number; expense: number };
  monthLabel: string;
  rangeLabel?: string;
  todayLabel: string;
  months: MonthTotal[];
  transactions: Transaction[];
  customCategories: UserCategory[];
}) {
  return (
    <CashEntryProvider customCategories={customCategories}>
      <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
        <PageHeader
          title="Dashboard"
          meta={todayLabel}
          actions={
            <>
              <SyncGmailButton />
              <AddCashButton />
            </>
          }
          mobileActions={
            <>
              <InstallAppButton />
              <SyncGmailButton iconOnly />
              <AddCashButton iconOnly />
            </>
          }
        />

        <div className="pt-3 md:pt-0">
          <DateRangeFilter />
        </div>

        <BalanceSummary
          balance={balance}
          filtered={filtered}
          month={month}
          monthLabel={monthLabel}
          rangeLabel={rangeLabel}
        />

        <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-16">
          <TransactionList
            title={filtered ? "Movimientos del período" : "Últimos movimientos"}
            transactions={transactions}
            customCategories={customCategories}
          />

          {/* Con un rango puesto las filas del gráfico también vienen
              filtradas y los 6 meses mentirían, así que no se muestra. */}
          {!filtered && (
            <aside aria-labelledby="seis-meses-titulo" className="hidden lg:block">
              <div className="sticky top-8">
                <div className="flex h-10 items-center justify-between gap-3">
                  <h2 id="seis-meses-titulo" className="text-heading text-ink">
                    Últimos 6 meses
                  </h2>
                  <Link
                    href="/dashboard/insights"
                    className="inline-flex items-center gap-1 text-label text-accent underline-offset-4 hover:underline"
                  >
                    Estadísticas
                    <ArrowRight size={12} aria-hidden />
                  </Link>
                </div>
                <div className="border-t border-line pt-4">
                  <MonthlyBarChart data={months} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </CashEntryProvider>
  );
}
