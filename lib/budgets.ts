import type { Budget } from "./types";

/**
 * Estado de un presupuesto según cuánto se lleva gastado.
 *
 * Los cortes son 70 % y 100 %: verde mientras hay margen, ámbar desde 70 %
 * (y el texto pasa a "casi al límite" a partir de 90 %, que es el aviso que
 * uno quiere ver antes de pasarse) y rosa al excederse. El color nunca va
 * solo: cada medidor lleva su ícono y su rótulo, para que se entienda igual
 * en escala de grises o con daltonismo.
 */
export type BudgetStatus = "ok" | "warn" | "close" | "over";

export const BUDGET_WARN_RATIO = 0.7;
export const BUDGET_CLOSE_RATIO = 0.9;

export interface BudgetProgress {
  id: string;
  category: string;
  limit: number;
  spent: number;
  /** Lo que falta para el tope; 0 si ya se pasó. */
  remaining: number;
  /** Gastado / tope. Puede pasar de 1. */
  ratio: number;
  status: BudgetStatus;
}

export function budgetStatus(ratio: number): BudgetStatus {
  if (ratio > 1) return "over";
  if (ratio >= BUDGET_CLOSE_RATIO) return "close";
  if (ratio >= BUDGET_WARN_RATIO) return "warn";
  return "ok";
}

/**
 * Cruza los topes del mes contra lo que realmente se gastó en cada
 * categoría. `spentByCategory` junta gastos variables y fijos: el tope es de
 * la categoría, no de una u otra fuente.
 */
export function budgetProgress(
  budgets: Budget[],
  spentByCategory: Map<string, number>
): BudgetProgress[] {
  return budgets
    .map((budget) => {
      const spent = spentByCategory.get(budget.category_name) ?? 0;
      const ratio = budget.monthly_limit > 0 ? spent / budget.monthly_limit : 0;
      return {
        id: budget.id,
        category: budget.category_name,
        limit: budget.monthly_limit,
        spent,
        remaining: Math.max(budget.monthly_limit - spent, 0),
        ratio,
        status: budgetStatus(ratio),
      };
    })
    // Primero lo que está más comprometido: es lo que hay que mirar.
    .sort((a, b) => b.ratio - a.ratio || a.category.localeCompare(b.category, "es"));
}

export interface BudgetTotals {
  limit: number;
  spent: number;
  /** Categorías con el tope ya pasado. */
  over: number;
}

export function budgetTotals(progress: BudgetProgress[]): BudgetTotals {
  return progress.reduce(
    (totals, item) => ({
      limit: totals.limit + item.limit,
      spent: totals.spent + item.spent,
      over: totals.over + (item.status === "over" ? 1 : 0),
    }),
    { limit: 0, spent: 0, over: 0 }
  );
}
