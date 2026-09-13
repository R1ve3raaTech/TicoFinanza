import { Money } from "@/components/ui/Money";
import type { BreakdownItem } from "@/lib/insights";

/**
 * Gasto agrupado (por categoría o por banco). Es una sola serie sobre
 * categorías sin orden natural, así que todas las barras van en un mismo
 * color neutro: la identidad la da el nombre escrito, no un tono por fila.
 * Las barras se miden contra la fila más grande (para comparar de un
 * vistazo) y el porcentaje del total va escrito al lado.
 */
export function BreakdownList({
  items,
  emptyLabel,
}: {
  items: BreakdownItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="border-t border-line pt-3 text-sm text-ink-3">{emptyLabel}</p>;
  }

  // Antes se mostraban los 8 primeros y el resto simplemente desaparecía,
  // pero los porcentajes seguían calculándose contra el total completo: no
  // había forma de saber que faltaba plata. La cola se junta en "Otros".
  const MAX_ROWS = 8;
  const head = items.slice(0, MAX_ROWS - 1);
  const tail = items.slice(MAX_ROWS - 1);
  const rows =
    tail.length > 1
      ? [
          ...head,
          {
            label: `Otros (${tail.length})`,
            amount: tail.reduce((sum, item) => sum + item.amount, 0),
            share: tail.reduce((sum, item) => sum + item.share, 0),
          },
        ]
      : items;
  const largest = Math.max(...rows.map((r) => r.amount), 1);

  return (
    <ul className="border-t border-line">
      {rows.map((item) => (
        <li key={item.label} className="border-b border-line py-2.5 last:border-b-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-ink">{item.label}</span>
            <span className="flex shrink-0 items-baseline gap-3">
              <span className="money w-9 text-right text-meta text-ink-3">
                {Math.round(item.share * 100)}%
              </span>
              <Money value={item.amount} className="min-w-[5.5rem] text-right text-sm text-ink" />
            </span>
          </div>
          <div aria-hidden className="mt-2 h-1.5 w-full rounded-[2px] bg-chart-track">
            <div
              className="h-full rounded-r-[3px] bg-chart-neutral"
              style={{ width: `${Math.max((item.amount / largest) * 100, 1)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
