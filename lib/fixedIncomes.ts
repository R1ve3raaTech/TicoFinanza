import { chargeDayKey, daysBetween, monthKeyOf } from "./fixedExpenses";
import type { FixedIncome, FixedIncomeStatus } from "./types";

/**
 * Ingresos que se repiten todos los meses: el salario, la quincena, una
 * pensión, una renta.
 *
 * **No se registran solos al llegar la fecha.** Un ingreso que la app da
 * por recibido y que no entró —porque el pago se atrasó, porque el neto
 * vino distinto, porque te despidieron— deja el saldo mintiendo, que es
 * justo lo que esta app viene arreglando. En lugar de eso, el día del pago
 * aparece arriba con un botón: un toque al mes y el saldo nunca se desvía.
 */

/** Confirmado vale solo para el mes que dice `status_month`. */
export function incomeStatus(
  income: Pick<FixedIncome, "status" | "status_month">,
  currentMonthKey: string
): FixedIncomeStatus {
  if (income.status !== "CONFIRMED") return "PENDING";
  return income.status_month === currentMonthKey ? "CONFIRMED" : "PENDING";
}

export interface ExpectedIncome {
  id: string;
  name: string;
  amount: number;
  accountId: string | null;
  status: FixedIncomeStatus;
  /** Día del próximo depósito, "YYYY-MM-DD". */
  dueKey: string;
  /** Días que faltan. 0 es hoy; negativo, una fecha que ya pasó. */
  dueInDays: number;
  /** Ya pasó la fecha y no se confirmó: puede que se haya atrasado. */
  late: boolean;
  /** Se puede confirmar: la fecha ya llegó y sigue pendiente. */
  confirmable: boolean;
}

/**
 * Los depósitos esperados de este mes, ordenados por cercanía.
 *
 * Una quincena con dos días de pago produce dos entradas, y cada una se
 * confirma por separado — porque por separado entran.
 */
export function expectedIncomes(incomes: FixedIncome[], todayKey: string): ExpectedIncome[] {
  const currentMonth = monthKeyOf(todayKey);
  const [year, month] = todayKey.split("-").map(Number);

  const rows: ExpectedIncome[] = [];

  for (const income of incomes) {
    const status = incomeStatus(income, currentMonth);
    const days = [income.pay_day, income.second_pay_day].filter(
      (d): d is number => typeof d === "number"
    );

    for (const day of days) {
      const dueKey = chargeDayKey(year, month, day);
      const dueInDays = daysBetween(todayKey, dueKey);
      rows.push({
        id: income.id,
        name: income.name,
        amount: income.amount,
        accountId: income.account_id,
        status,
        dueKey,
        dueInDays,
        late: status === "PENDING" && dueInDays < 0,
        confirmable: status === "PENDING" && dueInDays <= 0,
      });
    }
  }

  return rows.sort((a, b) => a.dueInDays - b.dueInDays || a.name.localeCompare(b.name, "es"));
}

export interface IncomeTotals {
  /** Todo lo que se espera este mes. */
  expected: number;
  /** Lo ya confirmado. */
  confirmed: number;
  /** Lo que todavía no entró (o no se marcó). */
  pending: number;
}

export function incomeTotals(incomes: FixedIncome[], currentMonthKey: string): IncomeTotals {
  let confirmed = 0;
  let pending = 0;

  for (const income of incomes) {
    // Una quincena cuenta dos veces: entran dos depósitos en el mes.
    const times = income.second_pay_day ? 2 : 1;
    const amount = income.amount * times;
    if (incomeStatus(income, currentMonthKey) === "CONFIRMED") confirmed += amount;
    else pending += amount;
  }

  return { expected: confirmed + pending, confirmed, pending };
}
