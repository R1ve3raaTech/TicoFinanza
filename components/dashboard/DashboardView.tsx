import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AccountsPanel } from "@/components/accounts/AccountsPanel";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { FixedExpenseEntryProvider } from "@/components/fixed/FixedExpenseEntry";
import { InstallAppButton } from "@/components/InstallAppButton";
import { AddMovementButton, MovementEntryProvider } from "@/components/movements/MovementEntry";
import { PageHeader } from "@/components/shell/PageHeader";
import type { Comparison } from "@/lib/comparison";
import type { ExpectedIncome } from "@/lib/fixedIncomes";
import type { UpcomingPayment } from "@/lib/fixedExpenses";
import type { MonthHeadline } from "@/lib/greeting";
import type { CategorySlice, MonthSummary, MonthTotal } from "@/lib/insights";
import type { Account, Transaction, UserCategory } from "@/lib/types";
import { FirstSteps } from "./FirstSteps";
import { ExpectedIncomes } from "./ExpectedIncomes";
import { SummaryCards } from "./SummaryCards";
import { UpcomingPayments } from "./UpcomingPayments";

/**
 * Resumen: la pantalla que contesta "cómo vengo este mes".
 *
 * Arriba el resumen ejecutivo; abajo, lo que vence pronto (lo único que pide
 * acción) y al final los dos gráficos.
 *
 * El calendario del mes se quitó: contestaba lo mismo que "Próximos pagos",
 * que está al lado, y en teléfono eran dos pantallazos para la misma
 * pregunta.
 * Composición separada de la carga de datos (page.tsx) para poder verla con
 * datos de ejemplo.
 */
export function DashboardView({
  summary,
  comparison,
  accounts,
  payments,
  categorySlices,
  months,
  customCategories,
  recent = [],
  toConfirm = [],
  pendingIncome = 0,
  todayKey,
  todayLabel,
  monthLabel,
  greeting,
  headline,
  isEmpty,
  hasFixed,
  hasMovement,
}: {
  summary: MonthSummary;
  /** Gasto variable de este mes contra el pasado, al mismo día. */
  comparison: Comparison;
  accounts: Account[];
  payments: UpcomingPayment[];
  categorySlices: CategorySlice[];
  months: MonthTotal[];
  customCategories: UserCategory[];
  /** Movimientos recientes, para sugerir categoría y cuenta al escribir. */
  recent?: Pick<Transaction, "description" | "category" | "account_id" | "transaction_date">[];
  /** Ingresos fijos cuya fecha ya pasó y siguen sin confirmar. */
  toConfirm?: ExpectedIncome[];
  /** Ingresos fijos del mes que todavía no entraron. */
  pendingIncome?: number;
  todayKey: string;
  todayLabel: string;
  monthLabel: string;
  /** "Buenas tardes, Camil". La hora se resuelve en el servidor. */
  greeting: string;
  /** Cómo viene el mes, en una oración. null si no hay nada anotado. */
  headline: MonthHeadline | null;
  isEmpty: boolean;
  hasFixed: boolean;
  hasMovement: boolean;
}) {
  const monthExpenses = summary.fixedExpenses + summary.variableExpenses;

  return (
    <FixedExpenseEntryProvider
      customCategories={customCategories}
      accounts={accounts}
      todayKey={todayKey}
    >
      <MovementEntryProvider
        customCategories={customCategories}
        accounts={accounts}
        recent={recent}
      >
        <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
          <PageHeader
            title="Resumen"
            meta={todayLabel}
            // Con la cuenta vacía la acción primaria vive en "Empezá por
            // acá" (y es cargar los fijos, no anotar un movimiento): dejarla
            // también en el encabezado daba tres botones celestes en una
            // pantalla que todavía no tiene datos.
            actions={isEmpty ? undefined : <AddMovementButton />}
            mobileActions={
              <>
                <InstallAppButton />
                {!isEmpty && <AddMovementButton iconOnly />}
              </>
            }
          />

          <div className="pt-3 md:pt-0">
            <div className="pb-4">
              <h2 className="text-heading text-ink">
                {greeting}
              </h2>
              {/* La frase que contesta "cómo vengo", con los números de la
                  persona. Sin ella la pantalla abría con cuatro cifras y
                  nada que las interpretara. */}
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">
                {headline ? (
                  <>
                    {headline.text}
                    {headline.pending && (
                      <span className="text-ink-3"> {headline.pending}</span>
                    )}
                  </>
                ) : (
                  <>Todavía no anotaste nada este mes. Empezá por los tres pasos de abajo.</>
                )}
              </p>
            </div>
            <h3 className="pb-3 text-label text-ink-2">Tu mes de {monthLabel}</h3>
            <SummaryCards summary={summary} comparison={comparison} />
          </div>

          {/* Sin envoltorio con padding: cuando los tres pasos están
              listos el componente no renderiza nada, y un div con `pt-10`
              dejaría un hueco muerto en la pantalla de siempre. */}
          <FirstSteps
            hasAccount={accounts.length > 0}
            hasFixed={hasFixed}
            hasMovement={hasMovement}
          />

          <ExpectedIncomes incomes={toConfirm} accounts={accounts} />

          {/* Sin ninguna cuenta el panel no aparece: su estado vacío decía
              lo mismo que el primer paso de arriba, con otro botón al lado.
              Dos invitaciones a lo mismo, una debajo de la otra. */}
          {accounts.length > 0 && (
            <div className="pt-8">
              <AccountsPanel
              accounts={accounts}
              pendingFixed={summary.fixedPending}
              pendingIncome={pendingIncome}
            />
            </div>
          )}

          {!isEmpty && (
            <>
              <div className="pt-8">
                <UpcomingPayments payments={payments} />
              </div>

              <div className="grid gap-10 pt-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
                <section aria-labelledby="categorias-titulo" className="min-w-0">
                  <div className="flex h-10 items-center justify-between gap-3">
                    <h2 id="categorias-titulo" className="text-heading text-ink">
                      Gasto por categoría
                    </h2>
                    <Link
                      href="/dashboard/plan"
                      className="inline-flex items-center gap-1 text-label text-accent underline-offset-4 hover:underline"
                    >
                      Presupuestos
                      <ArrowRight size={12} aria-hidden />
                    </Link>
                  </div>
                  <div className="border-t border-line pt-5">
                    <CategoryDonut slices={categorySlices} total={monthExpenses} />
                  </div>
                </section>

                <section aria-labelledby="seis-meses-titulo" className="min-w-0">
                  <div className="flex h-10 items-center gap-3">
                    <h2 id="seis-meses-titulo" className="text-heading text-ink">
                      Ingresos vs. egresos
                    </h2>
                  </div>
                  <div className="border-t border-line pt-5">
                    <IncomeExpenseChart data={months} size="lg" />
                    <p className="mt-4 max-w-[52ch] text-meta leading-relaxed text-ink-3">
                      Movimientos registrados mes a mes. Los gastos fijos no entran acá, ni
                      siquiera los que marcaste pagados: son un plan mensual y ya suman en las
                      tarjetas de arriba. Contarlos dos veces sería peor que no mostrarlos.
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </MovementEntryProvider>
    </FixedExpenseEntryProvider>
  );
}
