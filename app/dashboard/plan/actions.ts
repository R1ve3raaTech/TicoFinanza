"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { settlementType } from "@/lib/debts";
import { ownsRow } from "@/lib/supabase/ownership";
import { createClient } from "@/lib/supabase/server";
import type { DebtType, GoalColor } from "@/lib/types";

function revalidatePlan() {
  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

// ---------------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------------

/**
 * Crea o pisa el tope de una categoría para un mes. Es un upsert y no un
 * insert porque la pantalla ofrece "poner tope" sobre categorías que quizás
 * ya lo tienen: fallar con "ya existe" no le serviría a nadie.
 */
export async function setBudget(input: {
  category: string;
  monthlyLimit: number;
  monthYear: string;
}) {
  const { supabase, user } = await requireUser();

  const category = input.category.trim();
  if (!category) return { error: "Elegí una categoría." };
  if (!Number.isFinite(input.monthlyLimit) || input.monthlyLimit <= 0) {
    return { error: "El tope debe ser mayor a cero." };
  }
  if (!MONTH_PATTERN.test(input.monthYear)) return { error: "El mes no es válido." };

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category_name: category,
      monthly_limit: input.monthlyLimit,
      month_year: input.monthYear,
    },
    { onConflict: "user_id,category_name,month_year" }
  );

  if (error) return { error: "No se pudo guardar el presupuesto. Intentá de nuevo." };

  revalidatePlan();
  return { error: null };
}

export async function deleteBudget(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar el presupuesto." };

  revalidatePlan();
  return { error: null };
}

/**
 * Copia los topes del mes anterior al mes que se está viendo. Es el atajo
 * que evita volver a escribir los mismos ocho montos todos los meses; los
 * que ya existen en el mes destino no se tocan.
 */
export async function copyBudgetsFromPreviousMonth(monthYear: string) {
  const { supabase, user } = await requireUser();

  if (!MONTH_PATTERN.test(monthYear)) return { error: "El mes no es válido.", copied: 0 };

  const [year, month] = monthYear.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;

  const [{ data: source }, { data: existing }] = await Promise.all([
    supabase
      .from("budgets")
      .select("category_name, monthly_limit")
      .eq("user_id", user.id)
      .eq("month_year", previousKey),
    supabase
      .from("budgets")
      .select("category_name")
      .eq("user_id", user.id)
      .eq("month_year", monthYear),
  ]);

  const already = new Set((existing ?? []).map((b) => b.category_name));
  const rows = (source ?? [])
    .filter((b) => !already.has(b.category_name))
    .map((b) => ({
      user_id: user.id,
      category_name: b.category_name,
      monthly_limit: b.monthly_limit,
      month_year: monthYear,
    }));

  if (rows.length === 0) return { error: null, copied: 0 };

  const { error } = await supabase.from("budgets").insert(rows);
  if (error) return { error: "No se pudieron copiar los presupuestos.", copied: 0 };

  revalidatePlan();
  return { error: null, copied: rows.length };
}

// ---------------------------------------------------------------------------
// Metas de ahorro
// ---------------------------------------------------------------------------

export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate: string | null;
  color: GoalColor;
}

function validateGoal(input: GoalInput): string | null {
  if (!input.name.trim()) return "Ponele un nombre a la meta.";
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
    return "El objetivo debe ser mayor a cero.";
  }
  if (input.targetDate && Number.isNaN(new Date(input.targetDate).getTime())) {
    return "La fecha objetivo no es válida.";
  }
  return null;
}

export async function createGoal(input: GoalInput) {
  const { supabase, user } = await requireUser();

  const invalid = validateGoal(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name: input.name.trim(),
    target_amount: input.targetAmount,
    target_date: input.targetDate || null,
    color: input.color,
  });

  if (error) return { error: "No se pudo crear la meta. Intentá de nuevo." };

  revalidatePlan();
  return { error: null };
}

export async function updateGoal(id: string, input: GoalInput) {
  const { supabase, user } = await requireUser();

  const invalid = validateGoal(input);
  if (invalid) return { error: invalid };

  // `current_amount` no se toca acá: sale de los abonos.
  const { error } = await supabase
    .from("savings_goals")
    .update({
      name: input.name.trim(),
      target_amount: input.targetAmount,
      target_date: input.targetDate || null,
      color: input.color,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo guardar el cambio. Intentá de nuevo." };

  revalidatePlan();
  return { error: null };
}

/** Borra la meta y, en cascada, sus abonos: la plata vuelve a las cuentas. */
export async function deleteGoal(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar la meta." };

  revalidatePlan();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Abonos
// ---------------------------------------------------------------------------

/**
 * Mueve plata de una cuenta a una meta. No es un gasto: baja el saldo de la
 * cuenta y sube lo apartado, igual que una transferencia interna. Los dos
 * saldos los recalcula la base (triggers de la migración 0020).
 */
export async function contributeToGoal(input: {
  goalId: string;
  accountId: string | null;
  amount: number;
}) {
  const { supabase, user } = await requireUser();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "El monto debe ser mayor a cero." };
  }

  const [ownsGoal, ownsAccount] = await Promise.all([
    ownsRow(supabase, "savings_goals", input.goalId),
    ownsRow(supabase, "accounts", input.accountId),
  ]);
  if (!ownsGoal) return { error: "Esa meta no existe o no es tuya." };
  if (!ownsAccount) return { error: "Esa cuenta no existe o no es tuya." };

  const { error } = await supabase.from("goal_contributions").insert({
    user_id: user.id,
    goal_id: input.goalId,
    account_id: input.accountId,
    amount: input.amount,
  });

  if (error) return { error: "No se pudo guardar el abono. Intentá de nuevo." };

  revalidatePlan();
  return { error: null };
}

/** Deshace un abono: la plata vuelve a la cuenta de la que salió. */
export async function deleteContribution(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("goal_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo deshacer el abono." };

  revalidatePlan();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Deudas y préstamos
// ---------------------------------------------------------------------------

export interface DebtInput {
  type: DebtType;
  personName: string;
  amount: number;
  dueDate: string | null;
  notes: string;
}

function validateDebt(input: DebtInput): string | null {
  if (!input.personName.trim()) return "Poné el nombre de la persona.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "El monto debe ser mayor a cero.";
  }
  if (input.dueDate && Number.isNaN(new Date(input.dueDate).getTime())) {
    return "La fecha no es válida.";
  }
  return null;
}

export async function createDebt(input: DebtInput) {
  const { supabase, user } = await requireUser();

  const invalid = validateDebt(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    type: input.type,
    person_name: input.personName.trim(),
    amount: input.amount,
    currency: "CRC",
    due_date: input.dueDate || null,
    notes: input.notes.trim() || null,
  });

  if (error) return { error: "No se pudo guardar la deuda. Intentá de nuevo." };

  revalidatePlan();
  return { error: null };
}

export async function updateDebt(id: string, input: DebtInput) {
  const { supabase, user } = await requireUser();

  const invalid = validateDebt(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase
    .from("debts")
    .update({
      type: input.type,
      person_name: input.personName.trim(),
      amount: input.amount,
      due_date: input.dueDate || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo guardar el cambio. Intentá de nuevo." };

  revalidatePlan();
  return { error: null };
}

/**
 * Borra la deuda, pero NO el movimiento con el que se saldó: ese movimiento
 * registra plata que de verdad entró o salió de una cuenta, y borrarlo
 * dejaría el saldo mintiendo.
 */
export async function deleteDebt(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar la deuda." };

  revalidatePlan();
  return { error: null };
}

/**
 * Marca una deuda como saldada y, si se pide, registra el movimiento real.
 *
 * Registrar es opcional porque las dos situaciones existen: si te pagaron
 * por SINPE a la cuenta del banco, ese ingreso tiene que aparecer en los
 * movimientos y subir el saldo; si te pagaron en efectivo y ya te lo
 * gastaste, forzar un movimiento le mentiría a la cuenta. Quien salda la
 * deuda es el único que sabe cuál de las dos fue.
 */
export async function settleDebt(input: {
  id: string;
  register: boolean;
  accountId: string | null;
}) {
  const { supabase, user } = await requireUser();

  const { data: debt } = await supabase
    .from("debts")
    .select("id, type, person_name, amount, status")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!debt) return { error: "Esa deuda no existe o no es tuya." };
  if (debt.status === "pagado") return { error: "Esa deuda ya estaba saldada." };

  let transactionId: string | null = null;

  if (input.register) {
    if (!(await ownsRow(supabase, "accounts", input.accountId))) {
      return { error: "Esa cuenta no existe o no es tuya." };
    }

    const income = settlementType(debt.type as DebtType) === "INCOME";
    const { data: created, error: movementError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        amount: debt.amount,
        currency: "CRC",
        description: income
          ? `${debt.person_name} te pagó`
          : `Le pagaste a ${debt.person_name}`,
        category: income ? "Otros" : "Otro",
        type: income ? "INCOME" : "EXPENSE",
        account_id: input.accountId,
        transaction_date: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (movementError || !created) {
      return { error: "No se pudo registrar el movimiento. Intentá de nuevo." };
    }
    transactionId = created.id;
  }

  const { error } = await supabase
    .from("debts")
    .update({
      status: "pagado",
      settled_at: new Date().toISOString(),
      settled_transaction_id: transactionId,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    // El movimiento ya se creó: si el update falla se borra, para no dejar
    // un ingreso suelto por una deuda que sigue apareciendo como pendiente.
    if (transactionId) {
      await supabase.from("transactions").delete().eq("id", transactionId).eq("user_id", user.id);
    }
    return { error: "No se pudo saldar la deuda. Intentá de nuevo." };
  }

  revalidatePlan();
  revalidatePath("/dashboard/movimientos");
  return { error: null };
}

/**
 * Vuelve a poner una deuda como pendiente. Si al saldarla se registró un
 * movimiento, ese movimiento se borra: lo creó la app al marcar el pago, así
 * que deshacer el pago tiene que deshacerlo también o la plata queda contada
 * dos veces.
 */
export async function reopenDebt(id: string) {
  const { supabase, user } = await requireUser();

  const { data: debt } = await supabase
    .from("debts")
    .select("settled_transaction_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!debt) return { error: "Esa deuda no existe o no es tuya." };

  const { error } = await supabase
    .from("debts")
    .update({ status: "pendiente", settled_at: null, settled_transaction_id: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo reabrir la deuda." };

  if (debt.settled_transaction_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", debt.settled_transaction_id)
      .eq("user_id", user.id);
  }

  revalidatePlan();
  revalidatePath("/dashboard/movimientos");
  return { error: null };
}
