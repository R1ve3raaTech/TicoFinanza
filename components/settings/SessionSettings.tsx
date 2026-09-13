"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { useInstallApp } from "@/components/InstallAppButton";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "./SettingsSection";

/**
 * Instalar la app y cerrar sesión. En teléfono no hay menú de cuenta (la
 * barra de abajo es solo navegación), así que estas acciones viven acá.
 */
export function SessionSettings({ email }: { email?: string }) {
  const { visible, install, hint } = useInstallApp();

  return (
    <>
      {visible && (
        <SettingsRow
          inline
          label="Instalar la app"
          description="Abrí TicoFinanza desde la pantalla de inicio, como cualquier otra app."
        >
          <Button variant="secondary" size="sm" onClick={install}>
            <DownloadSimple size={14} />
            Instalar
          </Button>
        </SettingsRow>
      )}
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
