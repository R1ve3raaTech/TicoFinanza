import type { GoalColor, SavingsGoal } from "./types";

export const GOAL_COLORS: { value: GoalColor; label: string }[] = [
  { value: "celeste", label: "Celeste" },
  { value: "indigo", label: "Índigo" },
  { value: "violeta", label: "Violeta" },
  { value: "neutro", label: "Neutro" },
];

/** Variable CSS del color de la meta (definidas en app/globals.css). */
export function goalColorVar(color: GoalColor): string {
  return `var(--goal-${color})`;
}

export interface GoalProgress {
  /** Abonado / objetivo, recortado a 1. */
  ratio: number;
  /** Lo que falta para llegar; 0 si ya se completó. */
  remaining: number;
  complete: boolean;
  /** Días que faltan para la fecha objetivo, o null si no tiene. */
  daysLeft: number | null;
  /** Cuánto habría que apartar por mes para llegar a tiempo. */
  monthlyPace: number | null;
}

/**
 * Avance de una meta. El ritmo mensual es la cuenta que uno hace de cabeza
 * ("me faltan 300 mil y cuatro meses"), y es lo que vuelve útil la fecha
 * objetivo en vez de dejarla como un dato suelto.
 */
export function goalProgress(goal: SavingsGoal, todayKey: string): GoalProgress {
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
  const ratio = goal.target_amount > 0
    ? Math.min(goal.current_amount / goal.target_amount, 1)
    : 0;

  let daysLeft: number | null = null;
  if (goal.target_date) {
    const [ty, tm, td] = goal.target_date.split("-").map(Number);
    const [cy, cm, cd] = todayKey.split("-").map(Number);
    daysLeft = Math.round(
      (Date.UTC(ty, tm - 1, td) - Date.UTC(cy, cm - 1, cd)) / 86_400_000
    );
  }

  const monthsLeft = daysLeft === null ? null : Math.max(daysLeft / 30.4, 0);
  const monthlyPace =
    monthsLeft === null || remaining === 0
      ? null
      : monthsLeft < 1
        ? remaining
        : Math.ceil(remaining / monthsLeft);

  return {
    ratio,
    remaining,
    complete: remaining === 0,
    daysLeft,
    monthlyPace,
  };
}

export function goalsTotal(goals: SavingsGoal[]): { saved: number; target: number } {
  return goals.reduce(
    (totals, goal) => ({
      saved: totals.saved + goal.current_amount,
      target: totals.target + goal.target_amount,
    }),
    { saved: 0, target: 0 }
  );
}

// ---------------------------------------------------------------------------
// Metas anuales (prorrateo)
// ---------------------------------------------------------------------------

/** Meses de un ciclo anual. */
const CYCLE_MONTHS = 12;

/**
 * Gastos anuales típicos de Costa Rica. Son solo nombres sugeridos para no
 * escribirlos a mano; la fecha y el monto los pone la persona, que es la
 * única que sabe cuánto le toca pagar.
 */
export const ANNUAL_GOAL_PRESETS = [
  "Marchamo",
  "Seguro del carro",
  "RTV",
  "Impuestos municipales",
  "Matrícula",
] as const;

export interface Proration {
  /** Lo que toca apartar por mes para llegar sin apuros. */
  perMonth: number;
  /** Meses del ciclo que ya pasaron, 0 a 12. */
  monthsElapsed: number;
  /** Lo que deberías llevar apartado a estas alturas del ciclo. */
  expected: number;
  /** Cuánto te falta contra ese ritmo. 0 si vas al día o adelantado. */
  behind: number;
}

/**
 * Meses enteros que faltan entre dos días. Cuenta meses de calendario y no
 * días partidos por 30: el prorrateo se piensa por mes ("me faltan cuatro
 * meses"), y 30,4 días dejaba el cálculo corrido medio mes en los extremos.
 */
function monthsUntil(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm);
  // Si todavía no se llegó al día del mes, ese mes no está completo.
  return td < fd ? months - 1 : months;
}

/**
 * Cuánto habría que llevar apartado de una meta anual a día de hoy.
 *
 * El prorrateo es la respuesta a que el marchamo sorprenda cada diciembre:
 * no es un gasto imprevisto, es uno conocido con un año de aviso. Dividido
 * entre doce deja de ser un golpe.
 *
 * Devuelve null si la meta no es anual o no tiene fecha: sin fecha no hay
 * ciclo contra el que medir el ritmo.
 */
export function proration(goal: SavingsGoal, todayKey: string): Proration | null {
  if (goal.recurrence !== "anual" || !goal.target_date) return null;

  const perMonth = Math.ceil(goal.target_amount / CYCLE_MONTHS);
  const monthsLeft = monthsUntil(todayKey, goal.target_date);
  const monthsElapsed = Math.min(Math.max(CYCLE_MONTHS - monthsLeft, 0), CYCLE_MONTHS);
  // Se recorta al objetivo para que el último mes no pida más de lo que vale
  // la meta por el redondeo hacia arriba de `perMonth`.
  const expected = Math.min(perMonth * monthsElapsed, goal.target_amount);

  return {
    perMonth,
    monthsElapsed,
    expected,
    behind: Math.max(expected - goal.current_amount, 0),
  };
}

/**
 * La fecha del ciclo siguiente: un año después, saltando los que ya pasaron.
 *
 * El salto en bucle es para quien paga tarde o completa el ciclo meses
 * después: sumar un año a secas podría dejar la fecha otra vez en el pasado
 * y la meta nueva arrancaría vencida.
 *
 * Un 29 de febrero cae al 28 en los años que no son bisiestos.
 */
export function nextCycleDate(targetDate: string, todayKey: string): string {
  const [y, m, d] = targetDate.split("-").map(Number);
  let year = y + 1;

  for (let i = 0; i < 100; i += 1) {
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const candidate = `${year}-${String(m).padStart(2, "0")}-${String(
      Math.min(d, lastDay)
    ).padStart(2, "0")}`;
    if (candidate > todayKey) return candidate;
    year += 1;
  }

  return targetDate;
}

/** Metas anuales primero y por fecha: lo que vence antes se mira antes. */
export function annualGoals(goals: SavingsGoal[]): SavingsGoal[] {
  return goals
    .filter((goal) => goal.recurrence === "anual")
    .sort((a, b) => (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999"));
}

/**
 * Lo que las metas anuales piden por mes, juntas. Es plata comprometida que
 * todavía no es un gasto fijo: sirve para que el prorrateo se pueda mirar de
 * un golpe en vez de meta por meta.
 */
export function annualMonthly(goals: SavingsGoal[], todayKey: string): number {
  return annualGoals(goals).reduce((total, goal) => {
    const rate = proration(goal, todayKey);
    return total + (rate?.perMonth ?? 0);
  }, 0);
}
