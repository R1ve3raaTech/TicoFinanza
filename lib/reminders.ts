import { upcomingPayments } from "./fixedExpenses";
import { formatMoney } from "./format";
import type { FixedExpense } from "./types";

/**
 * Recordatorios de gastos fijos: el aviso sale entre 24 y 48 horas antes del
 * cobro, o sea cuando el cobro cae mañana o pasado mañana.
 *
 * Dos avisos por cobro y no uno: el de pasado mañana da tiempo a mover plata
 * entre cuentas, y el de mañana es el que de verdad te salva del cargo
 * rechazado. El día del cobro ya no se avisa — a esa hora el aviso no cambia
 * nada y la app ya lo muestra en rojo en el resumen.
 */
export const REMINDER_DAYS = [1, 2] as const;

export interface Reminder {
  fixedExpenseId: string;
  /** Día del cobro, "YYYY-MM-DD". Es la clave que evita avisar dos veces. */
  dueKey: string;
  dueInDays: number;
  title: string;
  body: string;
  url: string;
}

/**
 * Los recordatorios que corresponde mandar hoy. Solo los pendientes: un
 * gasto ya marcado como pagado este mes no se avisa.
 */
export function dueReminders(expenses: FixedExpense[], todayKey: string): Reminder[] {
  return upcomingPayments(expenses, todayKey)
    .filter(
      (payment) =>
        payment.status === "PENDING" &&
        (REMINDER_DAYS as readonly number[]).includes(payment.dueInDays)
    )
    .map((payment) => ({
      fixedExpenseId: payment.id,
      dueKey: payment.dueKey,
      dueInDays: payment.dueInDays,
      title: payment.dueInDays === 1 ? "Mañana se cobra" : "Pasado mañana se cobra",
      body: `${payment.name} · ${formatMoney(payment.amount)}`,
      url: "/dashboard/fijos",
    }));
}
