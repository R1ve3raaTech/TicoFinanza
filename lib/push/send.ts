import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Agrupa avisos del mismo tema: el nuevo reemplaza al anterior. */
  tag?: string;
}

/**
 * Las claves VAPID se leen la primera vez que se manda un push, no al cargar
 * el módulo.
 *
 * Importa: la versión anterior las validaba arriba del archivo y eso hacía
 * fallar `npm run build` en cualquier entorno sin claves reales (el
 * `.env.local` de este proyecto trae marcadores, no valores). Así, sin
 * claves la app compila y funciona igual: lo único que no pasa es el envío.
 */
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    configured = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

interface PushResult {
  sent: number;
  /** Suscripciones que el navegador ya revocó y se borraron. */
  removed: number;
}

/**
 * Manda un push a todos los dispositivos suscritos de un usuario.
 *
 * Una suscripción que el navegador revocó (404/410) se borra: si no, cada
 * corrida del cron vuelve a intentar contra un endpoint muerto para siempre.
 * Cualquier otro error se deja pasar sin tocar la fila — un 500 del servicio
 * de push es temporal y borrar la suscripción por eso desengancharía el
 * dispositivo de alguien que sí quiere los avisos.
 */
async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  let removed = 0;

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
        removed++;
      }
    }
  }

  return { sent, removed };
}

/**
 * Manda un aviso **por los dos caminos**: el push del navegador y el de
 * Android.
 *
 * Son dispositivos distintos, no dos formas de llegar al mismo: alguien
 * puede tener la app en el teléfono y la web abierta en la compu, y las
 * dos tienen que sonar. Por eso se suman y no se elige una.
 *
 * Cada camino falla por su cuenta: si FCM está sin configurar o el
 * navegador no tiene suscripciones, el otro sale igual. Es a propósito —
 * que falte una credencial no puede dejar a alguien sin ningún aviso.
 */
interface EnvioDetallado extends PushResult {
  /** Cuántos avisos salieron por el push del navegador. */
  web: number;
  /** Cuántos salieron por Firebase, o sea a la app de Android. */
  android: number;
}

export async function sendToAllDevices(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<EnvioDetallado> {
  const { sendFcmToUser } = await import("./fcm");
  // `allSettled` y no `all`: con `all`, que uno de los dos caminos falle
  // descarta también el resultado del otro, aunque ese haya salido bien.
  const [web, android] = await Promise.allSettled([
    sendPushToUser(admin, userId, payload),
    sendFcmToUser(admin, userId, payload),
  ]);
  const cuenta = (r: PromiseSettledResult<PushResult | { sent: number; removed: number }>) =>
    r.status === "fulfilled" ? r.value : { sent: 0, removed: 0 };
  const a = cuenta(web);
  const b = cuenta(android);
  // **Se devuelve el desglose y no solo el total.** Con un solo número,
  // un aviso que salió por el navegador tapa a uno que no salió por
  // Firebase: la prueba diría que todo bien y al teléfono no llegaría
  // nada. Pasó exactamente eso.
  return {
    sent: a.sent + b.sent,
    removed: a.removed + b.removed,
    web: a.sent,
    android: b.sent,
  };
}

/**
 * ¿Hay algún camino de envío configurado?
 *
 * **Alcanza con uno.** Antes el cron se cortaba entero si faltaban las
 * claves VAPID; ahora eso dejaría sin avisos a los Android, que no las
 * usan para nada.
 */
export async function anyPushConfigured(): Promise<boolean> {
  if (ensureConfigured()) return true;
  const { fcmConfigured } = await import("./fcm");
  return fcmConfigured();
}
