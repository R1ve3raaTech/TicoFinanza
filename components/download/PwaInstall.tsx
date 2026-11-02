"use client";

import { useInstallApp } from "@/components/InstallAppButton";
import { Button } from "@/components/ui/Button";
import { DownloadSimple } from "@phosphor-icons/react";

/**
 * Instalar sin APK: la vía que sirve en iPhone y en computadora.
 *
 * A diferencia de `InstallAppButton`, acá **siempre** se muestra algo. Ese
 * botón se esconde cuando el navegador no ofrece el aviso nativo (iOS
 * siempre, y los demás cuando la app ya está instalada o el navegador
 * todavía no decidió ofrecerlo). En una página que se llama "Descargar",
 * un espacio en blanco se lee como que no hay forma de instalar, y sí la
 * hay: a mano, en dos toques.
 */
export function PwaInstall() {
  const { visible, install, hint } = useInstallApp();

  return (
    <div className="flex flex-col gap-4">
      {visible && (
        <div>
          <Button variant="secondary" onClick={install}>
            <DownloadSimple size={15} />
            Instalar en este dispositivo
          </Button>
        </div>
      )}

      <dl className="flex flex-col gap-3 text-sm leading-relaxed text-ink-2">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
          <dt className="w-28 shrink-0 text-meta text-ink-3">iPhone o iPad</dt>
          <dd>
            En Safari, tocá <span className="font-medium text-ink">Compartir</span> y elegí{" "}
            <span className="font-medium text-ink">Agregar a pantalla de inicio</span>.
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
          <dt className="w-28 shrink-0 text-meta text-ink-3">Android</dt>
          <dd>
            En Chrome, abrí el menú de los tres puntos y elegí{" "}
            <span className="font-medium text-ink">Instalar app</span>.
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
          <dt className="w-28 shrink-0 text-meta text-ink-3">Computadora</dt>
          <dd>
            Buscá el ícono de instalar en la barra de direcciones, a la derecha.
          </dd>
        </div>
      </dl>

      {hint}
    </div>
  );
}
