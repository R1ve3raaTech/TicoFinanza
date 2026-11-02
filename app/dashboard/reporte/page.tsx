import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MonthlyReport, type ReportFixedRow } from "@/components/report/MonthlyReport";
import { dayKey, effectiveStatus, fixedTotals, monthKeyOf } from "@/lib/fixedExpenses";
import { expenseByCategory, monthSummary } from "@/lib/insights";
import { resolveFirstName } from "@/lib/profile";
import { breakdown, coverage, incomeByCategory, monthRangeISO, shiftMonth } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import type { Account, FixedExpense, Transaction } from "@/lib/types";

export const metadata: Metadata = { title: "Reporte mensual" };

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const todayKey = dayKey();
  const monthKey = mes && MONTH_PATTERN.test(mes) ? mes : monthKeyOf(todayKey);
  const { fromISO, toISO } = monthRangeISO(monthKey);
  // Un gasto fijo creado después del mes que se está mirando no existía
  // entonces: meterlo en un reporte de octubre sería inventar un cobro.
  const monthEnd = `${shiftMonth(monthKey, 1)}-01T00:00:00.000Z`;

  const [{ data: movements }, { data: fixed }, { data: accounts }, { data: profile }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", fromISO)
        .lte("transaction_date", toISO)
        .order("transaction_date", { ascending: true }),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);

  const allMovements = (movements ?? []) as Transaction[];
  const fixedExpenses = ((fixed ?? []) as FixedExpense[]).filter(
    (expense) => expense.created_at < monthEnd
  );

  // El movimiento que genera marcar un fijo como pagado ya está contado
  // como fijo: sin excluirlo, el alquiler pesaría por los dos lados.
  const variableMovements = allMovements.filter((movement) => !movement.fixed_expense_id);

  const totals = fixedTotals(fixedExpenses, monthKey);
  const summary = monthSummary(
    variableMovements.map((movement) => ({ type: movement.type, amount: movement.amount })),
    totals
  );

  const fixedRows: ReportFixedRow[] = [...fixedExpenses]
    .sort((a, b) => a.charge_day - b.charge_day)
    .map((expense) => ({
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      chargeDay: expense.charge_day,
      paid: effectiveStatus(expense, monthKey) === "PAID",
    }));

  return (
    <MonthlyReport
      monthKey={monthKey}
      summary={summary}
      expenseRows={breakdown(expenseByCategory(variableMovements, fixedExpenses))}
      incomeRows={breakdown(incomeByCategory(variableMovements))}
      fixed={fixedRows}
      // La lista sí muestra todo, incluido el movimiento que generó pagar
      // un fijo: en el papel se compara línea por línea contra el banco, y
      // ahí ese cobro existe.
      movements={allMovements}
      accounts={(accounts ?? []) as Account[]}
      ownerName={resolveFirstName(user, profile?.full_name)}
      coverage={coverage(monthKey, todayKey)}
      generatedKey={todayKey}
    />
  );
}
