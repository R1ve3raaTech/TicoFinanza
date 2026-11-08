"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { useInstallApp } from "@/components/InstallAppButton";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/Button";
import { SettingsRow } from "./SettingsSection";

/**
 * Instalar la app y cerrar sesión. En teléfono no hay menú de cuenta (la
 * barra de abajo es solo navegación), así que estas acciones viven acá.
 */
export function SessionSettings({ email }: { email?: string }) {
  const { visible, install, hint } = useInstallApp();

  return (
    <>
      {/* La fila está siempre, haya o no aviso nativo del navegador. Antes
          desaparecía entera cuando el navegador no ofrecía instalar (iOS
          siempre), y entonces no quedaba ningún lugar donde enterarse de
          que la app se puede tener con ícono propio. */}
      <SettingsRow inline label="Instalar la app">
        {visible ? (
          <Button variant="secondary" size="sm" onClick={install}>
            <DownloadSimple size={14} />
            Instalar
          </Button>
        ) : (
          <Link href="/descargar" className={buttonClass({ variant: "secondary", size: "sm" })}>
            <DownloadSimple size={14} />
            Ver cómo
          </Link>
        )}
      </SettingsRow>
      <SettingsRow
        inline
        label="Cerrar sesión"
        description={email ? `Entraste como ${email}` : undefined}
      >
        <SignOutButton />
      </SettingsRow>
      {hint}
    </>
  );
}
