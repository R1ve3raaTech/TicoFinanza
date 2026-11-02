import Link from "next/link";
import { ArrowLeft, CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/ui/Money";
import type { MonthSummary } from "@/lib/insights";
import type { BreakdownRow } from "@/lib/report";
import { monthLabel, shiftMonth } from "@/lib/report";
import type { Account, Transaction } from "@/lib/types";
import { PrintButton } from "./PrintButton";
import { ReportPrintStyles } from "./ReportPrintStyles";

const dayFormat = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Costa_Rica",
});

const longDayFormat = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function longDay(dayKey: string): string {
  return longDayFormat.format(new Date(`${dayKey}T12:00:00Z`));
}

export interface ReportFixedRow {
  name: string;
  category: string | null;
  amount: number;
  chargeDay: number;
  paid: boolean;
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="reporte-apagado text-meta text-ink-3">{label}</dt>
      <dd className="money mt-0.5 text-label text-ink">
        <Money value={value} />
      </dd>
    </div>
  );
}

function BreakdownTable({
  caption,
  rows,
  total,
}: {
  caption: string;
  rows: BreakdownRow[];
  total: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="reporte-bloque mt-6">
      <h3 className="text-label text-ink">{caption}</h3>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-line text-meta text-ink-3">
            <th scope="col" className="py-1.5 text-left font-normal">
              Categoría
            </th>
            <th scope="col" className="py-1.5 text-right font-normal">
              Monto
            </th>
            <th scope="col" className="w-16 py-1.5 text-right font-normal">
              Peso
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line">
              <td className="py-1.5 pr-3 text-ink">{row.label}</td>
              <td className="money py-1.5 text-right text-ink">
                <Money value={row.amount} />
              </td>
              <td className="money reporte-apagado py-1.5 text-right text-ink-3">
                {row.share} %
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-1.5 text-label text-ink">Total</td>
            <td className="money py-1.5 text-right text-label text-ink">
              <Money value={total} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Reporte mensual en papel.
 *
 * Es una pantalla normal de la app pensada además para el botón de
 * imprimir: el navegador guarda en PDF desde su propio diálogo, así que no
 * hay librería de por medio ni un PDF que se vea distinto de lo que la
 * persona miró antes de mandarlo a imprimir.
 *
 * El orden es el de alguien que abre el papel: primero cómo cerró el mes,
 * después de dónde salió la plata, y al final el detalle movimiento por
 * movimiento, que es lo que se compara contra el banco.
 */
export function MonthlyReport({
  monthKey,
  summary,
  expenseRows,
  incomeRows,
  fixed,
  movements,
  accounts,
  ownerName,
  coverage,
  generatedKey,
}: {
  monthKey: string;
  summary: MonthSummary;
  expenseRows: BreakdownRow[];
  incomeRows: BreakdownRow[];
  fixed: ReportFixedRow[];
  movements: Transaction[];
  accounts: Account[];
  ownerName?: string;
  coverage: { closed: boolean; throughKey: string };
  generatedKey: string;
}) {
  const label = monthLabel(monthKey);
  const accountsTotal = accounts.reduce((total, account) => total + account.current_balance, 0);

  return (
    <main
      id="contenido"
      className="reporte mx-auto w-full max-w-[860px] px-4 pb-12 pt-6 md:px-8 md:pt-10"
    >
      <ReportPrintStyles />

      {/* Todo el cromo de navegación va dentro de `reporte-no-imprimir`:
          en el papel sobra, y el encabezado pegajoso saldría pisando la
          primera hoja. */}
      <div className="reporte-no-imprimir">
        <Link
          href="/dashboard/ajustes"
          className="-ml-2 inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-meta text-ink-3 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden />
          Ajustes
        </Link>
      </div>

      <nav
        aria-label="Mes del reporte"
        className="reporte-no-imprimir flex flex-wrap items-center justify-between gap-3 pb-6 pt-2"
      >
        <span className="flex items-center gap-1">
          <Link
            href={`/dashboard/reporte?mes=${shiftMonth(monthKey, -1)}`}
            aria-label="Mes anterior"
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
          >
            <CaretLeft size={15} />
          </Link>
          <Link
            href={`/dashboard/reporte?mes=${shiftMonth(monthKey, 1)}`}
            aria-label="Mes siguiente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
          >
            <CaretRight size={15} />
          </Link>
        </span>
        <PrintButton />
      </nav>

      <header className="reporte-bloque border-b border-line pb-4">
        <p className="reporte-apagado text-meta text-ink-3">TicoFinanza · Reporte mensual</p>
        {/* `capitalize` pondría mayúscula en cada palabra ("Octubre De
            2026"); en español solo va la primera letra. */}
        <h1 className="mt-1 text-title text-ink first-letter:uppercase">{label}</h1>
        <p className="reporte-apagado mt-1 text-meta text-ink-3">
          {ownerName ? `${ownerName} · ` : ""}
          {coverage.closed
            ? "Mes cerrado"
            : `Datos hasta el ${longDay(coverage.throughKey)}; el mes todavía va corriendo`}
          {" · Generado el "}
          {longDay(generatedKey)}
        </p>
      </header>

      <section aria-labelledby="resumen-titulo" className="reporte-bloque mt-6">
        <h2 id="resumen-titulo" className="text-label text-ink">
          Resumen
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-3 sm:grid-cols-4">
          <Figure label="Ingresos" value={summary.income} />
          <Figure label="Gastos fijos" value={-summary.fixedExpenses} />
          <Figure label="Gastos variables" value={-summary.variableExpenses} />
          <Figure label="Neto ejecutado" value={summary.net} />
        </dl>
        {summary.fixedPending > 0 && (
          <p className="reporte-apagado mt-2 text-meta leading-relaxed text-ink-3">
            De los fijos quedan <Money value={summary.fixedPending} /> por pagar. Si se pagan, el
            mes cierra en <Money value={summary.projectedNet} />.
          </p>
        )}
      </section>

      <BreakdownTable caption="Ingresos por categoría" rows={incomeRows} total={summary.income} />
      <BreakdownTable
        caption="Gastos por categoría"
        rows={expenseRows}
        total={summary.fixedExpenses + summary.variableExpenses}
      />

      {fixed.length > 0 && (
        <div className="reporte-bloque mt-6">
          <h3 className="text-label text-ink">Gastos fijos del mes</h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-line text-meta text-ink-3">
                <th scope="col" className="w-10 py-1.5 text-left font-normal">
                  Día
                </th>
                <th scope="col" className="py-1.5 text-left font-normal">
                  Nombre
                </th>
                <th scope="col" className="py-1.5 text-left font-normal">
                  Estado
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {fixed.map((row) => (
                <tr key={`${row.name}-${row.chargeDay}`} className="border-b border-line">
                  <td className="money reporte-apagado py-1.5 text-ink-3">{row.chargeDay}</td>
                  <td className="py-1.5 pr-3 text-ink">
                    {row.name}
                    {row.category && (
                      <span className="reporte-apagado text-ink-3"> · {row.category}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-ink-2">{row.paid ? "Pagado" : "Pendiente"}</td>
                  <td className="money py-1.5 text-right text-ink">
                    <Money value={-row.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="reporte-bloque mt-6">
        <h3 className="text-label text-ink">Movimientos del mes</h3>
        {movements.length === 0 ? (
          <p className="reporte-apagado mt-2 text-sm text-ink-3">
            No hay movimientos anotados en {label}.
          </p>
        ) : (
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-line text-meta text-ink-3">
                <th scope="col" className="w-14 py-1.5 text-left font-normal">
                  Fecha
                </th>
                <th scope="col" className="py-1.5 text-left font-normal">
                  Descripción
                </th>
                <th scope="col" className="py-1.5 text-left font-normal">
                  Categoría
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b border-line">
                  <td className="money reporte-apagado py-1.5 text-ink-3">
                    {dayFormat.format(new Date(movement.transaction_date))}
                  </td>
                  <td className="py-1.5 pr-3 text-ink">{movement.description || "Sin detalle"}</td>
                  <td className="reporte-apagado py-1.5 pr-3 text-ink-3">
                    {movement.category ?? "Sin categoría"}
                  </td>
                  <td className="money py-1.5 text-right text-ink">
                    <Money
                      value={movement.type === "INCOME" ? movement.amount : -movement.amount}
                      plus
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {accounts.length > 0 && (
        <div className="reporte-bloque mt-6">
          <h3 className="text-label text-ink">Saldos al generar el reporte</h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-line">
                  <td className="py-1.5 text-ink">{account.name}</td>
                  <td className="money py-1.5 text-right text-ink">
                    <Money value={account.current_balance} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 text-label text-ink">Total</td>
                <td className="money py-1.5 text-right text-label text-ink">
                  <Money value={accountsTotal} />
                </td>
              </tr>
            </tbody>
          </table>
          <p className="reporte-apagado mt-2 max-w-[62ch] text-meta leading-relaxed text-ink-3">
            Los saldos son los de hoy, no los del cierre del mes: la app guarda el saldo actual de
            cada cuenta, no una foto por mes.
          </p>
        </div>
      )}
    </main>
  );
}
