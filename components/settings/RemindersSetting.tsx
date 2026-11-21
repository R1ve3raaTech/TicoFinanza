"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { BellRinging } from "@phosphor-icons/react";
import {
  registerFcmToken,
  sendTestReminder,
  setRemindersEnabled,
  subscribeToPush,
  unregisterFcmToken,
  unsubscribeFromPush,
} from "@/app/dashboard/ajustes/actions";
import { useIsApp } from "@/components/app/AppModeProvider";
import { activarAvisosAndroid, desactivarAvisosAndroid } from "@/lib/push/android";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { SettingsRow } from "./SettingsSection";

function isPushSupported() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** La clave VAPID viaja en base64url; el navegador la pide como bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

/**
 * Interruptor de las notificaciones push de gastos fijos.
 *
 * Son dos cosas a la vez y por eso el estado no sale solo de la base: el
 * flag `reminders_enabled` dice si la persona los quiere (es de la cuenta),
 * y la suscripción push dice si ESTE navegador puede recibirlos (es del
 * dispositivo). El interruptor refleja lo segundo, que es lo que el usuario
 * está mirando: activarlo en la compu no hace que lleguen al teléfono.
 */
/**
 * Dónde queda anotado el token de ESTE teléfono.
 *
 * Hace falta para poder darlo de baja: el servidor guarda los tokens de
 * todos los aparatos de la cuenta, y para borrar el de acá hay que saber
 * cuál es el de acá. Firebase no lo recuerda entre arranques.
 */
// **El mismo texto está en `lib/pageCache.ts`**, que lo borra al cerrar
// sesión. Si cambia, cambia en los dos lados.
const TOKEN_LOCAL = "tf_fcm_token";

export function RemindersSetting({ initialEnabled }: { initialEnabled: boolean }) {
  const toast = useToast();
  // **Dentro del APK el camino es otro.** El push del navegador no existe
  // en un WebView, así que ahí los avisos van por Firebase y este
  // interruptor gobierna el registro del teléfono, no una suscripción.
  const isApp = useIsApp();
  const [enabled, setEnabled] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // El soporte de push solo se sabe en el navegador, así que no puede leerse
  // durante el primer render: si se lee, el servidor renderiza una cosa y el
  // cliente otra, y React tira un error de hidratación. Con
  // useSyncExternalStore el primer render coincide en los dos lados y el
  // valor real entra recién después.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const supported = mounted && (isApp || isPushSupported());
  const checked = mounted && (!supported || isApp || subscriptionChecked);

  /**
   * El token de este teléfono, leído del almacenamiento del navegador.
   *
   * Va por `useSyncExternalStore` y no por un efecto con `setState`: el
   * primer render tiene que coincidir con el del servidor (que no tiene
   * `localStorage`), y escribir estado desde un efecto por un dato que ya
   * está ahí es justo lo que React pide no hacer.
   */
  const tokenLocal = useSyncExternalStore(
    () => () => {},
    () => window.localStorage.getItem(TOKEN_LOCAL),
    () => null
  );

  /** Lo que el interruptor muestra: en el APK manda el token guardado. */
  const activo = isApp ? Boolean(tokenLocal) : enabled;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!supported) return;
    // En el APK no hay suscripción que consultar: lo que dice si este
    // teléfono está dado de alta es el token guardado, y eso se lee abajo
    // sin pasar por el estado.
    if (isApp) return;
    let cancelled = false;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setEnabled(Boolean(sub));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSubscriptionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supported, isApp]);

  /** El alta dentro del APK: permiso de Android, token de Firebase y listo. */
  async function enableAndroid() {
    const alta = await activarAvisosAndroid();

    if (alta.estado === "denegado") {
      const message = "Necesitás aceptar el permiso de notificaciones de Android.";
      setError(message);
      toast.error(message);
      return;
    }
    if (alta.estado !== "ok") {
      // El motivo va a la pantalla: adentro del APK no hay consola.
      const message =
        alta.estado === "error"
          ? `No se pudieron activar. ${alta.detalle}`
          : "No se pudieron activar en este dispositivo.";
      setError(message);
      toast.error(message);
      return;
    }

    const result = await registerFcmToken(alta.token);
    if (result.error) {
      // Si el servidor no lo guardó, el teléfono se da de baja: dejarlo
      // registrado diría "activados" y no llegaría nunca nada.
      await desactivarAvisosAndroid();
      setError(result.error);
      toast.error(result.error);
      return;
    }

    window.localStorage.setItem(TOKEN_LOCAL, alta.token);
    await setRemindersEnabled(true);
    setEnabled(true);
    toast.success("Notificaciones activadas");
  }

  async function disableAndroid() {
    const token = window.localStorage.getItem(TOKEN_LOCAL);
    if (token) await unregisterFcmToken(token);
    window.localStorage.removeItem(TOKEN_LOCAL);
    await desactivarAvisosAndroid();
    await setRemindersEnabled(false);
    setEnabled(false);
    toast.success("Notificaciones desactivadas");
  }

  async function enable() {
    if (!publicKey) {
      const message = "Las notificaciones todavía no están configuradas en el servidor.";
      setError(message);
      toast.error(message);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      const message = "Necesitás aceptar el permiso de notificaciones del navegador.";
      setError(message);
      toast.error(message);
      return;
    }

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();

    const result = await subscribeToPush({
      endpoint: json.endpoint!,
      keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
    });
    if (result.error) {
      // La suscripción del navegador se deshace: si queda viva sin fila en
      // la base, el interruptor diría "activados" y nunca llegaría nada.
      await sub.unsubscribe();
      setError(result.error);
      toast.error(result.error);
      return;
    }

    await setRemindersEnabled(true);
    setEnabled(true);
    toast.success("Notificaciones activadas");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await unsubscribeFromPush(sub.endpoint);
      await sub.unsubscribe();
    }
    // El flag de la cuenta se apaga también: con un solo dispositivo es lo
    // que uno espera, y si hay otro suscrito lo vuelve a prender desde ahí.
    await setRemindersEnabled(false);
    setEnabled(false);
    toast.success("Notificaciones desactivadas");
  }

  function toggle() {
    setError(null);
    const next = !activo;
    startTransition(async () => {
      try {
        if (isApp) {
          if (next) await enableAndroid();
          else await disableAndroid();
        } else if (next) {
          await enable();
        } else {
          await disable();
        }
      } catch {
        const message = "No se pudieron cambiar las notificaciones en este dispositivo.";
        setError(message);
        toast.error(message);
      }
    });
  }

  function test() {
    setError(null);
    startTransition(async () => {
      const result = await sendTestReminder();
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  const status = !checked
    ? ""
    : !supported
      ? "No disponible en este navegador"
      : enabled
        ? "Activados en este dispositivo"
        : initialEnabled
          ? "Activados en otro dispositivo"
          : "Desactivados";

  return (
    <>
      {/* El bloque de Ajustes ya se llama "Notificaciones push": la fila
          solo tiene que decir de qué dispositivo habla, que es el dato que
          la gente confunde (activarlas en la compu no las manda al
          teléfono). */}
      <SettingsRow inline label="En este dispositivo">
        <span className="text-meta text-ink-3" aria-live="polite">
          {status}
        </span>
        <Switch
          checked={activo}
          onChange={toggle}
          disabled={pending || !supported || !checked}
          label="Notificaciones de gastos fijos en este dispositivo"
        />
      </SettingsRow>

      {activo && (
        <SettingsRow inline label="Probar">
          <Button variant="secondary" size="sm" onClick={test} disabled={pending}>
            <BellRinging size={14} />
            Mandar prueba
          </Button>
        </SettingsRow>
      )}

      {error && (
        <div className="border-b border-line py-3">
          <FormError>{error}</FormError>
        </div>
      )}
    </>
  );
}
