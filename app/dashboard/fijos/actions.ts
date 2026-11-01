"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { monthKey } from "@/lib/fixedExpenses";
import { ownsRow } from "@/lib/supabase/ownership";
import { createClient } from "@/lib/supabase/server";
import type { FixedExpenseStatus } from "@/lib/types";

function revalidateFixed() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fijos");
  // Los fijos cuentan contra los topes por categoría.
  revalidatePath("/dashboard/plan");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export interface FixedExpenseInput {
  name: string;
  amount: number;
  category: string;
  chargeDay: number;
  status: FixedExpenseStatus;
  accountId: string | null;
}

function validate(input: FixedExpenseInput): string | null {
  if (!input.name.trim()) return "Ponele un nombre al gasto fijo.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "El monto debe ser mayor a cero.";
  }
  if (!Number.isInteger(input.chargeDay) || input.chargeDay < 1 || input.chargeDay > 31) {
    return "El día de cobro tiene que estar entre 1 y 31.";
  }
  return null;
}

/**
 * `status_month` se guarda junto con el estado: así "pagado" vale para el mes
 * en curso y no para siempre (ver lib/fixedExpenses.ts). Cuando el gasto
 * queda pendiente se limpia, que es lo mismo que decir "ningún mes pagado".
 */
function statusFields(status: FixedExpenseStatus) {
  return { status, status_month: status === "PAID" ? monthKey() : null };
}

export async function createFixedExpense(input: FixedExpenseInput) {
  const { supabase, user } = await requireUser();

  const invalid = validate(input);
  if (invalid) return { error: invalid };
  if (!(await ownsRow(supabase, "accounts", input.accountId))) {
    return { error: "Esa cuenta no existe o no es tuya." };
  }

  const { error } = await supabase.from("fixed_expenses").insert({
    user_id: user.id,
    name: input.name.trim(),
    amount: input.amount,
    currency: "CRC",
    category: input.category || null,
    charge_day: input.chargeDay,
    account_id: input.accountId,
    ...statusFields(input.status),
  });

  if (error) return { error: "No se pudo guardar el gasto fijo. Intentá de nuevo." };

  revalidateFixed();
  return { error: null };
}

export async function updateFixedExpense(id: string, input: FixedExpenseInput) {
  const { supabase, user } = await requireUser();

  const invalid = validate(input);
  if (invalid) return { error: invalid };
  if (!(await ownsRow(supabase, "accounts", input.accountId))) {
    return { error: "Esa cuenta no existe o no es tuya." };
  }

  const { error } = await supabase
    .from("fixed_expenses")
    .update({
      name: input.name.trim(),
      amount: input.amount,
      category: input.category || null,
      charge_day: input.chargeDay,
      account_id: input.accountId,
      ...statusFields(input.status),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo guardar el cambio. Intentá de nuevo." };

  revalidateFixed();
  return { error: null };
}

/** Marcar pagado / pendiente desde la lista, sin abrir el formulario. */
export async function setFixedExpenseStatus(id: string, status: FixedExpenseStatus) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("fixed_expenses")
    .update(statusFields(status))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo cambiar el estado. Intentá de nuevo." };

  revalidateFixed();
  return { error: null };
}

export async function deleteFixedExpense(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Hubo un error. Volvé a intentarlo." };

  revalidateFixed();
  return { error: null };
}
