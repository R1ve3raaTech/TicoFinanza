"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { issueEmailCode, verifyEmailCode } from "@/lib/emailCodes";
import { sendToAllDevices } from "@/lib/push/send";
import { categoryClash } from "@/lib/categories";
import { isCategoryTone } from "@/lib/categoryStyle";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";
import { isValidPin, parseLockWhen, weakensLock, type AppLockWhen } from "@/lib/appLock";
import { hashPin, verifyPin } from "@/lib/pin";
import { isSymbolName } from "@/lib/materialSymbols";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import type { Theme, TransactionType } from "@/lib/types";
import { GENERIC_ERROR, logFailure } from "@/lib/errors";

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

  if (error) return { error: GENERIC_ERROR };
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

export async function updateTheme(theme: Theme) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, theme, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) return { error: GENERIC_ERROR };
  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

/**
 * Marcar la guía de bienvenida como vista.
 *
 * Es `upsert` y no `update` porque la fila de ajustes puede no existir
 * todavía: alguien que se acaba de registrar y no tocó el tema ni los
 * recordatorios no tiene ninguna.
 *
 * Si falla no devuelve error a la pantalla: lo peor que pasa es que la
 * guía vuelva a salir la próxima vez, y eso es mejor que dejar a alguien
 * atrapado en un diálogo que no se puede cerrar por un fallo de red. El
 * motivo queda en el registro del servidor.
 */
export async function markOnboardingSeen() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, onboarding_seen: true, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) logFailure("markOnboardingSeen", error);
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

export async function addCategory(name: string, type: TransactionType) {
  const { supabase, user } = await requireUser();

  const trimmed = name.trim();

  // Las que ya tiene, para no dejar entrar la misma escrita distinto. El
  // índice único de la tabla compara el texto tal cual, así que sin esto
  // "Ferretería" y "ferreteria" conviven y quedan dos chips que dicen lo
  // mismo en cada formulario.
  const { data: mine } = await supabase
    .from("user_categories")
    .select("name")
    .eq("user_id", user.id)
    .eq("type", type);

  const clash = categoryClash(trimmed, type, (mine ?? []).map((c) => c.name));
  if (clash) return { error: clash, name: null };

  const { error } = await supabase
    .from("user_categories")
    .insert({ user_id: user.id, name: trimmed, type });

  if (error) {
    return {
      error: error.code === "23505" ? "Esa categoría ya existe." : GENERIC_ERROR,
      name: null,
    };
  }
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/movimientos");
  revalidatePath("/dashboard/fijos");
  // El resumen y Plan también tienen formularios con el selector de
  // categorías: sin esto, una categoría creada desde el resumen no aparecía
  // ahí hasta la siguiente carga completa.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/plan");
  return { error: null, name: trimmed };
}

/**
 * Cambiarle el nombre, el ícono o el color a una categoría propia.
 *
 * `icon` y `color` son columnas de la migración 0025 y aceptan null, que
 * quiere decir "elegí vos por mí": la app vuelve a decidir sola (ver
 * lib/categoryStyle.ts). **Si la migración no se corrió, esta acción falla
 * y el resto de la app sigue funcionando igual**: nada más lee esas
 * columnas sin tolerar que falten.
 */
export async function updateCategory(
  id: string,
  input: { name: string; icon: string | null; color: string | null }
) {
  const { supabase, user } = await requireUser();

  const trimmed = input.name.trim();

  const { data: current } = await supabase
    .from("user_categories")
    .select("name, type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!current) return { error: GENERIC_ERROR };

  // Las demás del mismo tipo, sin contar esta: renombrar a lo que ya se
  // llama no es un choque consigo misma.
  const { data: others } = await supabase
    .from("user_categories")
    .select("name")
    .eq("user_id", user.id)
    .eq("type", current.type)
    .neq("id", id);

  const clash = categoryClash(trimmed, current.type, (others ?? []).map((c) => c.name));
  if (clash) return { error: clash };

  if (input.icon && !isSymbolName(input.icon)) return { error: GENERIC_ERROR };
  if (input.color && !isCategoryTone(input.color)) return { error: GENERIC_ERROR };

  // Se pide la fila escrita de vuelta a propósito. **Un UPDATE que no
  // alcanza ninguna fila no es un error**: PostgREST contesta sin error y
  // sin datos, así que sin este `.select()` la acción devolvía éxito y la
  // app decía "guardada" sin haber guardado nada. Fue exactamente lo que
  // pasó: `user_categories` se creó en la 0005 sin política de UPDATE
  // (arreglado en la 0027), y RLS hacía que el UPDATE no tocara ninguna
  // fila en silencio. Una acción no debe afirmar que guardó sin prueba.
  const { data: saved, error } = await supabase
    .from("user_categories")
    .update({ name: trimmed, icon: input.icon, color: input.color })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    // El motivo de verdad va al registro del servidor y no a la pantalla:
    // "falta correr la migración 0025" o un código de PostgREST no le dicen
    // nada a quien está usando la app, y acá sí se pueden leer.
    logFailure(
      isMissingColumnError(error) ? "updateCategory: falta una columna (migración sin correr)" : "updateCategory",
      error
    );
    return { error: GENERIC_ERROR };
  }

  if (!saved) {
    // La fila existe (se leyó más arriba, con la política de SELECT) y el
    // UPDATE no tocó nada: lo que falta es el permiso de escritura.
    logFailure("updateCategory: 0 filas afectadas (falta la política de UPDATE, migración 0027)", { id });
    return { error: "No se guardó: a la tabla de categorías le falta el permiso de edición." };
  }

  // Los movimientos guardan la categoría como texto, así que renombrarla no
  // los arrastra: lo que ya estaba anotado conserva el nombre viejo. Se
  // revalidan todas las pantallas igual, porque el color y el ícono sí se
  // ven en todas.
  for (const path of ["/dashboard", "/dashboard/ajustes", "/dashboard/movimientos", "/dashboard/fijos", "/dashboard/plan"]) {
    revalidatePath(path);
  }
  return { error: null };
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();

  // Igual que en updateCategory: se pide la fila de vuelta para no decir
  // "eliminada" cuando no se eliminó nada.
  const { data: removed, error } = await supabase
    .from("user_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !removed) {
    logFailure("deleteCategory", error ?? { id, filas: 0 });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/movimientos");
  revalidatePath("/dashboard/fijos");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/plan");
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

  if (error) return { error: GENERIC_ERROR };

  const paths = (withReceipts ?? [])
    .map((row) => row.receipt_url)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) await supabase.storage.from(RECEIPTS_BUCKET).remove(paths);

  revalidatePath("/dashboard", "layout");
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

  return issueEmailCode(admin, user.id, user.email);
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

  const result = await verifyEmailCode(admin, user.id, code);
  if (!result.ok) return { error: result.error };

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return { error: GENERIC_ERROR };

  await supabase.auth.signOut();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Notificaciones push
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

  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

/**
 * Guarda el token de Firebase de ESTE Android.
 *
 * **Upsert por token, no por usuario.** Google le da el mismo token a un
 * teléfono aunque cambie la cuenta que usa la app: sin reasignarlo, los
 * recordatorios de la cuenta nueva le seguirían llegando a la vieja — o
 * sea, a nadie.
 *
 * `last_seen_at` se refresca en cada registro. No se usa todavía; está
 * para poder distinguir un teléfono que dejó de abrirse de uno que Google
 * aún no declaró muerto.
 */
export async function registerFcmToken(token: string) {
  const { supabase, user } = await requireUser();
  if (!tokenConForma(token)) return { error: GENERIC_ERROR };

  // **Primero con la sesión, que es lo que RLS puede verificar.** Alcanza
  // para el caso normal: este teléfono es nuevo, o ya estaba a nombre de
  // quien lo está registrando.
  const propio = await supabase
    .from("fcm_tokens")
    .upsert(
      { user_id: user.id, token, last_seen_at: new Date().toISOString() },
      { onConflict: "token" }
    )
    .select("id")
    .maybeSingle();

  if (propio.error && isMissingTableError(propio.error)) {
    // La 0032 puede no estar corrida todavía. Decirlo en pantalla, no
    // tragárselo: un interruptor que se prende y no manda nada es
    // indistinguible de uno que funciona.
    return { error: "A la base de datos le falta la tabla de avisos de Android." };
  }
  if (propio.data) {
    revalidatePath("/dashboard", "layout");
    return { error: null };
  }

  // Quedó sin guardar y sin error. **Eso tiene un solo significado**: la
  // fila de este token existe a nombre de otra cuenta, y la política de
  // UPDATE no deja ni verla — así que el upsert no alcanzó ninguna fila y
  // PostgREST contestó bien igual. Es el mismo fallo silencioso que ya
  // mordió con `user_categories` (ver la 0027).
  //
  // Pasa de verdad: Google le da al mismo teléfono el MISMO token aunque
  // cambie la cuenta que usa la app. Si no se reasigna, los recordatorios
  // de la cuenta vieja —con los nombres de sus gastos— seguirían llegando
  // a un aparato que ahora usa otra persona, y la nueva no recibiría nada.
  //
  // La reasignación necesita la clave de servicio, no hay otra forma. **El
  // criterio es que tener el token ES ser el aparato**: no se adivina ni
  // se enumera, y la app nunca lo muestra. El residuo, que queda dicho:
  // quien consiguiera el token de otro por fuera (un registro filtrado,
  // por ejemplo) podría llevarse sus avisos a su propia cuenta. Cerrarlo
  // del todo pediría mandarle un desafío al teléfono por FCM y que lo
  // devuelva, que es bastante maquinaria para un caso que empieza con una
  // filtración.
  const admin = createAdminClient();
  const { error } = await admin
    .from("fcm_tokens")
    .upsert(
      { user_id: user.id, token, last_seen_at: new Date().toISOString() },
      { onConflict: "token" }
    );

  if (error) {
    logFailure("registerFcmToken", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * Saca este Android de la lista. Los demás dispositivos siguen igual.
 *
 * **Va con la sesión, no con la clave de servicio.** Borrar es destructivo
 * y no tiene el caso que obliga a reasignar: una fila que figura a nombre
 * de otra cuenta se arregla sola cuando ese teléfono se vuelve a
 * registrar. Con la clave de servicio, en cambio, cualquiera con sesión y
 * con un token ajeno podría dejar a otra persona sin recordatorios, en
 * silencio y sin que ella tuviera forma de notarlo.
 */
export async function unregisterFcmToken(token: string) {
  const { supabase, user } = await requireUser();
  if (!tokenConForma(token)) return { error: GENERIC_ERROR };

  const { error } = await supabase
    .from("fcm_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * ¿Esto se parece a un token de Firebase?
 *
 * Un token es largo y opaco, así que no hay mucho que comprobar; lo que
 * esto descarta es lo que de verdad llega cuando algo salió mal — una
 * cadena vacía, un trozo de HTML de una página de error, algo con
 * espacios. La comprobación de verdad la hace Google al mandar.
 */
function tokenConForma(token: string): boolean {
  return (
    typeof token === "string" &&
    token.length >= 20 &&
    token.length <= 4096 &&
    !/\s/.test(token)
  );
}

/** Saca este navegador de la lista. Los demás dispositivos siguen igual. */
export async function unsubscribeFromPush(endpoint: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/dashboard/ajustes");
  return { error: null };
}

export async function setRemindersEnabled(enabled: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, reminders_enabled: enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) return { error: GENERIC_ERROR };

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
  const { sent, web, android } = await sendToAllDevices(admin, user.id, {
    title: "Notificaciones activadas",
    body: "Así te vamos a avisar un día antes de cada gasto fijo.",
    url: "/dashboard/fijos",
    tag: "prueba",
  });

  if (sent === 0) {
    return {
      error:
        "No se pudo mandar el aviso de prueba. Revisá que las notificaciones estén activadas en este dispositivo.",
    };
  }

  // **Por dónde salió, no solo que salió.** Con un total a secas, un
  // aviso que salió al navegador tapaba a uno que no salió al teléfono: la
  // prueba decía que todo bien y al teléfono no llegaba nada, que es
  // indistinguible de que la app esté rota.
  return { error: null, web, android };
}

// ---------------------------------------------------------------------------
// Cerrojo de la app de Android (migración 0028)
//
// Solo gobierna el APK: en la web sigue el cierre de sesión por inactividad.
// Ver lib/appMode.ts y lib/appLock.ts.
//
// **Aflojar el cerrojo cuesta el PIN actual.** Quitarlo, cambiarlo o bajar
// la exigencia se verifican contra el hash guardado antes de escribir nada.
// Sin eso había una escalada real: a quien le agarran el teléfono con la app
// ya abierta —que es justo el caso del que el cerrojo protege— le bastaba
// entrar a Ajustes y ponerlo en "Nunca" para convertir un rato de acceso
// prestado en acceso para siempre. Apretarlo no pide nada: nadie se hace
// daño poniéndose más estricto.
// ---------------------------------------------------------------------------

/** Mensaje único para todo lo que sale mal acá adentro, salvo lo corregible. */
function lockFailure(context: string, detail: unknown) {
  logFailure(context, detail);
  return { error: GENERIC_ERROR };
}

/**
 * Comprueba el PIN actual contra el hash guardado, bajo el mismo límite de
 * intentos que la pantalla de cerrojo.
 *
 * **Comparte la cuenta de intentos a propósito** (misma acción
 * `verify_app_pin`): si cada camino llevara la suya, probar PIN desde
 * Ajustes sería la forma de esquivar el límite de la pantalla de cerrojo.
 *
 * Devuelve `null` si está bien, o el objeto de error listo para devolver.
 */
async function readPinHash(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string
): Promise<{ hash: string | null } | { error: string }> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("app_lock_pin_hash")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logFailure("readPinHash", error);
    return { error: GENERIC_ERROR };
  }
  return { hash: data?.app_lock_pin_hash ?? null };
}

/** Compara contra el hash guardado, gastando un intento del límite. */
async function checkPin(
  userId: string,
  stored: string,
  pin: string,
  mismatch: string
): Promise<{ error: string } | null> {
  const admin = createAdminClient();
  const rateLimit = await checkRateLimit(admin, userId, "verify_app_pin", {
    maxCalls: 10,
    windowSeconds: 300,
  });
  if (!rateLimit.allowed) {
    return { error: `Demasiados intentos. Probá en ${Math.ceil(rateLimit.retryAfterSeconds! / 60)} min.` };
  }
  return (await verifyPin(pin, stored)) ? null : { error: mismatch };
}

/**
 * El PIN actual se exige **siempre**: en el APK y en la web.
 *
 * Una versión anterior lo pedía solo cuando el pedido venía del APK, con la
 * web como camino de recuperación. **Estaba mal y lo señaló la revisión de
 * seguridad**: el razonamiento era que falsear el identificador exige tener
 * la sesión, y quien la tiene ya puede leer todo. Pero no hace falta
 * falsear nada — a quien le agarran el teléfono desbloqueado le basta abrir
 * Chrome en ese mismo teléfono, donde la sesión de Google suele estar viva,
 * y desde ahí quitar el PIN sin que nadie se lo pida. O sea que la puerta
 * la abría exactamente el atacante del que el cerrojo protege.
 *
 * La recuperación de un PIN olvidado existe igual, pero por donde
 * corresponde: un código al correo verificado de la cuenta
 * (`requestPinResetCode` / `resetAppPinWithCode`).
 */
async function requireCurrentPin(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  pin: string | undefined
): Promise<{ error: string } | null> {
  const read = await readPinHash(supabase, userId);
  if ("error" in read) return read;

  // Sin PIN puesto no hay nada que comprobar: lo que protege ese teléfono
  // no hay cerrojo: la app abre directo.
  if (!read.hash) return null;

  if (!pin) return { error: "Escribí tu PIN actual." };
  return checkPin(userId, read.hash, pin, "El PIN actual no coincide.");
}

/**
 * Poner o cambiar el PIN de seis dígitos.
 *
 * Si ya hay uno puesto, hay que escribir el actual: cambiarlo es tan bueno
 * como quitarlo para quien quiera dejarse una puerta abierta.
 */
export async function setAppPin(pin: string, currentPin?: string) {
  const { supabase, user } = await requireUser();

  // Corregible por la persona: el mensaje dice qué arreglar.
  if (!isValidPin(pin)) return { error: "El PIN son 6 dígitos." };

  const denied = await requireCurrentPin(supabase, user.id, currentPin);
  if (denied) return denied;

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      app_lock_pin_hash: await hashPin(pin),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return lockFailure(
      isMissingColumnError(error) ? "setAppPin: falta correr la migración 0028" : "setAppPin",
      error
    );
  }
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/** Quitar el PIN. Pide el actual: es el cambio que más afloja el cerrojo. */
export async function removeAppPin(currentPin?: string) {
  const { supabase, user } = await requireUser();

  const denied = await requireCurrentPin(supabase, user.id, currentPin);
  if (denied) return denied;

  const { error } = await supabase
    .from("user_settings")
    .update({ app_lock_pin_hash: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return lockFailure("removeAppPin", error);
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * Cada cuánto se vuelve a pedir al volver a la app.
 *
 * Pide el PIN **solo si el cambio afloja** (ver `weakensLock`). Ponerse más
 * estricto no cuesta nada; si costara, el trámite empujaría a dejarlo flojo.
 */
export async function setAppLockWhen(when: AppLockWhen, currentPin?: string) {
  const { supabase, user } = await requireUser();

  // No se confía en lo que llega del navegador: un valor raro cae en el de
  // por defecto en vez de escribir algo que el check de la base rechace.
  const value = parseLockWhen(when);

  const { data: current, error: readError } = await supabase
    .from("user_settings")
    .select("app_lock_when")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError && !isMissingColumnError(readError)) {
    return lockFailure("setAppLockWhen: lectura", readError);
  }

  if (weakensLock(parseLockWhen(current?.app_lock_when), value)) {
    const denied = await requireCurrentPin(supabase, user.id, currentPin);
    if (denied) return denied;
  }

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, app_lock_when: value, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    return lockFailure(
      isMissingColumnError(error) ? "setAppLockWhen: falta correr la migración 0028" : "setAppLockWhen",
      error
    );
  }
  // **"layout" y no la ruta sola.** El cerrojo lee `app_lock_when` en el
  // layout de /dashboard, no en una página, y `revalidatePath("/dashboard")`
  // a secas no lo alcanza: se guardaba bien en la base y el cerrojo seguía
  // con el valor viejo. Y como Capacitor **no recarga la página** al volver
  // desde la lista de recientes, ese valor viejo podía durar días — el
  // síntoma fue elegir "Siempre" y que la app nunca pidiera el PIN.
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * Abrir el cerrojo con el PIN.
 *
 * **Se verifica en el servidor y no en el teléfono.** Un hash mandado al
 * navegador se prueba contra el millón de combinaciones de seis dígitos en
 * un suspiro; acá no hay nada que probar sin pasar por el límite de
 * **La contra, y es real: sin señal el PIN no se puede verificar**, así que
 * sin datos el cerrojo no se abre. Es el precio de que la comprobación no
 * viva en el teléfono, que es justo lo que la hace valer.
 *
 * Diez intentos cada cinco minutos. No bloquea la cuenta: la espera se
 * vence sola, porque dejar a alguien afuera de sus propios datos por
 * equivocarse es peor que el riesgo que evita.
 */
export async function verifyAppPin(pin: string) {
  const { supabase, user } = await requireUser();

  const read = await readPinHash(supabase, user.id);
  if ("error" in read) return { ok: false, error: read.error };

  // Acá SÍ importa que no haya PIN, al revés que en requireCurrentPin: si
  // alguien llegó a la pantalla de cerrojo sin tener uno puesto, contestar
  // "abierto" sería decir que lo verificamos cuando no verificamos nada.
  if (!read.hash) return { ok: false, error: "No tenés un PIN puesto." };

  const denied = await checkPin(user.id, read.hash, pin, "PIN incorrecto.");
  return denied ? { ok: false, error: denied.error } : { ok: true, error: null };
}

/**
 * Pedir por correo un código para quitar el PIN olvidado.
 *
 * Va al correo verificado de la cuenta —el que confirmó Google al entrar—,
 * no a uno escrito a mano. Es la única prueba de identidad que el servidor
 * puede comprobar y que no tiene a mano quien solo agarró tu teléfono
 * desbloqueado.
 */
export async function requestPinResetCode() {
  const { user } = await requireUser();
  if (!user.email) return { error: GENERIC_ERROR };

  const admin = createAdminClient();
  const rateLimit = await checkRateLimit(admin, user.id, "pin_reset_code", {
    maxCalls: 3,
    windowSeconds: 900,
  });
  if (!rateLimit.allowed) {
    return { error: `Esperá ${Math.ceil(rateLimit.retryAfterSeconds! / 60)} min antes de pedir otro código.` };
  }

  return issueEmailCode(admin, user.id, user.email, "quitar_pin");
}

/** Quitar el PIN con el código del correo. No borra ningún otro dato. */
export async function resetAppPinWithCode(code: string) {
  const { supabase, user } = await requireUser();

  const admin = createAdminClient();
  const result = await verifyEmailCode(admin, user.id, code, "quitar_pin");
  if (!result.ok) return { error: result.error };

  const { error } = await supabase
    .from("user_settings")
    .update({ app_lock_pin_hash: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return lockFailure("resetAppPinWithCode", error);
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
