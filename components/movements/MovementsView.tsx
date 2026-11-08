import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { LeadFigure, SectionLead } from "@/components/shell/SectionLead";
import { buttonClass } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import type { PeriodId } from "@/lib/dateRange";
import type { LedgerEntry } from "@/lib/ledger";
import type { Account } from "@/lib/types";
import { PendingMovements } from "@/components/offline/PendingMovements";
import { DateRangeFilter } from "./DateRangeFilter";
import { AddMovementButton } from "./MovementEntry";
import { MovementList } from "./MovementList";
import { TransferButton } from "./TransferButton";

/**
 * Libro de ingresos, gastos variables y transferencias. Composición separada
 * de la carga de datos (page.tsx) para poder verla con datos de ejemplo.
 */
export function MovementsView({
  entries,
  accounts,
  income,
  expense,
  period,
  periodLabel,
  csvHref,
}: {
  entries: LedgerEntry[];
  accounts: Account[];
  income: number;
  expense: number;
  /** El período activo, para marcar el chip correspondiente. */
  period: PeriodId | "personalizado";
  /** "este mes" o el rango elegido, para la línea de contexto. */
  periodLabel: string;
  /** Exportación con el mismo rango que se está viendo. */
  csvHref: string;
}) {
  return (
    <>
      <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
        <PageHeader
          title="Movimientos"
          // Solo el período: qué es esta pantalla lo dice su nombre.
          meta={periodLabel}
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
          <DateRangeFilter active={period} />
        </div>

        {/* Lo anotado sin señal, arriba de todo: se guardó en el teléfono y
            todavía no cuenta en las cifras de abajo. Si no se viera, no
            habría forma de distinguirlo de un dato perdido. */}
        <PendingMovements />

        {/* Las tres cifras eran del mismo tamaño y ninguna mandaba. La que
            contesta "¿cómo me fue en este rato?" es el neto; las otras dos
            son de dónde sale. */}
        <SectionLead
          label={`Lo que queda ${periodLabel}`}
          value={income - expense}
          tone={income - expense < 0 ? "expense" : "ink"}
          note={
            income === 0 && expense === 0
              ? "No hay nada anotado en este período."
              : income === 0
                ? "Todo lo de este período son salidas."
                : income - expense < 0
                  ? "En este período salió más de lo que entró."
                  : "En este período entró más de lo que salió."
          }
          aside={
            <>
              <LeadFigure label="Entró" swatch="bg-chart-income">
                <Money value={income} plus />
              </LeadFigure>
              <LeadFigure label="Salió" swatch="bg-chart-expense">
                <Money value={-expense} />
              </LeadFigure>
            </>
          }
        />

        {/* En teléfono las acciones secundarias no caben en la barra de
            arriba (que es solo ícono): van acá, debajo de las cifras. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 md:hidden">
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
    </>
  );
}
