"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { subscribeToPush } from "@/app/dashboard/actions";
import { setNotificationsEnabled } from "@/app/dashboard/settings/actions";
import { useToast } from "@/components/Toast";
import { FormError } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { SettingsRow } from "./SettingsSection";

function isPushSupported() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

export function NotificationsSetting() {
  const toast = useToast();
  // El estado real es "¿este navegador tiene una suscripción push activa?",
  // no el flag guardado en la base (que es a nivel de usuario, no de
  // dispositivo) — por eso se revisa contra el Service Worker en vez de
  // confiar en el valor inicial del servidor.
  const [enabled, setEnabled] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // El soporte de push solo se puede saber en el navegador, así que no puede
  // leerse durante el primer render: si se lee, el servidor renderiza
  // "Desactivadas" (no hay `navigator`) y el cliente renderiza otra cosa, y
  // React tira un error de hidratación. Con useSyncExternalStore el primer
  // render coincide en ambos lados y el valor real entra recién después.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const supported = mounted && isPushSupported();
  // Ya sabemos qué mostrar: o el navegador no soporta push, o terminamos de
  // preguntarle al Service Worker si hay suscripción.
  const checked = mounted && (!supported || subscriptionChecked);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setEnabled(!!sub);
      })
      .finally(() => {
        if (!cancelled) setSubscriptionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  function toggle() {
    setError(null);
    const next = !enabled;
    startTransition(async () => {
      if (next) {
        try {
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
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          });
          const json = sub.toJSON();
          const result = await subscribeToPush({
            endpoint: json.endpoint!,
            keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
          });
          if (result.error) {
            setError(result.error);
            toast.error(result.error);
            return;
          }
          await setNotificationsEnabled(true);
          setEnabled(true);
          toast.success("Notificaciones activadas");
        } catch {
          const message = "No se pudieron activar las notificaciones en este dispositivo.";
          setError(message);
          toast.error(message);
        }
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
        await setNotificationsEnabled(false);
        setEnabled(false);
        toast.success("Notificaciones desactivadas");
      }
    });
  }

  const status = !checked
    ? ""
    : !supported
      ? "No disponible en este navegador"
      : enabled
        ? "Activadas"
        : "Desactivadas";

  return (
    <>
      <SettingsRow
        inline
        label="Notificaciones push"
        description="Avisos en este dispositivo cuando entra un movimiento nuevo o te pasás de un presupuesto."
      >
        <span className="text-meta text-ink-3" aria-live="polite">
          {status}
        </span>
        <Switch
          checked={enabled}
          onChange={toggle}
          disabled={pending || !supported || !checked}
          label="Notificaciones push en este dispositivo"
        />
      </SettingsRow>
      {error && (
        <div className="border-b border-line py-3">
          <FormError>{error}</FormError>
        </div>
      )}
    </>
  );
}
