import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlanView, type PlanTab } from "@/components/plan/PlanView";
import { budgetProgress } from "@/lib/budgets";
import { expenseCategories } from "@/lib/categories";
import { dayKey, monthKeyOf } from "@/lib/fixedExpenses";
import { expenseByCategory } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Budget,
  Debt,
  FixedExpense,
  GoalContribution,
  SavingsGoal,
  Transaction,
  UserCategory,
} from "@/lib/types";

export const metadata: Metadata = { title: "Plan" };

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function shiftMonth(monthYear: string, months: number): string {
  const [year, month] = monthYear.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; mes?: string }>;
}) {
  const { ver, mes } = await searchParams;
  const tab: PlanTab =
    ver === "metas" ? "metas" : ver === "deudas" ? "deudas" : "presupuestos";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const todayKey = dayKey();
  const monthYear = mes && MONTH_PATTERN.test(mes) ? mes : monthKeyOf(todayKey);
  const monthStart = `${monthYear}-01T00:00:00.000Z`;
  const monthEnd = `${shiftMonth(monthYear, 1)}-01T00:00:00.000Z`;

  const [
    { data: budgets },
    { data: movements },
    { data: fixed },
    { data: categories },
    { data: goals },
    { data: accounts },
    { data: contributions },
    { data: debts },
  ] = await Promise.all([
    supabase.from("budgets").select("*").eq("user_id", user.id).eq("month_year", monthYear),
    // Sin los movimientos nacidos de un gasto fijo: el tope mide
    // movimientos MÁS gastos fijos de la categoría, así que incluirlos haría
    // que un fijo pagado consumiera el tope dos veces.
    supabase
      .from("transactions")
      .select("category, amount, type, transaction_date")
      .eq("user_id", user.id)
      .eq("type", "EXPENSE")
      .is("fixed_expense_id", null)
      .gte("transaction_date", monthStart)
      .lt("transaction_date", monthEnd),
    supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
    supabase
      .from("user_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("goal_contributions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Los gastos fijos cuentan contra el tope de su categoría: el límite es de
  // la categoría, no de una u otra forma de gastar. Pagados o no pesan
  // igual, porque la plata del mes está comprometida de todas formas; lo que
  // sí se excluye, al mirar un mes viejo, es lo que todavía no existía.
  const fixedExpenses = ((fixed ?? []) as FixedExpense[]).filter(
    (expense) => expense.created_at < monthEnd
  );
  const spent = expenseByCategory(
    (movements ?? []) as Pick<Transaction, "category" | "amount" | "type">[],
    fixedExpenses
  );

  const progress = budgetProgress((budgets ?? []) as Budget[], spent);
  const budgeted = new Set(progress.map((p) => p.category));

  const allCategories = expenseCategories((categories ?? []) as UserCategory[]);
  const availableCategories = [
    ...new Set([...allCategories, ...spent.keys()]),
  ].filter((category) => !budgeted.has(category));

  const untracked = [...spent.entries()]
    .filter(([category, amount]) => !budgeted.has(category) && amount > 0)
    .map(([category, amount]) => ({ category, spent: amount }))
    .sort((a, b) => b.spent - a.spent);

  return (
    <PlanView
      tab={tab}
      monthYear={monthYear}
      monthLabel={monthLabel(monthYear)}
      previousMonth={shiftMonth(monthYear, -1)}
      nextMonth={shiftMonth(monthYear, 1)}
      progress={progress}
      availableCategories={availableCategories}
      expenseCategoryOptions={allCategories}
      untracked={untracked}
      goals={(goals ?? []) as SavingsGoal[]}
      accounts={(accounts ?? []) as Account[]}
      contributions={(contributions ?? []) as GoalContribution[]}
      debts={(debts ?? []) as Debt[]}
      todayKey={todayKey}
    />
  );
}
