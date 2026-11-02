import { effectiveStatus } from "./fixedExpenses";
import type { FixedExpense, Transaction } from "./types";

export interface MonthTotal {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
}

function monthKeyOfIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Solo necesita estos tres campos, no la transacción completa — así la página
 * puede reusar la misma fila liviana que ya trae para los totales en vez de
 * pedirle a la base el historial de nuevo.
 */
type MonthlyTotalsInput = Pick<Transaction, "transaction_date" | "type" | "amount">;

/** Últimos `months` meses (incluyendo el actual). */
export function monthlyTotals(transactions: MonthlyTotalsInput[], months = 6): MonthTotal[] {
  const now = new Date();
  const buckets: MonthTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("es-CR", { month: "short" }).format(d);
    buckets.push({ monthKey: key, label, income: 0, expense: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.monthKey, b]));

  for (const t of transactions) {
    const bucket = byKey.get(monthKeyOfIso(t.transaction_date));
    if (!bucket) continue;
    if (t.type === "INCOME") bucket.income += t.amount;
    else bucket.expense += t.amount;
  }

  return buckets;
}

export interface MonthSummary {
  income: number;
  /** Suma de las membresías y gastos fijos del mes (pagados y pendientes). */
  fixedExpenses: number;
  /** De esos fijos, los que ya se marcaron pagados este mes. */
  fixedPaid: number;
  /** Y los que todavía no: plata comprometida que aún no salió. */
  fixedPending: number;
  /** Gastos anotados uno por uno, que no son fijos. */
  variableExpenses: number;
  /**
   * Lo que de verdad pasó: ingresos − variables − fijos YA PAGADOS.
   *
   * Antes esto restaba todos los fijos del mes, pagados o no, y el día 2 ya
   * mostraba un déficit rojo aunque el salario simplemente no hubiera
   * entrado todavía. Un número que alarma todos los primeros de mes deja de
   * mirarse.
   */
  net: number;
  /** Ingresos − variables − TODOS los fijos: cómo cerraría el mes. */
  projectedNet: number;
}

export function monthSummary(
  transactionsOfMonth: Pick<Transaction, "type" | "amount">[],
  fixed: { total: number; paid: number; pending: number }
): MonthSummary {
  let income = 0;
  let variableExpenses = 0;
  for (const t of transactionsOfMonth) {
    if (t.type === "INCOME") income += t.amount;
    else variableExpenses += t.amount;
  }
  return {
    income,
    fixedExpenses: fixed.total,
    fixedPaid: fixed.paid,
    fixedPending: fixed.pending,
    variableExpenses,
    net: income - fixed.paid - variableExpenses,
    projectedNet: income - fixed.total - variableExpenses,
  };
}

export interface CategorySlice {
  label: string;
  amount: number;
  /** Fracción del total, 0–1. */
  share: number;
  /** Cuánto de ese monto viene de gastos fijos. */
  fixed: number;
  /**
   * Variación del gasto variable contra el mes pasado hasta el mismo día,
   * en porcentaje. `null` si el mes pasado no hubo nada con que comparar.
   */
  changePercent?: number | null;
}

/**
 * Gasto del mes por categoría, juntando gastos variables y fijos, sin
 * agrupar la cola. Es la base del desglose de la dona y del cruce contra los
 * presupuestos: el tope de una categoría se mide contra todo lo que se gastó
 * en ella, venga de un movimiento suelto o de una membresía.
 */
export function expenseByCategory(
  expenseTransactions: Pick<Transaction, "category" | "amount" | "type">[],
  fixedExpenses: Pick<FixedExpense, "category" | "amount">[]
): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (label: string, amount: number) =>
    totals.set(label, (totals.get(label) ?? 0) + amount);

  for (const t of expenseTransactions) {
    if (t.type !== "EXPENSE") continue;
    add(t.category ?? "Sin categoría", t.amount);
  }
  for (const expense of fixedExpenses) {
    add(expense.category ?? "Sin categoría", expense.amount);
  }
  return totals;
}

/** Tope de porciones del gráfico de dona; la cola se junta en "Otras". */
export const MAX_CATEGORY_SLICES = 6;

/**
 * Gasto del mes por categoría, juntando las dos fuentes: los gastos
 * variables anotados y las membresías/gastos fijos del mes. Ordenado de
 * mayor a menor, con la cola agrupada en "Otras" — más de seis porciones no
 * se distinguen en una dona ni en una leyenda.
 */
export function categorySpending(
  expenseTransactions: Pick<Transaction, "category" | "amount" | "type">[],
  fixedExpenses: FixedExpense[],
  currentMonthKey: string
): CategorySlice[] {
  const totals = new Map<string, { amount: number; fixed: number }>();

  function add(label: string, amount: number, isFixed: boolean) {
    const entry = totals.get(label) ?? { amount: 0, fixed: 0 };
    entry.amount += amount;
    if (isFixed) entry.fixed += amount;
    totals.set(label, entry);
  }

  for (const t of expenseTransactions) {
    if (t.type !== "EXPENSE") continue;
    add(t.category ?? "Sin categoría", t.amount, false);
  }
  for (const expense of fixedExpenses) {
    // Los fijos cuentan por el mes completo, estén pagados o pendientes: el
    // desglose responde "en qué se va la plata del mes", no "qué ya salió".
    effectiveStatus(expense, currentMonthKey);
    add(expense.category ?? "Sin categoría", expense.amount, true);
  }

  const ranked = [...totals.entries()]
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => b.amount - a.amount);

  const head = ranked.slice(0, MAX_CATEGORY_SLICES - 1);
  const tail = ranked.slice(MAX_CATEGORY_SLICES - 1);
  const slices =
    tail.length > 1
      ? [
          ...head,
          {
            label: "Otras",
            amount: tail.reduce((sum, item) => sum + item.amount, 0),
            fixed: tail.reduce((sum, item) => sum + item.fixed, 0),
          },
        ]
      : ranked;

  const grandTotal = slices.reduce((sum, item) => sum + item.amount, 0);
  return slices.map((item) => ({
    ...item,
    share: grandTotal ? item.amount / grandTotal : 0,
  }));
}
