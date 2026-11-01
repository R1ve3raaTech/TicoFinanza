import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AccountsPanel } from "@/components/accounts/AccountsPanel";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { AddFixedExpenseButton, FixedExpenseEntryProvider } from "@/components/fixed/FixedExpenseEntry";
import { InstallAppButton } from "@/components/InstallAppButton";
import { AddMovementButton, MovementEntryProvider } from "@/components/movements/MovementEntry";
import { PageHeader } from "@/components/shell/PageHeader";
import type { CalendarDay, UpcomingPayment } from "@/lib/fixedExpenses";
import type { CategorySlice, MonthSummary, MonthTotal } from "@/lib/insights";
import type { Account, UserCategory } from "@/lib/types";
import { PaymentCalendar } from "./PaymentCalendar";
import { SummaryCards } from "./SummaryCards";
import { UpcomingPayments } from "./UpcomingPayments";

/** Primera pantalla de una cuenta nueva: dos caminos, nada de gráficos en cero. */
function GettingStarted() {
  return (
    <section aria-labelledby="empezar-titulo" className="border-t border-line pt-8">
      <h2 id="empezar-titulo" className="text-heading text-ink">
        Empezá por acá
      </h2>
      <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-ink-2">
        TicoFinanza no lee tus correos ni se conecta a tu banco: vos anotás lo que entra y lo que
        sale, y la app lleva la cuenta.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-surface border border-line bg-surface p-5">
          <h3 className="text-label text-ink">1. Cargá tus gastos fijos</h3>
          <p className="mt-1.5 text-meta leading-relaxed text-ink-3">
            Alquiler, agua, luz, internet, gimnasio, suscripciones. Con su día de cobro, para que
            la app te avise cuál vence primero.
          </p>
          <div className="mt-4">
            <AddFixedExpenseButton />
          </div>
        </div>
        <div className="rounded-surface border border-line bg-surface p-5">
          <h3 className="text-label text-ink">2. Anotá tus ingresos y gastos</h3>
          <p className="mt-1.5 text-meta leading-relaxed text-ink-3">
            El salario, lo del freelance, el súper, la gasolina. Cada uno con su categoría, para
            ver después en qué se te va la plata.
          </p>
          <div className="mt-4">
            <AddMovementButton variant="secondary" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Resumen: la pantalla que contesta "cómo vengo este mes".
 *
 * Arriba el resumen ejecutivo; abajo, lo que vence pronto (lo único que pide
 * acción) con el calendario del mes al lado, y al final los dos gráficos.
 * Composición separada de la carga de datos (page.tsx) para poder verla con
 * datos de ejemplo.
 */
export function DashboardView({
  summary,
  accounts,
  payments,
  calendar,
  calendarLabel,
  categorySlices,
  months,
  customCategories,
  todayKey,
  todayLabel,
  monthLabel,
  isEmpty,
}: {
  summary: MonthSummary;
  accounts: Account[];
  payments: UpcomingPayment[];
  calendar: CalendarDay[];
  calendarLabel: string;
  categorySlices: CategorySlice[];
  months: MonthTotal[];
  customCategories: UserCategory[];
  todayKey: string;
  todayLabel: string;
  monthLabel: string;
  isEmpty: boolean;
}) {
  const monthExpenses = summary.fixedExpenses + summary.variableExpenses;
  const chargesThisMonth = calendar.reduce((sum, day) => sum + day.charges.length, 0);

  return (
    <FixedExpenseEntryProvider
      customCategories={customCategories}
      accounts={accounts}
      todayKey={todayKey}
    >
      <MovementEntryProvider customCategories={customCategories} accounts={accounts}>
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
            <h2 className="pb-3 text-label text-ink-2">
              Tu mes de {monthLabel}
            </h2>
            <SummaryCards summary={summary} />
          </div>

          <div className="pt-8">
            <AccountsPanel accounts={accounts} />
          </div>

          {isEmpty ? (
            <div className="pt-10">
              <GettingStarted />
            </div>
          ) : (
            <>
              <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 xl:gap-16">
                <UpcomingPayments payments={payments} />
                <PaymentCalendar
                  days={calendar}
                  label={calendarLabel}
                  total={chargesThisMonth}
                />
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
                      Movimientos registrados mes a mes. Los gastos fijos no entran acá: son un
                      plan mensual, no un movimiento con fecha — su total está arriba y en el
                      calendario.
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
