"use client";

import { useTransition } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { syncMyGmail } from "@/app/dashboard/actions";
import { useToast } from "@/components/Toast";
import { Button, type ButtonVariant } from "@/components/ui/Button";

/**
 * Lee los correos ahora mismo. El resultado va por toast (antes era un texto
 * al lado del botón que en teléfono estaba escondido: ahí no había ninguna
 * respuesta visible).
 */
export function SyncGmailButton({
  variant = "secondary",
  iconOnly = false,
}: {
  variant?: ButtonVariant;
  iconOnly?: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const result = await syncMyGmail();
      if (result.error) {
        toast.error(result.error);
      } else if (result.inserted === 0) {
        toast.success("Sin movimientos nuevos");
      } else {
        toast.success(
          `${result.inserted} movimiento${result.inserted === 1 ? "" : "s"} nuevo${
            result.inserted === 1 ? "" : "s"
          }`
        );
      }
    });
  }

  const spin = pending ? "animate-spin motion-reduce:animate-none" : "";

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="lg"
        icon
        onClick={sync}
        disabled={pending}
        aria-busy={pending}
        aria-label={pending ? "Leyendo correos" : "Leer correos ahora"}
      >
        <ArrowsClockwise size={20} className={spin} />
      </Button>
    );
  }

  return (
    <Button variant={variant} onClick={sync} disabled={pending} aria-busy={pending}>
      <ArrowsClockwise size={15} className={spin} />
      {pending ? "Leyendo..." : "Leer correos"}
    </Button>
  );
}
