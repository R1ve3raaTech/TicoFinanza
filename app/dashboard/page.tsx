import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  CR_TZ,
  dayKey,
  fixedTotals,
  monthKey,
  monthKeyOf,
  upcomingPayments,
} from "@/lib/fixedExpenses";
import { greeting, monthHeadline } from "@/lib/greeting";
import { compareMonths } from "@/lib/comparison";
import { categorySpending, monthSummary, monthlyTotals } from "@/lib/insights";
import { resolveFirstName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Account, FixedExpense, Transaction, UserCategory } from "@/lib/types";

type RecentMovement = Pick<
  Transaction,
  "description" | "category" | "account_id" | "transaction_date"
>;

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
  // diferencia rompía la hidratación de los días que faltan.
  const todayKey = dayKey();
  const currentMonth = monthKeyOf(todayKey);

  const [
    { data: movements },
    { data: expenses },
    { data: categories },
    { data: accounts },
    { data: recent },
  ] = await Promise.all([
      // Seis meses de historial: alcanza para el gráfico, y de paso trae el
      // mes en curso para los totales y el desglose por categoría.
      //
      // Se excluyen los movimientos que generó marcar un gasto fijo como
      // pagado: el fijo ya suma por su lado en todos estos cálculos, así que
      // contarlos acá sería contar el alquiler dos veces. Sí cuentan para el
      // saldo de la cuenta, que lo lleva la base.
      supabase
        .from("transactions")
        .select("amount, currency, type, category, transaction_date")
        .eq("user_id", user.id)
        .is("fixed_expense_id", null)
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
      // Para sugerir categoría y cuenta al escribir una descripción. Es una
      // lista corta y con pocas columnas: solo alimenta el autocompletado.
      supabase
        .from("transactions")
        .select("description, category, account_id, transaction_date")
        .eq("user_id", user.id)
        .not("description", "is", null)
        .order("transaction_date", { ascending: false })
        .limit(80),
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
  const summary = monthSummary(ofThisMonth, totals);

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    timeZone: CR_TZ,
  }).format(now);
  // La hora se resuelve en el servidor, en hora de Costa Rica: si el saludo
  // lo decidiera el navegador, el servidor podría renderizar "Buenas noches"
  // y el cliente "Buenas tardes", y React tira un error de hidratación.
  const hourInCR = Number(
    new Intl.DateTimeFormat("es-CR", {
      hour: "numeric",
      hour12: false,
      timeZone: CR_TZ,
    }).format(now)
  );

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

  // Comparación contra el mes pasado, cortada el mismo día del mes. Los
  // movimientos de los dos meses ya vinieron en `history`.
  const todayNumber = Number(todayKey.slice(8, 10));
  const comparison = compareMonths(history, currentMonth, todayNumber);

  const slices = categorySpending(ofThisMonth, fixed, currentMonth).map((slice) => ({
    ...slice,
    changePercent: compareMonths(history, currentMonth, todayNumber, slice.label).percent,
  }));

  return (
    <DashboardView
      summary={summary}
      comparison={comparison}
      accounts={(accounts ?? []) as Account[]}
      payments={upcomingPayments(fixed, todayKey)}
      categorySlices={slices}
      months={monthlyTotals(history, 6)}
      customCategories={(categories ?? []) as UserCategory[]}
      recent={(recent ?? []) as RecentMovement[]}
      todayKey={todayKey}
      todayLabel={todayLabel}
      monthLabel={monthLabel}
      greeting={greeting(hourInCR, resolveFirstName(user))}
      headline={monthHeadline(summary, totals.pending)}
      isEmpty={history.length === 0 && fixed.length === 0}
      hasFixed={fixed.length > 0}
      hasMovement={history.length > 0}
    />
  );
}

/** Primer día del mes de hace cinco meses, que es donde arranca el gráfico. */
function sixMonthsAgoISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 5, 1)).toISOString();
}
