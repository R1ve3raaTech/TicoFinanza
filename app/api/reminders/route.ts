import { NextResponse, type NextRequest } from "next/server";
import { dayKey } from "@/lib/fixedExpenses";
import { pushConfigured, sendPushToUser } from "@/lib/push/send";
import { dueReminders } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FixedExpense } from "@/lib/types";

/**
 * Recordatorios de gastos fijos. Lo llama el cron de Vercel una vez por día
 * (ver vercel.json) y manda un push por cada cobro que cae mañana o pasado
 * mañana y sigue pendiente.
 *
 * Corre del lado del servidor y no en el navegador a propósito: el aviso
 * tiene que salir aunque la app esté cerrada, que es justo el caso en el que
 * uno se olvida de un recibo. Lo único que hace el navegador es registrarse
 * para recibirlos (Ajustes → Recordatorios).
 */

// Nunca cacheada: el resultado depende del día y de lo que ya se mandó.
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Sin secreto configurado el endpoint queda cerrado: es mejor que no
  // mande nada que quedar abierto para que cualquiera dispare avisos.
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET sin configurar" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();

  if (!pushConfigured()) {
    return NextResponse.json({ error: "Claves VAPID sin configurar" }, { status: 503 });
  }

  const admin = createAdminClient();
  const todayKey = dayKey();

  // Quiénes quieren recordatorios. El flag es por usuario; que tenga algún
  // dispositivo suscrito lo resuelve sendPushToUser (si no hay, no manda).
  const { data: settings, error: settingsError } = await admin
    .from("user_settings")
    .select("user_id")
    .eq("reminders_enabled", true);

  if (settingsError) {
    return NextResponse.json({ error: "No se pudieron leer los ajustes" }, { status: 500 });
  }

  const userIds = (settings ?? []).map((row) => row.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ day: todayKey, users: 0, sent: 0, skipped: 0 });
  }

  const { data: expenses, error: expensesError } = await admin
    .from("fixed_expenses")
    .select("*")
    .in("user_id", userIds);

  if (expensesError) {
    return NextResponse.json({ error: "No se pudieron leer los gastos fijos" }, { status: 500 });
  }

  const byUser = new Map<string, FixedExpense[]>();
  for (const expense of (expenses ?? []) as FixedExpense[]) {
    const list = byUser.get(expense.user_id) ?? [];
    list.push(expense);
    byUser.set(expense.user_id, list);
  }

  let sent = 0;
  let skipped = 0;

  for (const userId of userIds) {
    for (const reminder of dueReminders(byUser.get(userId) ?? [], todayKey)) {
      // El registro se escribe ANTES de mandar, y si choca con el unique es
      // porque ese aviso ya salió: así un reintento del cron no vuelve a
      // notificar lo mismo. Al revés (mandar y después registrar) una caída
      // en el medio duplicaría el aviso.
      const { error: logError } = await admin.from("push_reminders").insert({
        user_id: userId,
        fixed_expense_id: reminder.fixedExpenseId,
        due_key: reminder.dueKey,
        days_before: reminder.dueInDays,
      });

      if (logError) {
        skipped++;
        continue;
      }

      const result = await sendPushToUser(admin, userId, {
        title: reminder.title,
        body: reminder.body,
        url: reminder.url,
        // Un solo aviso vivo por cobro: el de "mañana" reemplaza al de
        // "pasado mañana" en la bandeja.
        tag: `fijo-${reminder.fixedExpenseId}-${reminder.dueKey}`,
      });

      sent += result.sent;
    }
  }

  return NextResponse.json({ day: todayKey, users: userIds.length, sent, skipped });
}
