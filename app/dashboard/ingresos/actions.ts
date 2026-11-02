"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { monthKey } from "@/lib/fixedExpenses";
import { ownsRow } from "@/lib/supabase/ownership";
import { createClient } from "@/lib/supabase/server";

function revalidateIncomes() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fijos");
  revalidatePath("/dashboard/movimientos");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export interface FixedIncomeInput {
  name: string;
  amount: number;
  category: string;
  payDay: number;
  /** Para quincenas. null si entra una sola vez al mes. */
  secondPayDay: number | null;
  accountId: string | null;
}

function validate(input: FixedIncomeInput): string | null {
  if (!input.name.trim()) return "Ponele un nombre al ingreso.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "El monto debe ser mayor a cero.";
  }
  const validDay = (d: number) => Number.isInteger(d) && d >= 1 && d <= 31;
  if (!validDay(input.payDay)) return "El día de pago tiene que estar entre 1 y 31.";
  if (input.secondPayDay !== null) {
    if (!validDay(input.secondPayDay)) return "El segundo día tiene que estar entre 1 y 31.";
    if (input.secondPayDay === input.payDay) {
      return "Los dos días de pago no pueden ser el mismo.";
    }
  }
  return null;
}

export async function createFixedIncome(input: FixedIncomeInput) {
  const { supabase, user } = await requireUser();

  const invalid = validate(input);
  if (invalid) return { error: invalid };
  if (!(await ownsRow(supabase, "accounts", input.accountId))) {
    return { error: "Esa cuenta no existe o no es tuya." };
  }

  const { error } = await supabase.from("fixed_incomes").insert({
    user_id: user.id,
    name: input.name.trim(),
    amount: input.amount,
    currency: "CRC",
    category: input.category || null,
    pay_day: input.payDay,
    second_pay_day: input.secondPayDay,
    account_id: input.accountId,
  });

  if (error) return { error: "No se pudo guardar el ingreso. Intentá de nuevo." };

  revalidateIncomes();
  return { error: null };
}

export async function updateFixedIncome(id: string, input: FixedIncomeInput) {
  const { supabase, user } = await requireUser();

  const invalid = validate(input);
  if (invalid) return { error: invalid };
  if (!(await ownsRow(supabase, "accounts", input.accountId))) {
    return { error: "Esa cuenta no existe o no es tuya." };
  }

  const { error } = await supabase
    .from("fixed_incomes")
    .update({
      name: input.name.trim(),
      amount: input.amount,
      category: input.category || null,
      pay_day: input.payDay,
      second_pay_day: input.secondPayDay,
      account_id: input.accountId,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo guardar el cambio. Intentá de nuevo." };

  revalidateIncomes();
  return { error: null };
}

export async function deleteFixedIncome(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("fixed_incomes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar el ingreso." };

  revalidateIncomes();
  return { error: null };
}

/**
 * Confirma que el depósito entró y registra el movimiento.
 *
 * Es de un toque y no automático a propósito: un ingreso que la app da por
 * recibido y no llegó —pago atrasado, neto distinto, despido— deja el saldo
 * mintiendo. El monto se puede corregir acá mismo, que es el caso real de
 * una quincena que vino distinta.
 *
 * La transición se hace en una sola sentencia condicional, igual que al
 * marcar un gasto fijo como pagado: así un doble toque no registra el
 * salario dos veces.
 */
export async function confirmFixedIncome(input: {
  id: string;
  /** Lo que de verdad entró, si fue distinto a lo esperado. */
  amount?: number;
  accountId?: string | null;
}) {
  const { supabase, user } = await requireUser();

  const { data: income } = await supabase
    .from("fixed_incomes")
    .select("id, name, amount, category, account_id")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!income) return { error: "Ese ingreso no existe o no es tuyo." };

  const amount = input.amount ?? Number(income.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "El monto debe ser mayor a cero." };
  }

  const accountId =
    input.accountId !== undefined ? input.accountId : (income.account_id as string | null);
  if (!(await ownsRow(supabase, "accounts", accountId))) {
    return { error: "Esa cuenta no existe o no es tuya." };
  }

  const month = monthKey();

  const { data: transitioned, error } = await supabase
    .from("fixed_incomes")
    .update({ status: "CONFIRMED", status_month: month })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .or(`status.neq.CONFIRMED,status_month.is.null,status_month.neq.${month}`)
    .select("id");

  if (error) return { error: "No se pudo confirmar el ingreso. Intentá de nuevo." };
  if (!transitioned || transitioned.length === 0) {
    // Ya estaba confirmado este mes: no se registra otra vez.
    revalidateIncomes();
    return { error: null };
  }

  const { error: movementError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount,
    currency: "CRC",
    description: income.name,
    category: income.category,
    type: "INCOME",
    account_id: accountId,
    fixed_income_id: input.id,
    transaction_date: new Date().toISOString(),
  });

  if (movementError) {
    return { error: "Se confirmó, pero no se pudo registrar el movimiento." };
  }

  revalidateIncomes();
  return { error: null };
}

/** Deshace la confirmación y borra el movimiento de este ciclo. */
export async function unconfirmFixedIncome(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("fixed_incomes")
    .update({ status: "PENDING", status_month: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo deshacer. Intentá de nuevo." };

  const [year, month] = monthKey().split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();

  await supabase
    .from("transactions")
    .delete()
    .eq("user_id", user.id)
    .eq("fixed_income_id", id)
    .gte("transaction_date", monthStart);

  revalidateIncomes();
  return { error: null };
}
