import type { ReactNode } from "react";
import { Money, MoneyDisplay } from "@/components/ui/Money";

function Figure({ label, swatch, children }: { label: string; swatch: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-meta text-ink-3">
        {/* Mismo cuadradito que la leyenda del gráfico: el color identifica
            la serie desde la marca, el número queda en tinta. */}
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${swatch}`} />
        {label}
      </dt>
      <dd className="mt-1.5 text-[1.25rem] font-medium leading-7 tracking-[-0.02em] text-ink">
        {children}
      </dd>
    </div>
  );
}

/**
 * Parte de arriba del dashboard: el saldo es la única cifra grande de la
 * pantalla, y al lado (debajo en teléfono) lo que entró y salió este mes. Sin
 * tarjetas: la jerarquía la marcan el tamaño y una línea fina.
 */
export function BalanceSummary({
  balance,
  filtered,
  month,
  monthLabel,
  rangeLabel,
}: {
  balance: number;
  filtered: boolean;
  /** Solo sin filtro de fechas: con un rango puesto "este mes" no dice nada. */
  month?: { income: number; expense: number };
  monthLabel: string;
  rangeLabel?: string;
}) {
  return (
    <section
      aria-labelledby="saldo-titulo"
      className="grid gap-6 border-b border-line pb-7 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12"
    >
      <div className="min-w-0">
        <h2 id="saldo-titulo" className="text-label text-ink-2">
          {filtered ? "Neto del período" : "Saldo consolidado"}
        </h2>
        <p
          className={`mt-3 text-display md:text-display-lg ${
            balance < 0 ? "text-expense" : "text-ink"
          }`}
        >
          <MoneyDisplay value={balance} />
        </p>
        <p className="mt-3 text-meta text-ink-3">
          {filtered
            ? `Ingresos menos gastos, ${rangeLabel ?? "en las fechas elegidas"}.`
            : "La suma de todos tus movimientos registrados."}
        </p>
      </div>

      {month && (
        <dl className="grid grid-cols-2 gap-6 border-t border-line pt-5 lg:min-w-[340px] lg:border-l lg:border-t-0 lg:pb-1 lg:pl-10 lg:pt-0">
          <Figure label={`Ingresos de ${monthLabel}`} swatch="bg-chart-income">
            <Money value={month.income} plus tabular={false} />
          </Figure>
          <Figure label={`Gastos de ${monthLabel}`} swatch="bg-chart-expense">
            <Money value={-month.expense} tabular={false} />
          </Figure>
        </dl>
      )}
    </section>
  );
}
