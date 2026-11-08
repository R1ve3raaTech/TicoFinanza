"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ownsReceiptPath, RECEIPTS_BUCKET } from "@/lib/receipts";
import { isProjectAuthCookie } from "@/lib/supabase/cookies";
import { WRONG_SESSION } from "@/lib/offline";
import { ownsRow } from "@/lib/supabase/ownership";
import { createClient } from "@/lib/supabase/server";
import type { AccountType, TransactionType } from "@/lib/types";
import { GENERIC_ERROR } from "@/lib/errors";

/** Pantallas que muestran movimientos o saldos y hay que refrescar. */
function revalidateMovements() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movimientos");
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

const UNKNOWN_ACCOUNT = GENERIC_ERROR;

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export interface MovementInput {
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  transactionDate: string;
  accountId: string | null;
  /**
   * Id que genera el navegador al anotar, para que un reintento no
   * inserte dos veces. Lo manda el formulario de movimientos y la cola
   * sin conexión; el resto de la app lo deja sin poner.
   */
  clientId?: string | null;
  /**
   * De quién creía el navegador que era la sesión al anotar. Si no
   * coincide con la de verdad, el movimiento no entra: ver WRONG_SESSION
   * en lib/offline.ts.
   */
  expectedUserId?: string | null;
  /**
   * Ruta del comprobante en el bucket `receipts`, o null si no tiene. El
   * archivo lo sube el navegador directo a Storage (ver ReceiptField): por
   * acá solo pasa la ruta, no los bytes — una Server Action tiene un tope de
   * 1 MB de cuerpo y la foto de un recibo lo pasa fácil.
   */
  receiptPath?: string | null;
}

function validate(input: MovementInput): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "El monto debe ser mayor a cero.";
  }
  if (Number.isNaN(new Date(input.transactionDate).getTime())) {
    return GENERIC_ERROR;
  }
  return null;
}

const UNKNOWN_RECEIPT = "Ese comprobante no es tuyo.";

/**
 * Borra archivos del bucket sin dejar que un fallo tumbe la operación: si el
 * archivo queda huérfano es basura de 200 KB, mientras que fallar acá
 * dejaría al usuario sin poder borrar un movimiento.
 */
async function removeReceipts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: (string | null | undefined)[]
) {
  const real = paths.filter((path): path is string => Boolean(path));
  if (real.length === 0) return;
  await supabase.storage.from(RECEIPTS_BUCKET).remove(real);
}

export async function addTransaction(input: MovementInput) {
  const { supabase, user } = await requireUser();

  const invalid = validate(input);
  if (invalid) return { error: invalid };
  // El movimiento se anotó con otra cuenta abierta en este navegador. Pasa
  // con una pestaña vieja: la pantalla se dibujó con una sesión y la
  // cookie ya es de otra. Escribirlo acá lo metería en la cuenta
  // equivocada, así que no entra.
  if (input.expectedUserId && input.expectedUserId !== user.id) {
    return { error: WRONG_SESSION };
  }
  if (!(await ownsRow(supabase, "accounts", input.accountId))) {
    return { error: UNKNOWN_ACCOUNT };
  }
  if (input.receiptPath && !ownsReceiptPath(input.receiptPath, user.id)) {
    return { error: UNKNOWN_RECEIPT };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: input.amount,
    currency: "CRC",
    description: input.description.trim() || null,
    category: input.category || null,
    type: input.type,
    account_id: input.accountId,
    receipt_url: input.receiptPath ?? null,
    client_id: input.clientId || null,
    transaction_date: new Date(input.transactionDate).toISOString(),
  });

  // 23505 es el índice único de (user_id, client_id): este movimiento ya
  // había entrado y lo que se perdió fue la respuesta, no el dato. Se
  // responde que salió bien, porque salió bien — reportar un error haría
  // que la cola lo reintentara para siempre o que la persona lo anotara
  // de nuevo a mano, y ahí sí quedaría duplicado.
  if (error?.code === "23505") {
    revalidateMovements();
    return { error: null };
  }
  if (error) return { error: GENERIC_ERROR };

  revalidateMovements();
  return { error: null };
}

export async function updateTransaction(id: string, input: MovementInput) {
  const { supabase, user } = await requireUser();

  const invalid = validate(input);
  if (invalid) return { error: invalid };
  if (!(await ownsRow(supabase, "accounts", input.accountId))) {
    return { error: UNKNOWN_ACCOUNT };
  }
  const nextReceipt = input.receiptPath ?? null;
  if (nextReceipt && !ownsReceiptPath(nextReceipt, user.id)) {
    return { error: UNKNOWN_RECEIPT };
  }

  // Se lee el comprobante que tenía para poder borrar el archivo viejo si lo
  // cambió o lo quitó: si no, cada reemplazo deja una foto suelta en el
  // bucket que nadie va a volver a abrir.
  const { data: current } = await supabase
    .from("transactions")
    .select("receipt_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: input.amount,
      description: input.description.trim() || null,
      category: input.category || null,
      type: input.type,
      account_id: input.accountId,
      receipt_url: nextReceipt,
      transaction_date: new Date(input.transactionDate).toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  if (current?.receipt_url && current.receipt_url !== nextReceipt) {
    await removeReceipts(supabase, [current.receipt_url]);
  }

  revalidateMovements();
  return { error: null };
}

export async function deleteTransaction(id: string) {
  const { supabase, user } = await requireUser();

  const { data: current } = await supabase
    .from("transactions")
    .select("receipt_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  await removeReceipts(supabase, [current?.receipt_url]);

  revalidateMovements();
  return { error: null };
}

export async function deleteTransactions(ids: string[]) {
  const { supabase, user } = await requireUser();
  if (ids.length === 0) return { error: null };

  const { data: current } = await supabase
    .from("transactions")
    .select("receipt_url")
    .in("id", ids)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  await removeReceipts(supabase, (current ?? []).map((row) => row.receipt_url));

  revalidateMovements();
  return { error: null };
}

/**
 * URL firmada para ver un comprobante. El bucket es privado, así que no hay
 * link permanente: cada vez que alguien abre el visor se pide una URL que
 * sirve 10 minutos y después deja de funcionar. Que la ruta sea del usuario
 * ya lo garantiza la política de storage; se revisa igual para no mandarle
 * al servicio una ruta que no corresponde.
 */
export async function getReceiptUrl(path: string) {
  const { supabase, user } = await requireUser();

  if (!ownsReceiptPath(path, user.id)) return { url: null, error: UNKNOWN_RECEIPT };

  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error || !data) return { url: null, error: GENERIC_ERROR };
  return { url: data.signedUrl, error: null };
}

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

export interface AccountInput {
  name: string;
  type: AccountType;
  /**
   * Lo que hay en la cuenta HOY, no el saldo de partida.
   *
   * Antes el formulario pedía el saldo inicial con la ayuda "lo que hay en
   * la cuenta hoy, antes de registrar movimientos", que se contradice sola:
   * quien ponía 0 y después anotaba gastos terminaba con un saldo negativo
   * que no era el suyo (pasó de verdad: una cuenta con ₡3.000 mostraba
   * −₡4.100 porque nunca se cargó el punto de partida). La gente sabe
   * cuánto tiene hoy, no cuánto tenía antes de empezar a usar la app, así
   * que se pide eso y el saldo inicial se deduce.
   */
  currentBalance: number;
}

function validateAccount(input: AccountInput): string | null {
  if (!input.name.trim()) return "Ponele un nombre a la cuenta.";
  // Puede ser negativo: una tarjeta de crédito arranca debiendo.
  if (!Number.isFinite(input.currentBalance)) return "El saldo no es válido.";
  return null;
}

export async function createAccount(input: AccountInput) {
  const { supabase, user } = await requireUser();

  const invalid = validateAccount(input);
  if (invalid) return { error: invalid };

  // Cuenta nueva: todavía no hay movimientos, así que lo que hay hoy es
  // exactamente el punto de partida.
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: input.name.trim(),
    type: input.type,
    initial_balance: input.currentBalance,
    currency: "CRC",
  });

  if (error) return { error: GENERIC_ERROR };

  revalidateMovements();
  return { error: null };
}

export async function updateAccount(id: string, input: AccountInput) {
  const { supabase, user } = await requireUser();

  const invalid = validateAccount(input);
  if (invalid) return { error: invalid };

  // Se ajusta el punto de partida para que el saldo de hoy dé lo que la
  // persona dice que tiene. `current_balance` no se escribe nunca: lo
  // recalcula la base al cambiar `initial_balance` (triggers de la 0020).
  const { data: current } = await supabase
    .from("accounts")
    .select("initial_balance, current_balance")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!current) return { error: GENERIC_ERROR };

  // Si entra un movimiento justo entre esta lectura y la escritura, el
  // ajuste queda corrido por ese monto. Con un solo usuario por cuenta la
  // ventana es de milisegundos, y se corrige volviendo a ajustar.
  const nextInitial =
    Number(current.initial_balance) + (input.currentBalance - Number(current.current_balance));

  const { error } = await supabase
    .from("accounts")
    .update({
      name: input.name.trim(),
      type: input.type,
      initial_balance: nextInitial,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  revalidateMovements();
  return { error: null };
}

/**
 * Borra la cuenta, no su historial: los movimientos quedan sin cuenta
 * asignada (`on delete set null`). Las transferencias desde o hacia ella sí
 * se van con la cuenta, porque sin los dos lados no significan nada.
 */
export async function deleteAccount(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  revalidateMovements();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Transferencias internas
// ---------------------------------------------------------------------------

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  transferDate: string;
}

export async function createTransfer(input: TransferInput) {
  const { supabase, user } = await requireUser();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "El monto debe ser mayor a cero." };
  }
  if (!input.fromAccountId || !input.toAccountId) {
    return { error: "Elegí la cuenta de origen y la de destino." };
  }
  if (input.fromAccountId === input.toAccountId) {
    return { error: "El origen y el destino tienen que ser cuentas distintas." };
  }
  if (Number.isNaN(new Date(input.transferDate).getTime())) {
    return { error: GENERIC_ERROR };
  }

  const [ownsFrom, ownsTo] = await Promise.all([
    ownsRow(supabase, "accounts", input.fromAccountId),
    ownsRow(supabase, "accounts", input.toAccountId),
  ]);
  if (!ownsFrom || !ownsTo) return { error: UNKNOWN_ACCOUNT };

  const { error } = await supabase.from("transfers").insert({
    user_id: user.id,
    from_account_id: input.fromAccountId,
    to_account_id: input.toAccountId,
    amount: input.amount,
    description: input.description.trim() || null,
    transfer_date: new Date(input.transferDate).toISOString(),
  });

  if (error) return { error: GENERIC_ERROR };

  revalidateMovements();
  return { error: null };
}

export async function deleteTransfer(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("transfers").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  revalidateMovements();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export async function signOut() {
  let revocationFailed = false;
  try {
    const supabase = await createClient();
    // Alcance global: cierra la sesión en todos los dispositivos.
    const { error } = await supabase.auth.signOut({ scope: "global" });
    revocationFailed = Boolean(error);
  } catch {
    revocationFailed = true;
  }
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (isProjectAuthCookie(name)) store.delete(name);
  }
  return { destination: revocationFailed ? "/entrar?salida=pendiente" : "/entrar" };
}

/**
 * Cierre por inactividad (ver components/shell/IdleLogout.tsx).
 *
 * A diferencia de `signOut`, el alcance es **local** y no global: que te
 * olvides una pestaña abierta en la compu del trabajo no es razón para
 * sacarte la sesión del teléfono. Lo que hay que proteger es este
 * dispositivo, que es el que quedó solo.
 */
export async function signOutIdle() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Aunque la revocación falle, las cookies de abajo igual se borran: sin
    // ellas esta sesión del navegador no sirve.
  }
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (isProjectAuthCookie(name)) store.delete(name);
  }
  return { destination: "/entrar?motivo=inactividad" };
}
