/**
 * Los avisos dentro del APK, por Firebase.
 *
 * El push del navegador (Service Worker + VAPID) **no existe dentro de un
 * WebView**, así que en la app de Android los recordatorios no llegaban
 * por ningún lado. Esto es el otro camino.
 *
 * Lo que vive acá es solo la parte del teléfono: pedir el permiso,
 * conseguir el token que identifica a este aparato y mandárselo al
 * servidor. Lo que decide a quién avisar y cuándo no cambió nada: sigue en
 * el cron de `/api/reminders`.
 *
 * **La carga del plugin es perezosa** porque en la web no hay con quién
 * hablar, y eso acá no tiene el riesgo que tenía con el cerrojo —donde
 * esperar una descarga dejaba a alguien trabado afuera—: si no llega, lo
 * único que pasa es que el interruptor avisa que no se pudo.
 */

import { hasNativeBridge } from "../nativeBridge";

export type AltaAndroid =
  | { estado: "ok"; token: string }
  /** Dijo que no al permiso del sistema. */
  | { estado: "denegado" }
  /** No es el APK: acá manda el push del navegador. */
  | { estado: "no-aplica" }
  | { estado: "error"; detalle: string };

/**
 * Cuánto se espera al token.
 *
 * Firebase lo entrega por un evento, no devolviéndolo: hay que pedir el
 * registro y escuchar. Si Google no contesta —sin señal, o un
 * `google-services.json` que no corresponde— sin tope la pantalla se
 * quedaría esperando para siempre con el interruptor a medio prender.
 */
const ESPERA_TOKEN_MS = 20000;

export async function activarAvisosAndroid(): Promise<AltaAndroid> {
  if (!hasNativeBridge()) return { estado: "no-aplica" };

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let permiso = await PushNotifications.checkPermissions();
    if (permiso.receive === "prompt" || permiso.receive === "prompt-with-rationale") {
      permiso = await PushNotifications.requestPermissions();
    }
    if (permiso.receive !== "granted") return { estado: "denegado" };

    // El token llega por evento. Los dos oyentes se enganchan **antes** de
    // pedir el registro: al revés, un registro rápido podría contestar
    // antes de que haya quién escuche y el token se perdería.
    const token = await new Promise<string>((resolve, reject) => {
      const reloj = setTimeout(() => {
        void limpiar();
        reject(new Error("Firebase no devolvió el token a tiempo."));
      }, ESPERA_TOKEN_MS);

      const handles: { remove: () => Promise<void> }[] = [];
      async function limpiar() {
        clearTimeout(reloj);
        await Promise.all(handles.map((h) => h.remove().catch(() => {})));
      }

      void PushNotifications.addListener("registration", (t) => {
        void limpiar();
        resolve(t.value);
      }).then((h) => handles.push(h));

      void PushNotifications.addListener("registrationError", (e) => {
        void limpiar();
        reject(new Error(String(e?.error ?? "Firebase rechazó el registro.")));
      }).then((h) => handles.push(h));

      void PushNotifications.register().catch((e) => {
        void limpiar();
        reject(e);
      });
    });

    return { estado: "ok", token };
  } catch (error) {
    // **El motivo va a la pantalla.** Dentro del APK no hay consola a la
    // que asomarse, y un interruptor que no prende sin decir por qué no se
    // puede arreglar. Es la lección que dejaron el login con Google y el
    // cerrojo, las dos veces.
    const base = error instanceof Error ? error.message : String(error);
    return { estado: "error", detalle: base.replace(/\s+/g, " ").trim().slice(0, 160) };
  }
}

/** Da de baja este teléfono: Android deja de recibir y se olvida el token. */
export async function desactivarAvisosAndroid(): Promise<void> {
  if (!hasNativeBridge()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
    await PushNotifications.unregister();
  } catch {
    // Que no se pueda dar de baja del lado del teléfono no impide borrar
    // el token del servidor, que es lo que de verdad corta los avisos.
  }
}
