"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { BellRinging } from "@phosphor-icons/react";
import {
  sendTestReminder,
  setRemindersEnabled,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/app/dashboard/ajustes/actions";
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
 * Interruptor de los recordatorios de gastos fijos.
 *
 * Son dos cosas a la vez y por eso el estado no sale solo de la base: el
 * flag `reminders_enabled` dice si la persona los quiere (es de la cuenta),
 * y la suscripción push dice si ESTE navegador puede recibirlos (es del
 * dispositivo). El interruptor refleja lo segundo, que es lo que el usuario
 * está mirando: activarlo en la compu no hace que lleguen al teléfono.
 */
export function RemindersSetting({ initialEnabled }: { initialEnabled: boolean }) {
  const toast = useToast();
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
  const supported = mounted && isPushSupported();
  const checked = mounted && (!supported || subscriptionChecked);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!supported) return;
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
  }, [supported]);

  async function enable() {
    if (!publicKey) {
      const message = "Los recordatorios todavía no están configurados en el servidor.";
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
    toast.success("Recordatorios activados");
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
    toast.success("Recordatorios desactivados");
  }

  function toggle() {
    setError(null);
    const next = !enabled;
    startTransition(async () => {
      try {
        if (next) await enable();
        else await disable();
      } catch {
        const message = "No se pudieron cambiar los recordatorios en este dispositivo.";
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
      <SettingsRow
        inline
        label="Recordatorios de gastos fijos"
        description="Un aviso en este dispositivo dos días antes y un día antes de cada cobro agendado."
      >
        <span className="text-meta text-ink-3" aria-live="polite">
          {status}
        </span>
        <Switch
          checked={enabled}
          onChange={toggle}
          disabled={pending || !supported || !checked}
          label="Recordatorios de gastos fijos en este dispositivo"
        />
      </SettingsRow>

      {enabled && (
        <SettingsRow
          inline
          label="Probar"
          description="Manda un aviso ahora mismo, para ver que llegue de verdad."
        >
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
