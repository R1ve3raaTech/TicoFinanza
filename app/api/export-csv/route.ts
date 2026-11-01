import { NextResponse, type NextRequest } from "next/server";
import { accountNames } from "@/lib/accounts";
import { endOfDayISO, startOfDayISO } from "@/lib/dateRange";
import { CR_TZ } from "@/lib/fixedExpenses";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction, Transfer } from "@/lib/types";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: CR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Escapa un campo para CSV. Siempre entre comillas: los detalles y los
 * nombres de cuenta pueden traer comas, saltos de línea o comillas, y un
 * archivo que se rompe al abrirlo en Excel no sirve de nada.
 */
function csvField(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Exportación de movimientos a CSV, filtrada por el rango que se esté
 * viendo. Incluye las transferencias, marcadas como tales: sacar del cajero
 * no es un gasto, pero sí es un movimiento que uno espera ver en su archivo.
 *
 * Separador `;` y BOM al inicio: es lo que Excel en español espera: con
 * coma, mete toda la fila en la primera columna, y sin BOM se come los
 * acentos.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", request.url));

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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

  if (from && DAY_PATTERN.test(from)) {
    movementsQuery = movementsQuery.gte("transaction_date", startOfDayISO(from));
    transfersQuery = transfersQuery.gte("transfer_date", startOfDayISO(from));
  }
  if (to && DAY_PATTERN.test(to)) {
    movementsQuery = movementsQuery.lte("transaction_date", endOfDayISO(to));
    transfersQuery = transfersQuery.lte("transfer_date", endOfDayISO(to));
  }

  const [{ data: movements, error }, { data: transfers }, { data: accounts }] = await Promise.all([
    movementsQuery,
    transfersQuery,
    supabase.from("accounts").select("*").eq("user_id", user.id),
  ]);

  if (error) {
    return NextResponse.json({ error: "No se pudieron leer los movimientos." }, { status: 500 });
  }

  const names = accountNames((accounts ?? []) as Account[]);
  const accountLabel = (id: string | null) => (id ? (names.get(id) ?? "Cuenta eliminada") : "");

  interface Row {
    date: string;
    type: string;
    category: string;
    detail: string;
    amount: number;
    account: string;
  }

  const rows: Row[] = [
    ...((movements ?? []) as Transaction[]).map((t) => ({
      date: t.transaction_date,
      type: t.type === "INCOME" ? "Ingreso" : "Gasto",
      category: t.category ?? "",
      detail: t.description ?? "",
      // El signo va en el monto para que la columna se pueda sumar tal cual
      // en una hoja de cálculo.
      amount: t.type === "INCOME" ? t.amount : -t.amount,
      account: accountLabel(t.account_id),
    })),
    ...((transfers ?? []) as Transfer[]).map((t) => ({
      date: t.transfer_date,
      type: "Transferencia",
      category: "",
      detail: t.description ?? "",
      // Neutra: no suma ni resta al patrimonio, solo cambia de billetera.
      amount: 0,
      account: `${accountLabel(t.from_account_id)} → ${accountLabel(t.to_account_id)}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const header = ["Fecha", "Tipo", "Categoría", "Detalle", "Monto CRC", "Cuenta"];
  const lines = [
    header.map(csvField).join(";"),
    ...rows.map((row) =>
      [
        csvField(dateFormat.format(new Date(row.date))),
        csvField(row.type),
        csvField(row.category),
        csvField(row.detail),
        // Coma decimal y sin separador de miles: así lo lee Excel en español.
        csvField(row.amount.toFixed(2).replace(".", ",")),
        csvField(row.account),
      ].join(";")
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ticofinanza-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
