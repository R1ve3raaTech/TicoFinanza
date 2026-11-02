"use client";

import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react";
import { useInstallApp } from "@/components/InstallAppButton";

/**
 * "Instalar la app" en el hero.
 *
 * Si el navegador ofrece su propio aviso de instalación, se usa ese: es un
 * toque y queda instalada ahí mismo. Si no —iOS siempre, y los navegadores
 * que todavía no lo ofrecen— lleva a /descargar, que explica el camino de
 * cada sistema y tiene el archivo de Android.
 *
 * El rótulo es el mismo en los dos casos a propósito. Cambia el elemento,
 * no lo que se lee: si el texto cambiara al hidratar, el botón principal
 * de la portada parpadearía con otra palabra delante de quien lo está
 * mirando.
 *
 * Va en secundario y no en primario: la acción principal de la portada es
 * entrar, y en esta app hay una sola acción primaria por pantalla.
 */
const CLASS =
  "inline-flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control border border-line-strong px-6 text-base font-medium text-ink transition-colors duration-150 hover:border-ink hover:bg-surface";

export function InstallCta() {
  const { visible, install, hint } = useInstallApp();

  if (visible) {
    return (
      <>
        <button type="button" onClick={install} className={`${CLASS} cursor-pointer`}>
          <DownloadSimple size={19} aria-hidden />
          Instalar la app
        </button>
        {hint}
      </>
    );
  }

  return (
    <Link href="/descargar" className={CLASS}>
      <DownloadSimple size={19} aria-hidden />
      Instalar la app
    </Link>
  );
}
