"use client";

import { useEffect, useState } from "react";
import { CloudSlash } from "@phosphor-icons/react";

/** Algo chico que siempre está y no es una pantalla. */
const PROBE_URL = "/manifest.webmanifest";

/**
 * ¿Se llega al servidor ahora mismo?
 *
 * `navigator.onLine` solo no alcanza: dice si hay una red conectada, no si
 * esa red llega a algún lado, y se lo vio reportar "con señal" con la red
 * cortada justo después de navegar. Como de esto depende que se avise que
 * los datos son viejos, se prueba de verdad.
 */
async function canReachServer(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    await fetch(PROBE_URL, { cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Avisa que lo que estás viendo no es de ahora.
 *
 * Sin esto, el caché de pantallas sería una trampa: la app abriría sin
 * señal mostrando saldos viejos con la misma cara de siempre, y no hay
 * forma peor de perder la confianza en una app de plata. Si no se puede
 * decir de cuándo son los datos, es mejor no mostrarlos.
 *
 * `renderedAt` lo arma el servidor al generar la pantalla y queda escrito
 * en el HTML. Cuando ese HTML sale del caché, el texto dice la hora en que
 * se generó — que es exactamente la antigüedad de lo que estás viendo.
 * Calcularlo en el navegador daría la hora de ahora, que es justo la
 * mentira que hay que evitar.
 */
export function OfflineBanner({ renderedAt }: { renderedAt: string }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    // El estado se toca dentro de la promesa y no en el cuerpo del efecto:
    // comprobar la red es hablar con un sistema de afuera, y la respuesta
    // llega después.
    const check = () => {
      void canReachServer().then((ok) => {
        if (alive) setOffline(!ok);
      });
    };

    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    // Volver a la pestaña es el momento típico en que la señal cambió sin
    // que llegara ningún evento.
    document.addEventListener("visibilitychange", check);

    return () => {
      alive = false;
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-b border-line bg-surface-raised px-4 py-2 text-center text-meta text-ink-2"
    >
      <span className="flex items-center gap-1.5 font-medium text-ink">
        <CloudSlash size={13} aria-hidden />
        Sin conexión
      </span>
      {/* Guion y no punto: la hora en español ya termina en punto
          ("10:30 a. m."), y seguirla con otro da "a. m..". */}
      <span>Esto es lo que se cargó el {renderedAt} — puede haber cambiado.</span>
    </div>
  );
}
