import { chargeDayKey, dayKeyOfISO, effectiveStatus } from "./fixedExpenses";
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
 * **Usa el de `lib/fixedExpenses.ts`, que es el que gobierna la pantalla
 * de Fijos.** Acá había una copia, y estaba mal: armaba el día con
 * `dayKey(new Date(Date.UTC(...)))`, o sea medianoche UTC leída en hora de
 * Costa Rica — las 6 de la tarde del día ANTERIOR. Todos los días de cobro
 * salían corridos un día hacia atrás.
 *
 * Con una ventana de 3 días antes y 6 después el corrimiento casi nunca se
 * notaba, y por eso las pruebas pasaban; pero en los bordes descartaba
 * pagos buenos y aceptaba otros de más, y desplazaba un día la elección
 * del movimiento "más cercano" al cobro.
 */

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
    const [anio, mes] = monthKey.split("-").map(Number);
    const cobro = chargeDayKey(anio, mes, expense.charge_day);
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

      // En hora de Costa Rica: cortando la cadena, un pago hecho de noche
      // cuenta como del día siguiente y se elige mal el movimiento "más
      // cercano" al día de cobro.
      const key = dayKeyOfISO(transaction.transaction_date);
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
