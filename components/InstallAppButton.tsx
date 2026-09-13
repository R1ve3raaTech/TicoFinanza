"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useInstallPrompt } from "./InstallPromptProvider";

/**
 * Acción de instalar la PWA. El estado de "hay algo que ofrecer" vive en
 * InstallPromptProvider (montado una sola vez en el layout raíz) — acá solo
 * se lee. En iOS no hay prompt nativo, así que se abre un diálogo con las
 * instrucciones a mano.
 *
 * Se expone como hook porque quien la usa desde un menú necesita que el
 * diálogo de iOS viva fuera del menú: al cerrarse el menú se desmontaría.
 */
export function useInstallApp() {
  const { visible, ios, promptInstall } = useInstallPrompt();
  const [showIosHint, setShowIosHint] = useState(false);

  async function install() {
    if (ios) {
      setShowIosHint(true);
      return;
    }
    await promptInstall();
  }

  const hint = (
    <Dialog
      open={showIosHint}
      onClose={() => setShowIosHint(false)}
      title="Instalar en iPhone"
      size="sm"
    >
      <ol className="flex flex-col gap-3 text-sm leading-relaxed text-ink-2">
        <li className="flex gap-3">
          <span className="money w-3 shrink-0 text-ink-3">1</span>
          <span>
            Tocá <span className="font-medium text-ink">Compartir</span>, abajo en Safari.
            <span className="block text-meta text-ink-3">
              Es el cuadrado con la flecha hacia arriba.
            </span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="money w-3 shrink-0 text-ink-3">2</span>
          <span>
            Elegí{" "}
            <span className="font-medium text-ink">&ldquo;Agregar a pantalla de inicio&rdquo;</span>.
          </span>
        </li>
      </ol>
    </Dialog>
  );

  return { visible, install, hint };
}

/** No renderiza nada si el navegador no puede instalar (o ya está instalada). */
export function InstallAppButton({ variant = "icon" }: { variant?: "icon" | "button" }) {
  const { visible, install, hint } = useInstallApp();
  if (!visible) return null;

  return (
    <>
      {variant === "icon" ? (
        <Button variant="ghost" size="lg" icon onClick={install} aria-label="Instalar TicoFinanza">
          <DownloadSimple size={20} />
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={install}>
          <DownloadSimple size={14} />
          Instalar
        </Button>
      )}
      {hint}
    </>
  );
}
