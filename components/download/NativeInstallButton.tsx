"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useInstallPrompt } from "@/components/InstallPromptProvider";
import { Button } from "@/components/ui/Button";

/**
 * Instalar con el aviso del propio navegador, cuando lo ofrece.
 *
 * Solo aparece si hay algo que ofrecer: en iOS nunca lo hay (por eso se
 * descarta `ios` acá y esa tarjeta lleva los pasos a mano), y en los demás
 * tampoco si la app ya está instalada. No se reemplaza por un botón muerto:
 * cada tarjeta ya trae las instrucciones escritas, que funcionan siempre.
 */
export function NativeInstallButton({ label }: { label: string }) {
  const { visible, ios, promptInstall } = useInstallPrompt();
  if (!visible || ios) return null;

  return (
    <Button variant="secondary" size="sm" onClick={() => void promptInstall()}>
      <DownloadSimple size={14} />
      {label}
    </Button>
  );
}
