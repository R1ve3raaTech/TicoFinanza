import { endOfDayISO, startOfDayISO } from "./dateRange";
import { addMonths, daysInMonth } from "./fixedExpenses";

/**
 * Reporte mensual: las cuentas que arma la página de impresión.
 *
 * Vive acá y no en el componente porque un reporte que no cuadra con lo que
 * muestra la app es peor que no tener reporte, y eso solo se asegura con
 * pruebas.
 */

/** Mes anterior y siguiente, como "YYYY-MM". */
export function shiftMonth(monthKey: string, months: number): string {
  return addMonths(`${monthKey}-01`, months).slice(0, 7);
}

/**
 * Límites del mes en ISO, con el huso de Costa Rica escrito.
 *
 * Sin el offset explícito los límites salen en la zona del servidor —UTC en
 * Vercel—, y el mes arrancaría a las 6 p.m. del último día del mes
 * anterior. Mismo cuidado que en lib/dateRange.ts.
 */
export function monthRangeISO(monthKey: string): { fromISO: string; toISO: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const last = daysInMonth(year, month);
  return {
    fromISO: startOfDayISO(`${monthKey}-01`),
    toISO: endOfDayISO(`${monthKey}-${String(last).padStart(2, "0")}`),
  };
}

const MONTH_LABEL = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "noviembre de 2026". Con timeZone UTC: ver el bug de husos en aguinaldo.ts. */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return MONTH_LABEL.format(new Date(Date.UTC(year, month - 1, 1)));
}

export interface BreakdownRow {
  label: string;
  amount: number;
  /** Porcentaje del total, 0 a 100, redondeado. */
  share: number;
}

/**
 * Desglose ordenado de mayor a menor, con el peso de cada parte.
 *
 * Los porcentajes se redondean uno por uno y por eso pueden no sumar 100
 * exactamente. Se deja así a propósito: cuadrarlos a la fuerza obligaría a
 * mentir en una de las filas, y en un papel que alguien va a comparar
 * contra su banco importa más que cada línea esté bien.
 */
export function breakdown(totals: Map<string, number>): BreakdownRow[] {
  const rows = [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const sum = rows.reduce((total, [, amount]) => total + amount, 0);

  return rows.map(([label, amount]) => ({
    label,
    amount,
    share: sum > 0 ? Math.round((amount / sum) * 100) : 0,
  }));
}

/** Ingresos del mes agrupados por categoría. */
export function incomeByCategory(
  transactions: { category: string | null; amount: number; type: string }[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "INCOME") continue;
    const label = t.category ?? "Sin categoría";
    totals.set(label, (totals.get(label) ?? 0) + t.amount);
  }
  return totals;
}

/**
 * Hasta qué día del mes llegan los datos. Para un mes cerrado es el último
 * día; para el que corre, hoy. Un reporte de noviembre impreso el día 3 que
 * no dijera eso se leería como un mes con casi nada de gasto.
 */
export function coverage(
  monthKey: string,
  todayKey: string
): { closed: boolean; throughKey: string } {
  const currentMonth = todayKey.slice(0, 7);
  if (monthKey < currentMonth) {
    const [year, month] = monthKey.split("-").map(Number);
    const last = daysInMonth(year, month);
    return { closed: true, throughKey: `${monthKey}-${String(last).padStart(2, "0")}` };
  }
  return { closed: false, throughKey: todayKey };
}
