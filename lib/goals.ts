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
