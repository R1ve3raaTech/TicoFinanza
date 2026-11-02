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

/**
 * Borra el movimiento que la app generó para el ciclo en curso, si lo hay.
 * Los de meses anteriores son historia y no se tocan.
 */
async function removeThisCycleMovement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fixedExpenseId: string
) {
  const [year, month] = monthKey().split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();

  await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .eq("fixed_expense_id", fixedExpenseId)
    .gte("transaction_date", monthStart);
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

  // Editar el gasto y pasarlo a pendiente deja el movimiento generado
  // colgado, descontando plata de un pago que ya no está marcado. Misma
  // limpieza que al desmarcarlo desde la lista.
  if (input.status === "PENDING") {
    await removeThisCycleMovement(supabase, user.id, id);
    revalidatePath("/dashboard/movimientos");
  }

  revalidateFixed();
  return { error: null };
}

/** Marcar pagado / pendiente desde la lista, sin abrir el formulario. */
/**
 * Marca un gasto fijo como pagado o pendiente y, si se pide, registra el
 * movimiento real en la cuenta.
 *
 * Registrar es opcional pero viene prendido: el caso normal es que el cobro
 * salió de una cuenta de verdad y el saldo tiene que bajar. Queda la salida
 * para quien lo pagó en efectivo sin anotar la cuenta, o para quien ya
 * registró el movimiento a mano.
 *
 * Desmarcar borra el movimiento que creó la app, igual que reabrir una
 * deuda: si lo creó marcar el pago, deshacer el pago tiene que deshacerlo o
 * la plata queda descontada dos veces.
 */
export async function setFixedExpenseStatus(
  id: string,
  status: FixedExpenseStatus,
  options: { registerMovement?: boolean; accountId?: string | null } = {}
) {
  const { supabase, user } = await requireUser();

  const { data: expense } = await supabase
    .from("fixed_expenses")
    .select("id, name, amount, category, account_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!expense) return { error: "Ese gasto fijo no existe o no es tuyo." };

  const month = monthKey();

  // La transición es la que habilita el movimiento, y se hace en una sola
  // sentencia condicional: solo actualiza si NO estaba ya pagado en este
  // mes. Dos llamadas simultáneas (doble clic, un reenvío de la acción)
  // dejan que una actualice y la otra no toque ninguna fila, así que el
  // gasto no se descuenta dos veces. Con una lectura previa en JS habría
  // una ventana entre leer y escribir por la que se cuelan las dos.
  const { data: transitioned, error } = await supabase
    .from("fixed_expenses")
    .update(statusFields(status))
    .eq("id", id)
    .eq("user_id", user.id)
    .or(
      status === "PAID"
        ? `status.neq.PAID,status_month.is.null,status_month.neq.${month}`
        : "status.neq.PENDING"
    )
    .select("id");

  if (error) return { error: "No se pudo cambiar el estado. Intentá de nuevo." };

  // Ya estaba en ese estado: no hay nada que registrar ni que deshacer.
  if (!transitioned || transitioned.length === 0) {
    revalidateFixed();
    return { error: null };
  }

  if (status === "PAID" && options.registerMovement) {
    const accountId =
      options.accountId !== undefined ? options.accountId : (expense.account_id as string | null);

    if (!(await ownsRow(supabase, "accounts", accountId))) {
      return { error: "Esa cuenta no existe o no es tuya." };
    }

    const { error: movementError } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: expense.amount,
      currency: "CRC",
      description: expense.name,
      category: expense.category,
      type: "EXPENSE",
      account_id: accountId,
      fixed_expense_id: id,
      transaction_date: new Date().toISOString(),
    });

    if (movementError) {
      // El estado ya cambió; se avisa que el movimiento no entró en vez de
      // dejar creer que el saldo se actualizó.
      revalidateFixed();
      return { error: "Se marcó como pagado, pero no se pudo registrar el movimiento." };
    }
  }

  if (status === "PENDING") {
    await removeThisCycleMovement(supabase, user.id, id);
  }

  revalidateFixed();
  revalidatePath("/dashboard/movimientos");
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
