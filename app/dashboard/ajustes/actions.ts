"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { issueDeletionCode, verifyDeletionCode } from "@/lib/accountDeletion";
import { sendPushToUser } from "@/lib/push/send";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import type { Theme, TransactionType } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export async function updateProfile(input: {
  fullName: string;
  birthDate: string | null;
  avatarUrl: string | null;
}) {
  const { supabase, user } = await requireUser();

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "El nombre no puede estar vacío." };

  if (input.birthDate && Number.isNaN(new Date(input.birthDate).getTime())) {
    return { error: "La fecha de nacimiento no es válida." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      birth_date: input.birthDate || null,
      avatar_url: input.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: "No se pudo guardar el perfil. Intentá de nuevo." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

export async function updateTheme(theme: Theme) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, theme, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) return { error: "No se pudo guardar la preferencia." };
  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

export async function addCategory(name: string, type: TransactionType) {
  const { supabase, user } = await requireUser();

  const trimmed = name.trim();
  if (!trimmed) return { error: "Escribí un nombre para la categoría." };

  const { error } = await supabase
    .from("user_categories")
    .insert({ user_id: user.id, name: trimmed, type });

  if (error) {
    return {
      error: error.code === "23505" ? "Esa categoría ya existe." : "No se pudo agregar.",
    };
  }
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/movimientos");
  revalidatePath("/dashboard/fijos");
  return { error: null };
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();

  await supabase.from("user_categories").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/movimientos");
  revalidatePath("/dashboard/fijos");
  return { error: null };
}

/** Borra el historial de movimientos. Los gastos fijos no se tocan acá. */
export async function deleteAllTransactions() {
  const { supabase, user } = await requireUser();

  // Los comprobantes se leen antes de borrar las filas: después ya no hay
  // de dónde sacar las rutas y las fotos quedarían en el bucket para
  // siempre, que es justo lo contrario de lo que pidió quien borra todo.
  const { data: withReceipts } = await supabase
    .from("transactions")
    .select("receipt_url")
    .eq("user_id", user.id)
    .not("receipt_url", "is", null);

  const { error } = await supabase.from("transactions").delete().eq("user_id", user.id);

  if (error) return { error: "Hubo un error. Volvé a intentarlo." };

  const paths = (withReceipts ?? [])
    .map((row) => row.receipt_url)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) await supabase.storage.from(RECEIPTS_BUCKET).remove(paths);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movimientos");
  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

/**
 * Manda el código de eliminación de cuenta al correo real del usuario (el
 * mismo con el que entró con Google, no uno que pueda escribir a mano).
 * Limitado a 3 pedidos cada 15 minutos para que alguien con la sesión
 * abierta no pueda spamear el envío de correos.
 */
export async function requestAccountDeletionCode() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/entrar");

  const admin = createAdminClient();

  const rateLimit = await checkRateLimit(admin, user.id, "request_deletion_code", {
    maxCalls: 3,
    windowSeconds: 900,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Esperá ${Math.ceil(rateLimit.retryAfterSeconds! / 60)} min antes de pedir otro código.`,
    };
  }

  return issueDeletionCode(admin, user.id, user.email);
}

/**
 * Verifica el código y, si es correcto, borra el usuario de auth.users —
 * todas las tablas relacionadas caen en cascada (ver migraciones 0015 y
 * 0019). Cierra la sesión después para que las cookies no queden apuntando
 * a un usuario que ya no existe.
 */
export async function confirmAccountDeletion(code: string) {
  const { supabase, user } = await requireUser();

  const admin = createAdminClient();

  const result = await verifyDeletionCode(admin, user.id, code);
  if (!result.ok) return { error: result.error };

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return { error: "No se pudo eliminar la cuenta. Intentá de nuevo." };

  await supabase.auth.signOut();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Recordatorios push
// ---------------------------------------------------------------------------

/**
 * Guarda la suscripción de ESTE navegador. Es un upsert por endpoint porque
 * el navegador puede devolver el mismo endpoint después de que el usuario
 * desactivó y volvió a activar los avisos, y ahí no hay que crear una fila
 * nueva sino actualizar las claves.
 */
export async function subscribeToPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { error: "No se pudieron activar los recordatorios." };

  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

/** Saca este navegador de la lista. Los demás dispositivos siguen igual. */
export async function unsubscribeFromPush(endpoint: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudieron desactivar los recordatorios." };

  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

export async function setRemindersEnabled(enabled: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, reminders_enabled: enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) return { error: "No se pudo guardar la preferencia." };

  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

/**
 * Manda un aviso de prueba a los dispositivos suscritos.
 *
 * Existe porque la cadena del push tiene muchas partes (permiso del
 * navegador, Service Worker, suscripción guardada, claves VAPID, el servicio
 * de push del fabricante) y la primera vez que falla es el día del
 * vencimiento, cuando ya no sirve de nada. Con esto se comprueba entera en
 * el momento de activarla.
 */
export async function sendTestReminder() {
  const { user } = await requireUser();

  const admin = createAdminClient();
  const { sent } = await sendPushToUser(admin, user.id, {
    title: "Recordatorios activados",
    body: "Así te vamos a avisar un día antes de cada gasto fijo.",
    url: "/dashboard/fijos",
    tag: "prueba",
  });

  if (sent === 0) {
    return {
      error:
        "No se pudo mandar el aviso de prueba. Revisá que los recordatorios estén activados en este dispositivo.",
    };
  }
  return { error: null };
}
