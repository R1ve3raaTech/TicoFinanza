import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MovementsView } from "@/components/movements/MovementsView";
import { movementsRange } from "@/lib/dateRange";
import { buildLedger } from "@/lib/ledger";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction, Transfer, UserCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Sin rango elegido se ve todo el historial, no el mes en curso: el filtro
  // de arriba viene marcado en "Todo" y tiene que decir la verdad. Ver
  // movementsRange() para el bug que esto arregla.
  const range = movementsRange({ from, to });

  let movementsQuery = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  let transfersQuery = supabase
    .from("transfers")
    .select("*")
    .eq("user_id", user.id)
    .order("transfer_date", { ascending: false });

  if (range.fromISO) {
    movementsQuery = movementsQuery.gte("transaction_date", range.fromISO);
    transfersQuery = transfersQuery.gte("transfer_date", range.fromISO);
  }
  if (range.toISO) {
    movementsQuery = movementsQuery.lte("transaction_date", range.toISO);
    transfersQuery = transfersQuery.lte("transfer_date", range.toISO);
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

  return (
    <MovementsView
      entries={buildLedger(transactions, (transfers ?? []) as Transfer[])}
      accounts={(accounts ?? []) as Account[]}
      customCategories={(categories ?? []) as UserCategory[]}
      income={income}
      expense={expense}
      periodLabel={range.label}
      csvHref={range.csvQuery ? `/api/export-csv?${range.csvQuery}` : "/api/export-csv"}
    />
  );
}
