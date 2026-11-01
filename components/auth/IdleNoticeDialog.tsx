"use client";

import { useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * Aviso de que la sesión se cerró sola por inactividad.
 *
 * Antes era una línea de texto debajo del botón, donde se perdía entre el
 * resto: quien vuelve a la pestaña después de un rato ve la pantalla de
 * entrada y lo primero que piensa es que la app lo echó o se rompió algo.
 * El modal lo dice de frente y explica que no se perdió nada.
 */
export function IdleNoticeDialog() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      size="sm"
      title="Cerramos tu sesión"
      footer={
        <Button variant="primary" onClick={() => setOpen(false)} data-autofocus>
          Entendido
        </Button>
      }
    >
      <div className="flex gap-3.5">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-raised text-ink-3"
        >
          <Clock size={18} />
        </span>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-2">
          <p>
            Estuviste 15 minutos sin usar la app, así que cerramos la sesión en este dispositivo.
          </p>
          <p className="text-ink-3">
            Es a propósito: evita que tus movimientos queden a la vista si dejás la pestaña abierta
            en una compu prestada. No se perdió nada — entrá de nuevo y seguís donde estabas.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
