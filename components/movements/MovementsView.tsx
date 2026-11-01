import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import type { LedgerEntry } from "@/lib/ledger";
import type { Account, UserCategory } from "@/lib/types";
import { DateRangeFilter } from "./DateRangeFilter";
import { AddMovementButton, MovementEntryProvider } from "./MovementEntry";
import { MovementList } from "./MovementList";
import { TransferButton } from "./TransferButton";

function Figure({
  label,
  swatch,
  value,
  plus,
}: {
  label: string;
  swatch?: string;
  value: number;
  plus?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-meta text-ink-3">
        {swatch && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${swatch}`} />}
        {label}
      </dt>
      {/* A 360px tres cifras a tamaño `figure` se salen de la pantalla: en
          teléfono bajan un escalón. */}
      <dd className="mt-1 text-[1.0625rem] font-medium leading-6 tracking-[-0.02em] text-ink sm:text-figure">
        <Money value={value} plus={plus} tabular={false} />
      </dd>
    </div>
  );
}

/**
 * Libro de ingresos, gastos variables y transferencias. Composición separada
 * de la carga de datos (page.tsx) para poder verla con datos de ejemplo.
 */
export function MovementsView({
  entries,
  accounts,
  customCategories,
  income,
  expense,
  periodLabel,
  csvHref,
}: {
  entries: LedgerEntry[];
  accounts: Account[];
  customCategories: UserCategory[];
  income: number;
  expense: number;
  /** "este mes" o el rango elegido, para la línea de contexto. */
  periodLabel: string;
  /** Exportación con el mismo rango que se está viendo. */
  csvHref: string;
}) {
  return (
    <MovementEntryProvider customCategories={customCategories} accounts={accounts}>
      <main id="contenido" className="mx-auto w-full max-w-[1000px] px-4 pb-12 md:px-8 xl:px-12">
        <PageHeader
          title="Movimientos"
          meta={`Ingresos, gastos y transferencias · ${periodLabel}`}
          actions={
            <>
              <a
                href={csvHref}
                className={buttonClass({ variant: "ghost", size: "md" })}
                download
              >
                <DownloadSimple size={15} />
                CSV
              </a>
              <TransferButton accounts={accounts} />
              <AddMovementButton />
            </>
          }
          mobileActions={
            <>
              <InstallAppButton />
              <AddMovementButton iconOnly />
            </>
          }
        />

        <div className="pt-3 md:pt-0">
          <DateRangeFilter />
        </div>

        <dl className="grid grid-cols-3 gap-6 border-b border-line pb-6 pt-5">
          <Figure label="Ingresos" swatch="bg-chart-income" value={income} plus />
          <Figure label="Gastos" swatch="bg-chart-expense" value={-expense} />
          <Figure label="Neto" value={income - expense} plus />
        </dl>

        {/* En teléfono las acciones secundarias no caben en la barra de
            arriba (que es solo ícono): van acá, debajo de las cifras. */}
        <div className="flex flex-wrap items-center gap-2 pt-4 md:hidden">
          <TransferButton accounts={accounts} />
          <a href={csvHref} className={buttonClass({ variant: "ghost", size: "sm" })} download>
            <DownloadSimple size={14} />
            Exportar CSV
          </a>
        </div>

        <div className="pt-4">
          <MovementList title="Registrados" entries={entries} accounts={accounts} />
        </div>
      </main>
    </MovementEntryProvider>
  );
}
