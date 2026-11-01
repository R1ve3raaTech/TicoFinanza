import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FixedExpensesView } from "@/components/fixed/FixedExpensesView";
import { CR_TZ, dayKey, fixedTotals, monthKeyOf, upcomingPayments } from "@/lib/fixedExpenses";
import { createClient } from "@/lib/supabase/server";
import type { Account, FixedExpense, UserCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Gastos fijos" };

export default async function FixedExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: expenses }, { data: categories }, { data: accounts }] = await Promise.all([
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
  ]);

  const fixed = (expenses ?? []) as FixedExpense[];
  // "Hoy" se resuelve acá, en hora de Costa Rica, y baja como dato: si cada
  // lado lo calculara por su cuenta, servidor y navegador no coincidirían.
  const todayKey = dayKey();

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
    />
  );
}
