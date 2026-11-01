import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  CR_TZ,
  calendarMonth,
  dayKey,
  fixedTotals,
  monthKey,
  monthKeyOf,
  upcomingPayments,
} from "@/lib/fixedExpenses";
import { categorySpending, monthSummary, monthlyTotals } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";
import type { Account, FixedExpense, Transaction, UserCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Resumen" };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // "Hoy" se resuelve una vez en el servidor, en hora de Costa Rica, y baja
  // como dato a los componentes: si el navegador lo recalculara, un día de
  // diferencia rompía la hidratación del calendario.
  const todayKey = dayKey();
  const currentMonth = monthKeyOf(todayKey);

  const [{ data: movements }, { data: expenses }, { data: categories }, { data: accounts }] =
    await Promise.all([
      // Seis meses de historial: alcanza para el gráfico, y de paso trae el
      // mes en curso para los totales y el desglose por categoría.
      supabase
        .from("transactions")
        .select("amount, currency, type, category, transaction_date")
        .eq("user_id", user.id)
        .gte("transaction_date", sixMonthsAgoISO())
        .order("transaction_date", { ascending: false }),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
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

  const history = (movements ?? []) as Pick<
    Transaction,
    "amount" | "currency" | "type" | "category" | "transaction_date"
  >[];
  const fixed = (expenses ?? []) as FixedExpense[];

  // El mes se compara en hora de Costa Rica, no en UTC: un gasto del 31 a
  // las 7 p.m. es 1 del mes siguiente en UTC y caería en el mes equivocado.
  const ofThisMonth = history.filter((t) => monthKey(new Date(t.transaction_date)) === currentMonth);
  const totals = fixedTotals(fixed, currentMonth);
  const summary = monthSummary(ofThisMonth, totals.total);
  const { days, label } = calendarMonth(currentMonth, fixed, todayKey);

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    timeZone: CR_TZ,
  }).format(now);
  const todayLabel = capitalize(
    new Intl.DateTimeFormat("es-CR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: CR_TZ,
    })
      .format(now)
      .replace(",", "")
  );

  return (
    <DashboardView
      summary={summary}
      accounts={(accounts ?? []) as Account[]}
      payments={upcomingPayments(fixed, todayKey)}
      calendar={days}
      calendarLabel={label}
      categorySlices={categorySpending(ofThisMonth, fixed, currentMonth)}
      months={monthlyTotals(history, 6)}
      customCategories={(categories ?? []) as UserCategory[]}
      todayKey={todayKey}
      todayLabel={todayLabel}
      monthLabel={monthLabel}
      isEmpty={history.length === 0 && fixed.length === 0}
    />
  );
}

/** Primer día del mes de hace cinco meses, que es donde arranca el gráfico. */
function sixMonthsAgoISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 5, 1)).toISOString();
}
