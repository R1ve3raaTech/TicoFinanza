import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InsightsView } from "@/components/insights/InsightsView";
import {
  currentMonthKey,
  detectRecurring,
  expenseBreakdown,
  expenseByCategory,
  monthlyTotals,
} from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";
import type { Budget, SavingsGoal, Transaction } from "@/lib/types";

export const metadata: Metadata = { title: "Estadísticas" };

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data }, { data: budgetsData }, { data: goalsData }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .limit(500),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const transactions = (data ?? []) as Transaction[];
  const budgets = (budgetsData ?? []) as Budget[];
  const goals = (goalsData ?? []) as SavingsGoal[];

  const months = monthlyTotals(transactions, 6);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const key = currentMonthKey();

  const byEntity = expenseBreakdown(transactions, (t) => t.bank_name, key);
  const byCategory = expenseBreakdown(
    transactions,
    (t) => t.category ?? "Sin categoría",
    key
  );
  const recurring = detectRecurring(transactions);
  const uncategorizedCount = transactions.filter(
    (t) => t.is_automated && !t.category
  ).length;

  const spentByCategory = expenseByCategory(transactions, key);

  const aiSnapshot = {
    thisMonth: { income: thisMonth.income, expense: thisMonth.expense },
    lastMonth: lastMonth ? { income: lastMonth.income, expense: lastMonth.expense } : null,
    topCategories: byCategory.slice(0, 5).map((c) => ({ label: c.label, amount: c.amount })),
    budgets: budgets.map((b) => ({
      category: b.category,
      limit: b.monthly_limit,
      spent: spentByCategory.get(b.category) ?? 0,
    })),
    recurring: recurring
      .slice(0, 5)
      .map((r) => ({ description: r.description, amount: r.averageAmount })),
  };

  const netDelta =
    lastMonth && lastMonth.income - lastMonth.expense !== 0
      ? ((thisMonth.income - thisMonth.expense - (lastMonth.income - lastMonth.expense)) /
          Math.abs(lastMonth.income - lastMonth.expense)) *
        100
      : null;

  // Mismo reloj que currentMonthKey()/monthlyTotals (hora del servidor), para
  // que el nombre del mes nunca contradiga los números que acompaña.
  const now = new Date();
  const monthName = new Intl.DateTimeFormat("es-CR", { month: "long" }).format(now);
  const monthYear = new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(now);
  const previousMonthName = new Intl.DateTimeFormat("es-CR", { month: "long" }).format(
    new Date(now.getFullYear(), now.getMonth() - 1, 1)
  );

  return (
    <InsightsView
      monthName={monthName}
      monthYear={monthYear}
      previousMonthName={previousMonthName}
      thisMonth={thisMonth}
      netDelta={netDelta}
      months={months}
      aiSnapshot={aiSnapshot}
      byEntity={byEntity}
      byCategory={byCategory}
      uncategorizedCount={uncategorizedCount}
      budgets={budgets}
      spentByCategory={spentByCategory}
      recurring={recurring}
      goals={goals}
      transactions={transactions}
    />
  );
}
