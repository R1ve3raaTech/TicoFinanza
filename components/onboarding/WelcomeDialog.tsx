"use client";

import { useEffect, useState, useTransition } from "react";
import { markOnboardingSeen } from "@/app/dashboard/ajustes/actions";
import { AppGuide } from "@/components/settings/AppGuide";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/** Segundos que la guía se queda en pantalla antes de poder seguir. */
const SECONDS = 10;

/**
 * La guía, una sola vez, a quien se acaba de registrar.
 *
 * **El contador de diez segundos es a propósito y es lo que la hace
 * servir.** Un diálogo que se puede cerrar al instante se cierra al
 * instante, y entonces la guía no la lee nadie y la app arranca con las
 * tres confusiones de siempre: que un gasto fijo no es un movimiento, que
 * una transferencia no es ingreso ni gasto, y que una deuda no toca las
 * cuentas hasta saldarla.
 *
 * Mientras corre el contador el diálogo **no se puede cerrar** —ni con la
 * X, ni con Escape, ni tocando afuera—, porque dejar cualquiera de las
 * tres salidas abiertas vuelve el contador un adorno. Son diez segundos y
 * una sola vez en la vida de la cuenta.
 *
 * Que ya se vio se guarda en la cuenta y no en el navegador: instalar la
 * app en otro teléfono no tiene por qué volver a frenar a quien ya la
 * leyó.
 *
 * **Sale una sola vez, al registrarse, y no hay forma de volver a abrirla.**
 * Hubo un botón "Ver la bienvenida" en Ajustes y era un enredo: la misma
 * explicación en dos puertas distintas, una de ellas con un contador de
 * diez segundos que no tenía ningún sentido para quien la abre a propósito.
 * La guía a pedido vive en Ajustes → Guía, que es su lugar.
 */
export function WelcomeDialog() {
  const [left, setLeft] = useState(SECONDS);
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // El `setState` va dentro del tick y no en el cuerpo del efecto: en el
    // cuerpo sería un cambio de estado durante el propio efecto.
    const id = setInterval(() => {
      setLeft((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const ready = left === 0;

  function done() {
    setOpen(false);
    startTransition(async () => {
      await markOnboardingSeen();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={done}
      // Hasta que el contador llegue a cero no hay salida: ni X, ni Escape,
      // ni clic afuera. Es lo que distingue "la guía" de "un cartel".
      dismissible={ready}
      size="xl"
      layer="top"
      title="Así funciona TicoFinanza"
      footer={
        <Button variant="primary" onClick={done} disabled={!ready || pending}>
          {ready ? "Empezar" : `Empezar en ${left}`}
        </Button>
      }
    >
      <AppGuide />
    </Dialog>
  );
}
