import type { TransactionType } from "./types";

export type RecurrenceFrequency = "diario" | "habiles" | "semanal";

/** Una plantilla que se repite (tabla `recurring_movements`, migración 0031). */
export interface RecurringMovement {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string | null;
  account_id: string | null;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  /** 0 = domingo, como `getUTCDay`. Solo para la frecuencia semanal. */
  weekday: number | null;
  /** Último día confirmado, "YYYY-MM-DD". */
  last_confirmed_date: string | null;
  active: boolean;
  created_at: string;
}

export const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "habiles", label: "Días hábiles" },
  { value: "diario", label: "Todos los días" },
  { value: "semanal", label: "Una vez por semana" },
];

export const WEEKDAYS = [
  { value: 1, label: "Lunes", short: "L" },
  { value: 2, label: "Martes", short: "K" },
  { value: 3, label: "Miércoles", short: "M" },
  { value: 4, label: "Jueves", short: "J" },
  { value: 5, label: "Viernes", short: "V" },
  { value: 6, label: "Sábado", short: "S" },
  { value: 0, label: "Domingo", short: "D" },
];

/**
 * Qué día de la semana es esa clave. Se lee a mediodía UTC porque la clave
 * ya es un día fijo: con medianoche, un huso al oeste la corre al día
 * anterior y el lunes se vuelve domingo.
 */
export function weekdayOf(dayKey: string): number {
  return new Date(`${dayKey}T12:00:00Z`).getUTCDay();
}

/** ¿A esta recurrencia le toca hoy, según su frecuencia? */
export function fallsOn(movement: Pick<RecurringMovement, "frequency" | "weekday">, dayKey: string): boolean {
  const day = weekdayOf(dayKey);
  switch (movement.frequency) {
    case "diario":
      return true;
    case "habiles":
      return day >= 1 && day <= 5;
    case "semanal":
      return movement.weekday === day;
  }
}

/**
 * Las recurrencias que hay que proponer hoy.
 *
 * **Solo las de hoy, nunca las de días pasados.** Rellenar hacia atrás
 * suena útil y no lo es: el monto del almuerzo del martes no se sabe hoy, y
 * una lista de seis propuestas viejas se despacha con "no" sin mirarla —
 * con lo cual la función deja de servir justo el día que sí importaba.
 *
 * `last_confirmed_date` evita repetir la propuesta el mismo día. Una fecha
 * guardada en el futuro (reloj desajustado) se trata como ya confirmada:
 * fallar hacia "no molestar" es mejor que proponer en bucle.
 */
export function dueToday(movements: RecurringMovement[], todayKey: string): RecurringMovement[] {
  return movements.filter((movement) => {
    if (!movement.active) return false;
    if (!fallsOn(movement, todayKey)) return false;
    if (movement.last_confirmed_date && movement.last_confirmed_date >= todayKey) return false;
    return true;
  });
}

/** Cómo se lee la frecuencia, para la fila de la propuesta. */
export function frequencyLabel(movement: Pick<RecurringMovement, "frequency" | "weekday">): string {
  if (movement.frequency === "diario") return "Todos los días";
  if (movement.frequency === "habiles") return "Días hábiles";
  const day = WEEKDAYS.find((d) => d.value === movement.weekday);
  return day ? `Cada ${day.label.toLowerCase()}` : "Una vez por semana";
}
