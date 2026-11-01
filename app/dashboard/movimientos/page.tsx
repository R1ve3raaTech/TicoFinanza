import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MovementsView } from "@/components/movements/MovementsView";
import { endOfDayISO, startOfDayISO } from "@/lib/dateRange";
import { CR_TZ, monthKey } from "@/lib/fixedExpenses";
import { buildLedger } from "@/lib/ledger";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction, Transfer, UserCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Movimientos" };

const shortDay = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: CR_TZ,
});

/** "YYYY-MM-DD" a "3 sep". Mediodía, para que ningún huso lo corra de día. */
function dayLabel(key: string): string {
  return shortDay.format(new Date(`${key}T12:00:00`));
}

export default async function MovementsPage({
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
  if (!user) redirect("/entrar");

  // Sin rango elegido, el período es el mes en curso: es lo que miran los
  // totales del resumen, así que las dos pantallas cuentan lo mismo.
  const monthStart = `${monthKey()}-01`;
  const fromKey = hasRange ? from! : monthStart;
  const fromISO = startOfDayISO(fromKey);
  const toISO = hasRange ? endOfDayISO(to!) : null;

  let movementsQuery = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("transaction_date", fromISO)
    .order("transaction_date", { ascending: false });

  let transfersQuery = supabase
    .from("transfers")
    .select("*")
    .eq("user_id", user.id)
    .gte("transfer_date", fromISO)
    .order("transfer_date", { ascending: false });

  if (toISO) {
    movementsQuery = movementsQuery.lte("transaction_date", toISO);
    transfersQuery = transfersQuery.lte("transfer_date", toISO);
  }

  const [{ data }, { data: transfers }, { data: accounts }, { data: categories }] =
    await Promise.all([
      movementsQuery,
      transfersQuery,
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  const transactions = (data ?? []) as Transaction[];

  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "INCOME") income += t.amount;
    else expense += t.amount;
  }

  const monthName = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    timeZone: CR_TZ,
  }).format(new Date());

  const csvParams = new URLSearchParams({ from: fromKey });
  if (hasRange) csvParams.set("to", to!);

  return (
    <MovementsView
      entries={buildLedger(transactions, (transfers ?? []) as Transfer[])}
      accounts={(accounts ?? []) as Account[]}
      customCategories={(categories ?? []) as UserCategory[]}
      income={income}
      expense={expense}
      periodLabel={hasRange ? `${dayLabel(from!)} – ${dayLabel(to!)}` : monthName}
      csvHref={`/api/export-csv?${csvParams.toString()}`}
    />
  );
}
