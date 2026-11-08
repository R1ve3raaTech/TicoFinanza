import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MovementsView } from "@/components/movements/MovementsView";
import { resolvePeriod } from "@/lib/dateRange";
import { dayKey } from "@/lib/fixedExpenses";
import { buildLedger } from "@/lib/ledger";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Transaction,
  Transfer,
} from "@/lib/types";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovementsPage({
  searchParams,
}: {
  // `nuevo` lo lee el provider del layout, que es quien abre el
  // formulario: un layout no recibe los parámetros de la URL.
  searchParams: Promise<{ periodo?: string; from?: string; to?: string }>;
}) {
  const { periodo, from, to } = await searchParams;

  // Los accesos rápidos del ícono de la app entran por acá
  // (ver `shortcuts` en app/manifest.ts). Cualquier otro valor se ignora:
  // un parámetro raro no debería abrir un formulario a medias.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // "Hoy" es hoy en Costa Rica, resuelto acá: el navegador solo manda el
  // nombre del período. Ver resolvePeriod().
  const range = resolvePeriod({ periodo, from, to }, dayKey());

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

  const [{ data }, { data: transfers }, { data: accounts }] =
    await Promise.all([
      movementsQuery,
      transfersQuery,
      supabase
        .from("accounts")
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
      income={income}
      expense={expense}
      period={range.id}
      periodLabel={range.label}
      csvHref={range.csvQuery ? `/api/export-csv?${range.csvQuery}` : "/api/export-csv"}
    />
  );
}
