import type { Transaction } from "./types";

/**
 * Aguinaldo: el décimo tercer mes.
 *
 * La ley lo calcula sobre lo ganado entre el 1.º de diciembre del año
 * anterior y el 30 de noviembre de este, dividido entre doce, y se paga
 * dentro de los primeros veinte días de diciembre. Esa ventana que no
 * coincide con el año calendario es justo la razón de que nadie lo tenga
 * claro de cabeza.
 */

/** Solo el salario cuenta: lo de por fuera de planilla no genera aguinaldo. */
export const AGUINALDO_CATEGORY = "Salario";

const WINDOW_MONTHS = 12;

export interface AguinaldoMonth {
  /** "YYYY-MM". */
  monthKey: string;
  /** Nombre corto del mes, para la etiqueta. */
  label: string;
  amount: number;
  /** El mes ya terminó: si no tiene salario, es un hueco de verdad. */
  closed: boolean;
  /** El mes que corre. Todavía no se le puede reclamar nada. */
  current: boolean;
}

export interface Aguinaldo {
  /** Año en que se paga. */
  year: number;
  /** Primer día de la ventana, "YYYY-MM-DD". */
  from: string;
  /** Último día, "YYYY-MM-DD". */
  to: string;
  /** Salario sumado en la ventana. */
  accrued: number;
  /** Lo acumulado entre doce: el aguinaldo con lo que hay anotado hoy. */
  estimate: number;
  /** Meses de la ventana con algún salario anotado. */
  monthsRecorded: number;
  /**
   * Meses de la ventana que ya terminaron. El que corre no cuenta: un mes
   * a medias no es un mes sin anotar, y marcarlo como hueco sería un
   * reclamo el día 1.º de cada mes.
   */
  monthsElapsed: number;
  /**
   * Lo que daría si los meses que faltan se parecen a los anotados. Es el
   * promedio de lo anotado: con doce meses iguales, promedio y aguinaldo
   * son el mismo número.
   */
  projected: number;
  months: AguinaldoMonth[];
}

// `timeZone: "UTC"` no es decorativo: la fecha se arma con Date.UTC, y sin
// la zona el formateador la lee en hora de Costa Rica (UTC−6). Medianoche
// UTC del día 1 son las 6 p.m. del último día del mes anterior, así que las
// doce etiquetas salían corridas un mes.
const SHORT_MONTH = new Intl.DateTimeFormat("es-CR", { month: "short", timeZone: "UTC" });

function monthLabel(year: number, month: number): string {
  return SHORT_MONTH.format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * La ventana del aguinaldo que toca mirar hoy.
 *
 * En diciembre sigue siendo la que acaba de cerrar, no la que arranca: ese
 * mes lo que importa es el pago que está por llegar.
 */
export function aguinaldoWindow(todayKey: string): { year: number; from: string; to: string } {
  const year = Number(todayKey.slice(0, 4));
  return { year, from: `${year - 1}-12-01`, to: `${year}-11-30` };
}

type SalaryRow = Pick<Transaction, "transaction_date" | "amount">;

/**
 * Estima el aguinaldo con los salarios anotados.
 *
 * Recibe las filas ya filtradas por categoría y tipo: qué cuenta como
 * salario es una decisión de la pantalla, no de la cuenta.
 */
export function aguinaldoEstimate(salary: SalaryRow[], todayKey: string): Aguinaldo {
  const { year, from, to } = aguinaldoWindow(todayKey);
  const currentMonthKey = todayKey.slice(0, 7);

  const months: AguinaldoMonth[] = [];
  for (let i = 0; i < WINDOW_MONTHS; i += 1) {
    // Arranca en diciembre del año anterior.
    const date = new Date(Date.UTC(year - 1, 11 + i, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    months.push({
      monthKey,
      label: monthLabel(y, m),
      amount: 0,
      closed: monthKey < currentMonthKey,
      current: monthKey === currentMonthKey,
    });
  }

  const byKey = new Map(months.map((month) => [month.monthKey, month]));

  let accrued = 0;
  for (const row of salary) {
    // La fecha baja como ISO; los primeros diez caracteres son la clave del
    // día en hora de Costa Rica, que es como se guardó.
    const dayKey = row.transaction_date.slice(0, 10);
    if (dayKey < from || dayKey > to) continue;
    const bucket = byKey.get(dayKey.slice(0, 7));
    if (!bucket) continue;
    bucket.amount += row.amount;
    accrued += row.amount;
  }

  const monthsRecorded = months.filter((month) => month.amount > 0).length;
  const monthsElapsed = months.filter((month) => month.closed).length;

  return {
    year,
    from,
    to,
    accrued,
    estimate: Math.round(accrued / WINDOW_MONTHS),
    monthsRecorded,
    monthsElapsed,
    projected: monthsRecorded > 0 ? Math.round(accrued / monthsRecorded) : 0,
    months,
  };
}
