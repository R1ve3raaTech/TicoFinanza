import { daysBetween } from "./fixedExpenses";
import type { Debt, DebtType } from "./types";

/** Igual que los gastos fijos: menos de 5 días para la fecha acordada. */
export const DEBT_URGENT_DAYS = 5;

export type DebtUrgency = "ninguna" | "pronto" | "vencida";

export interface DebtRow extends Debt {
  /** Días hasta la fecha acordada. null si no se acordó ninguna. */
  dueInDays: number | null;
  urgency: DebtUrgency;
}

/**
 * Qué tan apurada está una deuda pendiente. Una deuda saldada nunca urge,
 * aunque su fecha ya pasó: la fecha dejó de importar cuando se pagó.
 */
export function debtUrgency(debt: Debt, todayKey: string): DebtUrgency {
  if (debt.status === "pagado" || !debt.due_date) return "ninguna";
  const days = daysBetween(todayKey, debt.due_date);
  if (days < 0) return "vencida";
  return days < DEBT_URGENT_DAYS ? "pronto" : "ninguna";
}

/**
 * Las deudas listas para mostrar: primero las pendientes, y dentro de cada
 * grupo lo más urgente arriba.
 *
 * Las que no tienen fecha van al final de las pendientes (no se pueden
 * ordenar por algo que no existe, y adivinarles una fecha sería mentir),
 * pero antes que las saldadas.
 */
export function debtRows(debts: Debt[], todayKey: string): DebtRow[] {
  return debts
    .map((debt) => ({
      ...debt,
      dueInDays: debt.due_date ? daysBetween(todayKey, debt.due_date) : null,
      urgency: debtUrgency(debt, todayKey),
    }))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "pendiente" ? -1 : 1;
      if (a.status === "pagado") {
        // Saldadas: la más reciente primero.
        return (b.settled_at ?? b.created_at).localeCompare(a.settled_at ?? a.created_at);
      }
      if (a.dueInDays === null || b.dueInDays === null) {
        if (a.dueInDays !== b.dueInDays) return a.dueInDays === null ? 1 : -1;
      } else if (a.dueInDays !== b.dueInDays) {
        return a.dueInDays - b.dueInDays;
      }
      return a.person_name.localeCompare(b.person_name, "es");
    });
}

export interface DebtTotals {
  /** Pendiente de cobrar (te deben). */
  owedToMe: number;
  /** Pendiente de pagar (debés). */
  owedByMe: number;
  /** owedToMe − owedByMe: a favor si es positivo. */
  net: number;
  pendingCount: number;
  overdueCount: number;
}

/** Solo cuenta las pendientes: una deuda saldada ya no se debe. */
export function debtTotals(debts: Debt[], todayKey: string): DebtTotals {
  let owedToMe = 0;
  let owedByMe = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const debt of debts) {
    if (debt.status !== "pendiente") continue;
    pendingCount++;
    if (debt.type === "me_deben") owedToMe += debt.amount;
    else owedByMe += debt.amount;
    if (debtUrgency(debt, todayKey) === "vencida") overdueCount++;
  }

  return { owedToMe, owedByMe, net: owedToMe - owedByMe, pendingCount, overdueCount };
}

/**
 * Qué movimiento registra el pago de una deuda: te pagan lo que te debían →
 * entra plata; pagás lo que debías → sale.
 */
export function settlementType(type: DebtType): "INCOME" | "EXPENSE" {
  return type === "me_deben" ? "INCOME" : "EXPENSE";
}

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  me_deben: "Me deben",
  debo: "Debo",
};
