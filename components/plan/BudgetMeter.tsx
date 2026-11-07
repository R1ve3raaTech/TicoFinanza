import { CheckCircle, Warning, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { Money } from "@/components/ui/Money";
import type { BudgetProgress, BudgetStatus } from "@/lib/budgets";

/**
 * Medidor de un presupuesto.
 *
 * El color de la barra dice cómo viene (verde con margen, ámbar al
 * acercarse, rosa al pasarse) pero nunca va solo: cada fila lleva ícono,
 * rótulo y el porcentaje escrito, así se entiende igual en escala de grises
 * o con daltonismo.
 *
 * La marca de la izquierda es otra cosa y no se confunde con eso: dice de
 * qué categoría es el tope, con el mismo color e ícono que esa categoría
 * tiene en Fijos y en Movimientos.
 */
const STATUS: Record<
  BudgetStatus,
  { label: string; fill: string; text: string; Icon: typeof CheckCircle }
> = {
  ok: {
    label: "Dentro del margen",
    fill: "bg-income",
    text: "text-income",
    Icon: CheckCircle,
  },
  warn: {
    label: "Ojo con esta",
    fill: "bg-warn",
    text: "text-warn",
    Icon: Warning,
  },
  close: {
    label: "Casi al límite",
    fill: "bg-warn",
    text: "text-warn",
    Icon: Warning,
  },
  over: {
    label: "Te pasaste",
    fill: "bg-expense",
    text: "text-expense",
    Icon: WarningCircle,
  },
};

export function BudgetMeter({ item }: { item: BudgetProgress }) {
  const status = STATUS[item.status];
  const percent = Math.round(item.ratio * 100);
  // La barra se recorta en 100 %: pasarse se dice con el color, el rótulo y
  // el número, no estirando la barra fuera de su riel.
  const width = Math.min(Math.max(item.ratio, 0), 1) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <CategoryMark category={item.category} size={26} />
          <span className="min-w-0 truncate text-label text-ink">{item.category}</span>
        </span>
        <span className="money shrink-0 text-meta text-ink-3">
          <Money value={item.spent} tabular className="text-ink" /> de{" "}
          <Money value={item.limit} tabular />
        </span>
      </div>

      <div
        role="meter"
        aria-label={`${item.category}: ${percent}% del tope`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-[3px] bg-chart-track"
      >
        <div
          style={{ width: `${width}%` }}
          className={`h-full rounded-[3px] ${status.fill}`}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-meta">
        <span className={`flex min-w-0 items-center gap-1.5 ${status.text}`}>
          <status.Icon size={13} weight="fill" aria-hidden className="shrink-0" />
          <span className="truncate">{status.label}</span>
        </span>
        <span className="money shrink-0 text-ink-3">
          {percent}%
          {item.status === "over" ? (
            <>
              {" · "}
              <Money value={-(item.spent - item.limit)} tabular className="text-expense" /> de más
            </>
          ) : (
            <>
              {" · faltan "}
              <Money value={item.remaining} tabular />
            </>
          )}
        </span>
      </div>
    </div>
  );
}
