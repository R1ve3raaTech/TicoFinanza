"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { hasNativeBridge } from "@/lib/nativeBridge";

/**
 * Abre la pantalla que corresponde cuando se toca un recordatorio.
 *
 * Sin esto, tocar el aviso abre la app donde la hayas dejado. Para un
 * recordatorio de un gasto fijo que vence, eso es dejar a medio camino a
 * alguien que ya decidió ir a verlo.
 *
 * **Solo vive dentro del APK.** En el navegador lo mismo lo resuelve el
 * Service Worker, en su `notificationclick`.
 */
export function AndroidPushRouter() {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!hasNativeBridge()) return;

    let vivo = true;
    const quitarTodos: (() => void)[] = [];
    let quitar: (() => void) | null = null;

    void (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const handle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (accion) => {
            const url = accion.notification.data?.url;
            // **Solo rutas de esta app.** El destino viaja dentro del
            // aviso, y un aviso es un dato que entra de afuera: sin esta
            // comprobación, una URL ajena abriría otro sitio desde adentro
            // de la app, con la sesión puesta.
            if (typeof url === "string" && /^\/(?!\/)/.test(url)) router.push(url);
            else router.push("/dashboard");
          }
        );
        if (!vivo) void handle.remove();
        else quitar = () => void handle.remove();

        // **Un aviso que llega con la app abierta, Android NO lo dibuja.**
        // Da por hecho que si ya estás adentro no hace falta interrumpirte,
        // y te lo entrega a la app en silencio.
        //
        // Eso hacía que el botón de prueba pareciera roto: el aviso salía,
        // Firebase lo entregaba, y no pasaba nada en pantalla — que es
        // exactamente lo mismo que se ve cuando no se mandó. Acá se
        // muestra, que es lo que la persona espera al apretar "Probar".
        const recibido = await PushNotifications.addListener(
          "pushNotificationReceived",
          (aviso) => {
            const texto = [aviso.title, aviso.body].filter(Boolean).join(" · ");
            if (texto) toast.success(texto);
          }
        );
        if (!vivo) void recibido.remove();
        else quitarTodos.push(() => void recibido.remove());
      } catch {
        // Si el plugin no carga, tocar el aviso abre la app igual. No es
        // razón para romper la pantalla.
      }
    })();

    return () => {
      vivo = false;
      quitar?.();
      quitarTodos.forEach((f) => f());
    };
  }, [router, toast]);

  return null;
}
