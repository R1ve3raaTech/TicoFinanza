import type { FixedExpense, FixedExpenseStatus } from "./types";

/**
 * Todo el calendario de la app vive en hora de Costa Rica, fija. Si el
 * servidor (UTC) y el navegador calculan "hoy" por su cuenta, el mismo cobro
 * cae en días distintos en cada lado y React tira un error de hidratación —
 * por eso las fechas se resuelven en el servidor y bajan como claves
 * "YYYY-MM-DD" ya calculadas.
 */
export const CR_TZ = "America/Costa_Rica";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" del momento dado, en hora de Costa Rica. */
export function dayKey(date: Date = new Date()): string {
  return dayKeyFormat.format(date);
}

/** "YYYY-MM" del momento dado, en hora de Costa Rica. */
export function monthKey(date: Date = new Date()): string {
  return dayKey(date).slice(0, 7);
}

export function monthKeyOf(key: string): string {
  return key.slice(0, 7);
}

function parts(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Día de cobro dentro de un mes concreto, recortado al último día del mes:
 * un cobro agendado el 31 cae el 28 (o 29) en febrero, y el 30 en abril. Sin
 * el recorte, "31 de febrero" se desbordaba al 3 de marzo.
 */
export function chargeDayKey(year: number, month: number, chargeDay: number): string {
  const day = Math.min(chargeDay, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Días enteros entre dos claves de día (b − a). Negativo si b ya pasó. */
export function daysBetween(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  const ms =
    Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day);
  return Math.round(ms / 86_400_000);
}

export function addMonths(key: string, months: number): string {
  const { year, month } = parts(key);
  const d = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Estado real del gasto fijo hoy. El estado guardado vale solo para el mes
 * que dice `status_month`: si ese mes ya pasó, el cobro volvió a estar
 * pendiente (ver el comentario de `FixedExpense` y la migración 0019).
 */
export function effectiveStatus(
  expense: Pick<FixedExpense, "status" | "status_month">,
  currentMonthKey: string
): FixedExpenseStatus {
  if (expense.status !== "PAID") return "PENDING";
  return expense.status_month === currentMonthKey ? "PAID" : "PENDING";
}

/** Menos de 5 días para el cobro: la fila se resalta. */
export const URGENT_DAYS = 5;

export interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  chargeDay: number;
  status: FixedExpenseStatus;
  /** Día del próximo cobro, "YYYY-MM-DD". */
  dueKey: string;
  /** Días que faltan. 0 es hoy; negativo, un cobro que ya se pasó sin pagar. */
  dueInDays: number;
  overdue: boolean;
  /** Vence hoy o dentro de menos de 5 días (o ya venció). */
  urgent: boolean;
}

/**
 * Cobros ordenados del más cercano a vencer al más lejano.
 *
 * - Pendiente con el día del mes todavía por venir → vence este mes.
 * - Pendiente con el día ya pasado → queda vencido (no se corre al mes
 *   siguiente: un recibo sin pagar del 5 sigue sin pagar el 20).
 * - Pagado este mes → el próximo cobro es el del mes que viene.
 */
export function upcomingPayments(
  expenses: FixedExpense[],
  todayKey: string
): UpcomingPayment[] {
  const currentMonth = monthKeyOf(todayKey);
  const { year, month } = parts(todayKey);

  return expenses
    .map((expense) => {
      const status = effectiveStatus(expense, currentMonth);
      const thisMonth = chargeDayKey(year, month, expense.charge_day);
      const nextMonthStart = parts(addMonths(todayKey, 1));
      const nextMonth = chargeDayKey(nextMonthStart.year, nextMonthStart.month, expense.charge_day);

      const dueKey =
        status === "PAID" ? nextMonth : daysBetween(todayKey, thisMonth) >= 0 ? thisMonth : thisMonth;
      const dueInDays = daysBetween(todayKey, dueKey);
      const overdue = status === "PENDING" && dueInDays < 0;

      return {
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        chargeDay: expense.charge_day,
        status,
        dueKey,
        dueInDays,
        overdue,
        urgent: status === "PENDING" && dueInDays < URGENT_DAYS,
      };
    })
    .sort((a, b) => a.dueInDays - b.dueInDays || a.name.localeCompare(b.name, "es"));
}

export interface FixedTotals {
  /** Suma de todos los gastos fijos del mes, pagados o no. */
  total: number;
  paid: number;
  pending: number;
}

export function fixedTotals(expenses: FixedExpense[], currentMonthKey: string): FixedTotals {
  let paid = 0;
  let pending = 0;
  for (const expense of expenses) {
    if (effectiveStatus(expense, currentMonthKey) === "PAID") paid += expense.amount;
    else pending += expense.amount;
  }
  return { total: paid + pending, paid, pending };
}

export interface CalendarDay {
  /** "YYYY-MM-DD", o null para los huecos antes del día 1 y después del último. */
  key: string | null;
  day: number | null;
  isToday: boolean;
  isPast: boolean;
  charges: { id: string; name: string; amount: number; status: FixedExpenseStatus }[];
}

/**
 * Cuadrícula del mes para el calendario, de lunes a domingo y con los huecos
 * del principio y del final ya puestos, para que el componente solo pinte.
 */
export function calendarMonth(
  monthKeyValue: string,
  expenses: FixedExpense[],
  todayKey: string
): { days: CalendarDay[]; label: string } {
  const [year, month] = monthKeyValue.split("-").map(Number);
  const total = daysInMonth(year, month);
  const currentMonth = monthKeyOf(todayKey);

  // getUTCDay() da 0 para domingo; la semana acá empieza el lunes.
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const byDay = new Map<string, CalendarDay["charges"]>();
  for (const expense of expenses) {
    const key = chargeDayKey(year, month, expense.charge_day);
    const list = byDay.get(key) ?? [];
    list.push({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      status: effectiveStatus(expense, currentMonth),
    });
    byDay.set(key, list);
  }

  const days: CalendarDay[] = Array.from({ length: firstWeekday }, () => ({
    key: null,
    day: null,
    isToday: false,
    isPast: false,
    charges: [],
  }));

  for (let day = 1; day <= total; day++) {
    const key = chargeDayKey(year, month, day);
    days.push({
      key,
      day,
      isToday: key === todayKey,
      isPast: daysBetween(todayKey, key) < 0,
      charges: byDay.get(key) ?? [],
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: null, day: null, isToday: false, isPast: false, charges: [] });
  }

  const label = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return { days, label };
}
