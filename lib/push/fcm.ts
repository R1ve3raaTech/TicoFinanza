import "server-only";
import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushPayload } from "./send";

/**
 * Avisos a la app de Android, por Firebase Cloud Messaging.
 *
 * ### Por qué hace falta, además del push de siempre
 *
 * Los recordatorios salían por Service Worker con VAPID, que es el push
 * del navegador. **Dentro de un WebView esa API no existe**, así que en el
 * APK no llegaba nada. FCM es el camino de Android, y es el único.
 *
 * Los dos conviven: el navegador sigue por `push_subscriptions` y la app
 * por `fcm_tokens`. Quien use las dos cosas recibe en las dos, que es lo
 * correcto — son dispositivos distintos.
 *
 * ### Sin librería de Firebase, a propósito
 *
 * El SDK de administración de Firebase son decenas de megas y arrastra
 * medio Google Cloud para lo que acá es un pedido HTTP. Lo único que de
 * verdad hay que hacer es firmar un JWT y canjearlo por un token de
 * acceso, y para eso alcanza el `crypto` que ya trae Node.
 *
 * ### La credencial
 *
 * Es la de una **cuenta de servicio** del proyecto de Firebase, no la
 * "clave del servidor" de antes: esa es de la API vieja, que Google
 * apagó. Viaja en tres variables de entorno y **la privada es un secreto
 * de verdad**: quien la tenga puede mandarle notificaciones a cualquiera
 * que tenga la app.
 */

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface Credencial {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function credencial(): Credencial | null {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  // En Vercel el salto de línea se escribe `\n`, así que llega literal y
  // hay que devolverlo a lo que es: sin esto la clave no parsea y el error
  // ("error:1E08010C") no se parece en nada a la causa.
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** ¿Está la app en condiciones de mandar avisos a Android? */
export function fcmConfigured(): boolean {
  return credencial() !== null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * El token de acceso, guardado hasta un minuto antes de vencer.
 *
 * Google los da por una hora. Pedir uno nuevo en cada aviso sería un viaje
 * de ida y vuelta extra por cada recordatorio, y el cron manda varios
 * seguidos.
 */
let cache: { token: string; vence: number } | null = null;

async function accessToken(cred: Credencial): Promise<string | null> {
  const ahora = Math.floor(Date.now() / 1000);
  if (cache && cache.vence > ahora + 60) return cache.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: cred.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: ahora,
      exp: ahora + 3600,
    })
  );

  const firma = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(cred.privateKey);
  const jwt = `${header}.${claims}.${base64url(firma)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  cache = { token: data.access_token, vence: ahora + (data.expires_in ?? 3600) };
  return data.access_token;
}

export interface FcmResult {
  sent: number;
  /** Tokens que Google ya no reconoce y se borraron. */
  removed: number;
}

/**
 * Manda un aviso a todos los Android registrados de un usuario.
 *
 * **Un token que Google rechaza por muerto se borra** (404 `UNREGISTERED`,
 * o 400 con un token mal formado): si no, cada corrida del cron volvería a
 * intentar para siempre contra un teléfono que ya no existe. Cualquier otro
 * error se deja pasar sin tocar la fila — un 500 de Google es temporal, y
 * borrar por eso desengancharía el teléfono de alguien que sí quiere los
 * avisos. Es el mismo criterio que el push del navegador.
 */
export async function sendFcmToUser(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<FcmResult> {
  const cred = credencial();
  if (!cred) return { sent: 0, removed: 0 };

  const { data: rows } = await admin
    .from("fcm_tokens")
    .select("id, token")
    .eq("user_id", userId);

  if (!rows?.length) return { sent: 0, removed: 0 };

  const token = await accessToken(cred);
  if (!token) return { sent: 0, removed: 0 };

  const url = `https://fcm.googleapis.com/v1/projects/${cred.projectId}/messages:send`;
  let sent = 0;
  let removed = 0;

  for (const row of rows) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: row.token,
          // **La notificación se arma del lado de Android y no acá.**
          // Mandando `notification`, el sistema la dibuja aunque la app
          // esté cerrada, que es justo cuando uno se olvida del recibo.
          notification: { title: payload.title, body: payload.body },
          data: {
            // Para abrir la pantalla que corresponde al tocarla.
            url: payload.url ?? "/dashboard",
          },
          android: {
            priority: "HIGH",
            notification: {
              // Agrupa avisos del mismo tema: el nuevo reemplaza al
              // anterior, igual que el `tag` del push web.
              tag: payload.tag ?? "ticofinanza",
              icon: "ic_stat_icon",
              color: "#38BDF8",
            },
          },
        },
      }),
    });

    if (res.ok) {
      sent++;
      continue;
    }

    if (await tokenMuerto(res)) {
      await admin.from("fcm_tokens").delete().eq("id", row.id);
      removed++;
    }
  }

  return { sent, removed };
}

/**
 * ¿Google dice que este token ya no sirve?
 *
 * Mira el motivo y no solo el código: un 400 puede ser un token mal
 * formado (muerto) o un mensaje mal armado (un error nuestro), y borrar el
 * teléfono de alguien por un error nuestro sería dejarlo sin avisos sin
 * que se entere.
 */
async function tokenMuerto(res: Response): Promise<boolean> {
  if (res.status === 404) return true;
  if (res.status !== 400) return false;
  try {
    const texto = await res.text();
    return /UNREGISTERED|INVALID_ARGUMENT/.test(texto) && /token/i.test(texto);
  } catch {
    return false;
  }
}
