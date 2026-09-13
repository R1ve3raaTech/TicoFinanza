import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { endOfDayISO, startOfDayISO } from "@/lib/dateRange";
import { monthlyTotals } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";
import type { Transaction, UserCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

const TZ = "America/Costa_Rica";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "YYYY-MM-DD" a "3 sep". Mediodía, para que ningún huso lo corra de día. */
function shortDay(key: string): string {
  return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" }).format(
    new Date(`${key}T12:00:00`)
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const hasRange = Boolean(from && to);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: onboarding } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!onboarding?.onboarding_completed_at) redirect("/bienvenida");

  let transactionsQuery = supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false });

  // El saldo se calcula con una consulta aparte, sin el límite de la lista
  // visible: antes se sumaba solo sobre las transacciones ya traídas (50 o
  // 300), así que en cuanto había más movimientos que ese límite el saldo
  // mostrado quedaba corto (ignoraba los movimientos más viejos).
  let balanceQuery = supabase
    .from("transactions")
    .select("amount, currency, type, transaction_date");

  if (hasRange) {
    transactionsQuery = transactionsQuery
      .gte("transaction_date", startOfDayISO(from!))
      .lte("transaction_date", endOfDayISO(to!))
      .limit(300);
    balanceQuery = balanceQuery
      .gte("transaction_date", startOfDayISO(from!))
      .lte("transaction_date", endOfDayISO(to!));
  } else {
    transactionsQuery = transactionsQuery.limit(50);
  }

  // El nombre y la foto ya los trae el layout para el rail; acá no se piden.
  const [{ data }, { data: balanceRows }, { data: categories }] = await Promise.all([
    transactionsQuery,
    balanceQuery,
    supabase
      .from("user_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const transactions = (data ?? []) as Transaction[];
  const userCategories = (categories ?? []) as UserCategory[];

  let balance = 0;
  // Ingresos y gastos del mes en curso: el saldo consolidado responde
  // "cuánto tengo", pero lo que uno mira todos los días es "cuánto entró y
  // cuánto se fue este mes".
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const month = { income: 0, expense: 0 };

  for (const t of balanceRows ?? []) {
    balance += t.type === "INCOME" ? t.amount : -t.amount;

    if (new Date(t.transaction_date) >= monthStart) {
      if (t.type === "INCOME") month.income += t.amount;
      else month.expense += t.amount;
    }
  }

  // Gráfico de los últimos 6 meses para la columna lateral de escritorio.
  // Reusa las mismas filas ya traídas para el saldo — no hace falta pedirle a
  // la base el historial de nuevo.
  const months = monthlyTotals((balanceRows ?? []) as Transaction[], 6);

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("es-CR", { month: "long", timeZone: TZ }).format(now);
  const todayLabel = capitalize(
    new Intl.DateTimeFormat("es-CR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: TZ,
    })
      .format(now)
      .replace(",", "")
  );

  return (
    <DashboardView
      balance={balance}
      filtered={hasRange}
      month={hasRange ? undefined : month}
      monthLabel={monthLabel}
      rangeLabel={hasRange ? `${shortDay(from!)} – ${shortDay(to!)}` : undefined}
      todayLabel={todayLabel}
      months={months}
      transactions={transactions}
      customCategories={userCategories}
    />
  );
}
