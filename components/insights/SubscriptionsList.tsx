import { Money } from "@/components/ui/Money";
import type { RecurringItem } from "@/lib/insights";

const lastDateFormat = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Costa_Rica",
});

export function SubscriptionsList({ items }: { items: RecurringItem[] }) {
  if (items.length === 0) {
    return (
      <p className="border-t border-line pt-3 text-sm text-ink-3">
        Todavía no detectamos gastos recurrentes (hace falta el mismo gasto en al menos 2 meses
        distintos).
      </p>
    );
  }

  const totalMonthly = items.reduce((sum, it) => sum + it.averageAmount, 0);

  return (
    <div>
      <p className="pb-3 text-sm text-ink-2">
        Aprox. <Money value={totalMonthly} tabular={false} className="font-medium text-ink" /> por
        mes en gastos que se repiten.
      </p>

      <div className="border-t border-line">
        <div
          aria-hidden
          className="hidden grid-cols-[minmax(0,1fr)_7rem_9rem_7rem] gap-4 border-b border-line py-2 text-micro text-ink-3 sm:grid"
        >
          <span>Comercio</span>
          <span>Veces</span>
          <span>Última vez</span>
          <span className="text-right">Promedio</span>
        </div>
        <ul>
          {items.map((item) => (
            <li
              key={`${item.bankName}-${item.description}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_7rem]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{item.description}</span>
                <span className="block text-meta text-ink-3 sm:hidden">
                  {item.bankName} · {item.occurrences} veces · última{" "}
                  {lastDateFormat.format(new Date(item.lastDate))}
                </span>
                <span className="hidden text-meta text-ink-3 sm:block">{item.bankName}</span>
              </span>
              <span className="money hidden text-sm text-ink-2 sm:block">{item.occurrences}</span>
              <span className="hidden text-sm text-ink-2 sm:block">
                {lastDateFormat.format(new Date(item.lastDate))}
              </span>
              <span className="text-right text-sm text-ink">
                <span className="text-ink-3">~</span>
                <Money value={item.averageAmount} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
