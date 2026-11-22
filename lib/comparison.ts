import { dayKeyOfISO, daysInMonth } from "./fixedExpenses";
import type { Transaction } from "./types";

/**
 * Comparación del mes contra el anterior, **cortada el mismo día**.
 *
 * Comparar un mes a medias contra uno completo siempre dice que vas
 * mejorando, y es mentira: el día 3 de noviembre llevás tres días de gastos
 * contra treinta y uno de octubre. Por eso el mes pasado se corta en el
 * mismo día del mes, y los dos lados miden el mismo pedazo de calendario.
 */

export interface Comparison {
  /** Gasto de este mes hasta hoy. */
  current: number;
  /** Gasto del mes pasado hasta el mismo día. */
  previous: number;
  /** current − previous. Positivo es que estás gastando más. */
  difference: number;
  /**
   * Variación en porcentaje, o null cuando el mes pasado fue cero: dividir
   * entre cero da infinito y "+∞ %" no le dice nada a nadie.
   */
  percent: number | null;
  /** Hasta qué día del mes se comparó. */
  throughDay: number;
}

type Movement = Pick<Transaction, "amount" | "type" | "transaction_date" | "category">;

/** "YYYY-MM" del mes anterior a la clave dada. */
export function previousMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * El día de corte dentro de un mes dado.
 *
 * Si hoy es 31 y el mes anterior tiene 30, se corta en 30: no existe el 31
 * de abril y pedirlo dejaría el mes pasado incompleto a propósito.
 */
export function cutoffDay(day: number, monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return Math.min(day, daysInMonth(year, month));
}

function spentUpTo(movements: Movement[], monthKey: string, day: number, category?: string): number {
  const limit = cutoffDay(day, monthKey);
  let total = 0;
  for (const m of movements) {
    if (m.type !== "EXPENSE") continue;
    if (category && m.category !== category) continue;
    // **El día se lee en hora de Costa Rica, no cortando la cadena.**
    //
    // `transaction_date` es `timestamptz` y baja en UTC, así que un gasto
    // anotado a las 7 de la noche llega como el día siguiente. Acá eso
    // rompía la comparación de dos formas, las dos en contra:
    //
    // 1. Lo de hoy por la noche se iba a "mañana", que es mayor que el
    //    corte, así que **se descartaba**. Contra un mes pasado que sí
    //    tenía sus noches completas, la tarjeta se inclinaba a decir
    //    "estás gastando menos" todas las tardes.
    // 2. Un gasto del último día del mes, de noche, caía en el mes
    //    siguiente y desaparecía de los dos lados de la comparación.
    const key = dayKeyOfISO(m.transaction_date);
    if (!key.startsWith(monthKey)) continue;
    if (Number(key.slice(8, 10)) > limit) continue;
    total += m.amount;
  }
  return total;
}

/**
 * Compara el gasto de dos meses hasta el mismo día.
 *
 * `movements` tiene que traer los dos meses ya; acá no se consulta nada.
 */
export function compareMonths(
  movements: Movement[],
  currentMonth: string,
  today: number,
  category?: string
): Comparison {
  const prevMonth = previousMonth(currentMonth);
  const current = spentUpTo(movements, currentMonth, today, category);
  const previous = spentUpTo(movements, prevMonth, today, category);

  return {
    current,
    previous,
    difference: current - previous,
    percent: previous === 0 ? null : ((current - previous) / previous) * 100,
    throughDay: cutoffDay(today, prevMonth),
  };
}

/** Cómo se lee la variación. "igual" cuando la diferencia es despreciable. */
export function comparisonTone(c: Comparison): "más" | "menos" | "igual" {
  if (c.previous === 0 && c.current === 0) return "igual";
  if (Math.abs(c.difference) < 500) return "igual";
  return c.difference > 0 ? "más" : "menos";
}
