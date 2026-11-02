import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FixedExpensesView } from "@/components/fixed/FixedExpensesView";
import { AGUINALDO_CATEGORY, aguinaldoEstimate, aguinaldoWindow } from "@/lib/aguinaldo";
import { CR_TZ, dayKey, fixedTotals, monthKeyOf, upcomingPayments } from "@/lib/fixedExpenses";
import { createClient } from "@/lib/supabase/server";
import type { Account, FixedExpense, FixedIncome, UserCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Fijos" };

export default async function FixedExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const tab = ver === "ingresos" ? "ingresos" : "gastos";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // "Hoy" se resuelve acá, en hora de Costa Rica, y baja como dato: si cada
  // lado lo calculara por su cuenta, servidor y navegador no coincidirían.
  const todayKey = dayKey();
  const salaryWindow = aguinaldoWindow(todayKey);

  const [
    { data: expenses },
    { data: categories },
    { data: accounts },
    { data: incomes },
    { data: salary },
  ] = await Promise.all([
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("charge_day", { ascending: true }),
    supabase
      .from("user_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("fixed_incomes")
      .select("*")
      .eq("user_id", user.id)
      .order("pay_day", { ascending: true }),
    // Solo el salario de la ventana del aguinaldo: lo de por fuera de
    // planilla no lo genera, y traer el resto sería pedir de más.
    supabase
      .from("transactions")
      .select("transaction_date, amount")
      .eq("user_id", user.id)
      .eq("type", "INCOME")
      .eq("category", AGUINALDO_CATEGORY)
      .gte("transaction_date", `${salaryWindow.from}T00:00:00-06:00`)
      .lte("transaction_date", `${salaryWindow.to}T23:59:59.999-06:00`),
  ]);

  const fixed = (expenses ?? []) as FixedExpense[];

  const monthLabel = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    timeZone: CR_TZ,
  }).format(new Date());

  return (
    <FixedExpensesView
      expenses={fixed}
      payments={upcomingPayments(fixed, todayKey)}
      totals={fixedTotals(fixed, monthKeyOf(todayKey))}
      customCategories={(categories ?? []) as UserCategory[]}
      accounts={(accounts ?? []) as Account[]}
      todayKey={todayKey}
      monthLabel={monthLabel}
      tab={tab}
      incomes={(incomes ?? []) as FixedIncome[]}
      currentMonth={monthKeyOf(todayKey)}
      aguinaldo={aguinaldoEstimate(salary ?? [], todayKey)}
    />
  );
}
