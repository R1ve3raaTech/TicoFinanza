import { dayKey, effectiveStatus } from "./fixedExpenses";
import type { FixedExpense, Transaction } from "./types";

/**
 * Un gasto fijo que parece ya pagado, y el movimiento que lo prueba.
 */
export interface FixedPaymentMatch {
  expense: FixedExpense;
  transaction: Transaction;
}

/** Días antes del cobro en que un movimiento todavía cuenta como ese pago. */
const DAYS_BEFORE = 3;
/** Y días después. Un cobro se atrasa más de lo que se adelanta. */
const DAYS_AFTER = 6;

function toDate(key: string): number {
  // Mediodía UTC: la clave es un día fijo, y así ningún huso la corre.
  return new Date(`${key}T12:00:00Z`).getTime();
}

function daysBetween(a: string, b: string): number {
  return Math.round((toDate(a) - toDate(b)) / 86_400_000);
}

/**
 * Qué día de ESTE mes le toca cobrarse a un gasto fijo.
 *
 * Un cobro agendado el 31 se recorta al último día del mes, igual que en
 * `lib/fixedExpenses.ts` — febrero no tiene 31.
 */
function chargeKey(expense: FixedExpense, monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(expense.charge_day, lastDay);
  return dayKey(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Gastos fijos que parecen ya pagados: hay un movimiento del mismo monto,
 * en la misma cuenta y cerca del día de cobro, que todavía no está atado a
 * ningún fijo.
 *
 * **Propone, no marca.** Un emparejamiento equivocado —dos cobros del mismo
 * monto el mismo día, por ejemplo— marcaría como pagado algo que no se
 * pagó, y eso desarma el saldo proyectado sin que nadie se entere. Con la
 * propuesta, lo peor que pasa es que digas que no.
 *
 * Las reglas son estrechas a propósito, por lo mismo:
 * - El monto tiene que coincidir **exacto**. Con tolerancia, un recibo que
 *   varía mes a mes emparejaría con cualquier cosa.
 * - La cuenta tiene que coincidir si el fijo tiene una declarada. Si no
 *   tiene, se acepta cualquiera: no hay con qué discriminar.
 * - El movimiento no puede estar ya atado a otro fijo.
 * - Cada movimiento se usa una sola vez, y cada fijo se queda con el
 *   movimiento más cercano a su día de cobro.
 */
export function matchFixedPayments(
  expenses: FixedExpense[],
  transactions: Transaction[],
  monthKey: string,
  todayKey: string
): FixedPaymentMatch[] {
  const pendientes = expenses.filter(
    (expense) => effectiveStatus(expense, monthKey) === "PENDING"
  );
  if (pendientes.length === 0) return [];

  const usados = new Set<string>();
  const salida: FixedPaymentMatch[] = [];

  for (const expense of pendientes) {
    const cobro = chargeKey(expense, monthKey);
    // Todavía no llegó el día: no hay nada que proponer.
    if (daysBetween(cobro, todayKey) > DAYS_BEFORE) continue;

    let mejor: Transaction | null = null;
    let mejorDistancia = Infinity;

    for (const transaction of transactions) {
      if (usados.has(transaction.id)) continue;
      if (transaction.type !== "EXPENSE") continue;
      if (transaction.fixed_expense_id) continue;
      if (Number(transaction.amount) !== Number(expense.amount)) continue;
      if (expense.account_id && transaction.account_id !== expense.account_id) continue;

      const key = transaction.transaction_date.slice(0, 10);
      const distancia = daysBetween(key, cobro);
      if (distancia < -DAYS_BEFORE || distancia > DAYS_AFTER) continue;

      if (Math.abs(distancia) < mejorDistancia) {
        mejor = transaction;
        mejorDistancia = Math.abs(distancia);
      }
    }

    if (mejor) {
      usados.add(mejor.id);
      salida.push({ expense, transaction: mejor });
    }
  }

  return salida;
}
