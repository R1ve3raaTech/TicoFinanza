"use client";

import { useEffect } from "react";
import { APP_COOKIE } from "@/lib/appMode";
import { hasNativeBridge } from "@/lib/nativeBridge";

/**
 * Deja escrito, de forma que el servidor no pueda perderla, que esto es el
 * APK.
 *
 * El servidor decide muchas cosas con eso —el cerrojo, los avisos por
 * Firebase, si la raíz muestra la portada o la app— y lo venía sabiendo
 * por una marca en el identificador del navegador. Esa marca **se pierde
 * en los pedidos que nacen dentro del Service Worker**, que son
 * justamente los de las pantallas de adentro (ver `APP_COOKIE`).
 *
 * Acá, en cambio, la señal es el puente nativo, que es un hecho del
 * aparato y no un texto que alguien tenga que reenviar.
 *
 * **Recarga una sola vez**, y solo cuando la cookie faltaba: la pantalla
 * que se está viendo se dibujó con la respuesta equivocada, así que hay
 * que volver a pedirla. El seguro contra un bucle es la marca en
 * `sessionStorage`: si tras recargar la cookie sigue sin estar —un
 * navegador que no las acepta— no se vuelve a intentar.
 */
const YA_INTENTE = "tf_app_cookie_intento";

export function AppModeCookie() {
  useEffect(() => {
    if (!hasNativeBridge()) return;
    if (document.cookie.split("; ").some((c) => c === `${APP_COOKIE}=1`)) return;

    try {
      if (sessionStorage.getItem(YA_INTENTE)) return;
      sessionStorage.setItem(YA_INTENTE, "1");
    } catch {
      // Sin `sessionStorage` no hay seguro contra el bucle, así que no se
      // recarga: mejor quedarse en modo web que recargar sin parar.
      return;
    }

    // Un año y `lax`: es del aparato, como la de la bienvenida, y no tiene
    // nada que proteger — ver el comentario de `APP_COOKIE`.
    document.cookie = `${APP_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }, []);

  return null;
}
