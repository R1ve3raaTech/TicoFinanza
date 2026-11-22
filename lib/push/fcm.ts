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

// Escritas así para que no haya dudas de qué es un salto de verdad y qué
// es la barra y la ene escritas como texto, que es justo lo que se
// confunde al leer este archivo.
const SALTO = String.fromCharCode(10);
const CR_LF = String.fromCharCode(13) + SALTO;
const BARRA_N = String.fromCharCode(92) + "n";
const BARRA_R_N = String.fromCharCode(92) + "r" + BARRA_N;
const DOBLE = String.fromCharCode(34);
const SIMPLE = String.fromCharCode(39);
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface Credencial {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Deja la clave privada en el formato que entiende OpenSSL.
 *
 * **Esto no es exceso de cuidado: es el error que de verdad pasó.** Una
 * clave mal formada falla con "DECODER routines::unsupported", un mensaje
 * que no se parece en nada a la causa y que no dice cuál de las tres
 * formas de romperla fue:
 *
 * 1. **Comillas pegadas al valor.** En un archivo .env la clave va entre
 *    comillas; en la interfaz de Vercel NO, porque ahí el valor es el
 *    texto tal cual y las comillas quedan adentro.
 * 2. **Saltos de línea escritos como texto**, que es como viajan en un
 *    .env y como quedan al copiar el campo del JSON de la cuenta de
 *    servicio.
 * 3. **La clave entera en una sola línea**, sin ningún salto: pasa al
 *    copiarla de un editor que la desarma. El cuerpo en base64 tiene que
 *    ir cortado cada 64 caracteres.
 *
 * Las tres se arreglan solas acá. Pedirle a alguien que pegue un PEM a
 * mano sin equivocarse es pedirle que haga de intérprete de un formato.
 */
export function normalizarClave(bruta: string): string {
  let clave = bruta.trim();

  // 1. Comillas que envuelven todo el valor.
  const primera = clave[0];
  if ((primera === DOBLE || primera === SIMPLE) && clave.endsWith(primera)) {
    clave = clave.slice(1, -1);
  }

  // 2. Saltos escritos como texto, y saltos de Windows.
  clave = clave.split(BARRA_R_N).join(SALTO).split(BARRA_N).join(SALTO);
  clave = clave.split(CR_LF).join(SALTO).trim();

  // 3. Todo en una línea: se reconstruye el PEM.
  if (!clave.includes(SALTO)) {
    const m = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END [A-Z ]+-----/.exec(clave);
    if (m) {
      const cuerpo = m[2].replace(/[^A-Za-z0-9+/=]/g, "");
      const lineas = cuerpo.match(/.{1,64}/g) ?? [];
      clave =
        "-----BEGIN " + m[1] + "-----" + SALTO +
        lineas.join(SALTO) + SALTO +
        "-----END " + m[1] + "-----" + SALTO;
    }
  }

  // OpenSSL quiere el salto final.
  if (!clave.endsWith(SALTO)) clave += SALTO;
  return clave;
}

function credencial(): Credencial | null {
  const projectId = process.env.FCM_PROJECT_ID?.trim();
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
  const bruta = process.env.FCM_PRIVATE_KEY;

  if (!projectId || !clientEmail || !bruta) return null;
  return { projectId, clientEmail, privateKey: normalizarClave(bruta) };
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

  // **Firmar puede tirar**, y lo hizo: una clave privada mal pegada
  // revienta acá con "DECODER routines::unsupported". Sin este `try`, esa
  // excepción subía hasta la pantalla y tumbaba la acción entera — el
  // botón de prueba terminaba en la pantalla de error de la app, y el
  // aviso del navegador, que no tiene nada que ver, tampoco salía.
  let jwt: string;
  try {
    const firma = createSign("RSA-SHA256")
      .update(`${header}.${claims}`)
      .sign(cred.privateKey);
    jwt = `${header}.${claims}.${base64url(firma)}`;
  } catch (error) {
    console.error("[TicoFinanza] FCM_PRIVATE_KEY no se pudo leer", error);
    return null;
  }

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

interface FcmResult {
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
  try {
    return await enviar(admin, userId, payload);
  } catch (error) {
    // **Un camino de envío no puede tumbar al otro.** Lo que llama a esto
    // manda también por el push del navegador, y el cron recorre a varias
    // personas: una credencial rota o un fallo de red de Google tienen que
    // quedarse acá adentro. El motivo va al registro del servidor.
    console.error("[TicoFinanza] no se pudo mandar por FCM", error);
    return { sent: 0, removed: 0 };
  }
}

async function enviar(
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
