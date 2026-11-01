"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutIdle } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  IDLE_ACTIVITY_KEY,
  idlePhase,
  mostRecentActivity,
  secondsUntilLogout,
} from "@/lib/idle";

/** Cada cuánto se revisa el reloj. No hace falta más fino para un aviso de 60s. */
const TICK_MS = 1000;

/**
 * Señales de que la persona sigue ahí. `mousemove` NO está en la lista a
 * propósito: un mouse apoyado en una mesa que tiembla mantendría la sesión
 * abierta toda la tarde.
 */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Cierra la sesión después de 15 minutos sin actividad, con un aviso un
 * minuto antes.
 *
 * Vive en el layout del área con sesión, así que corre en todas las
 * pantallas de adentro y en ninguna de afuera.
 */
export function IdleLogout() {
  const router = useRouter();
  // Arranca en 0 y lo llena el efecto: leer el reloj durante el render es
  // impuro y React lo prohíbe. El intervalo no corre hasta que hay marca.
  const lastActivity = useRef(0);
  const [warning, setWarning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const leaving = useRef(false);
  // Mientras el aviso está en pantalla la actividad suelta no cuenta: si
  // bastara mover la rueda del mouse, el aviso se cerraría solo y la
  // persona nunca sabría que estuvo a punto de perder la sesión.
  const warningRef = useRef(false);

  const markActivity = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    try {
      localStorage.setItem(IDLE_ACTIVITY_KEY, String(now));
    } catch {
      // Modo privado o almacenamiento bloqueado: la cuenta sigue andando
      // por pestaña, solo deja de compartirse entre pestañas.
    }
  }, []);

  const stayConnected = useCallback(() => {
    warningRef.current = false;
    setWarning(false);
    markActivity();
  }, [markActivity]);

  const leave = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      const result = await signOutIdle();
      router.replace(result.destination);
    } catch {
      // Si la acción no llega (sin red), igual se saca a la persona de la
      // pantalla con los datos: la sesión del servidor sigue viva, pero lo
      // que se ve en una compu ajena, no.
      router.replace("/entrar?motivo=inactividad");
    }
  }, [router]);

  useEffect(() => {
    markActivity();

    const onActivity = () => {
      if (warningRef.current) return;
      markActivity();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    // Otra pestaña anotó actividad: esta se pone al día.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== IDLE_ACTIVITY_KEY) return;
      const now = Date.now();
      const merged = mostRecentActivity(lastActivity.current, event.newValue, now);
      if (merged > lastActivity.current) {
        lastActivity.current = merged;
        warningRef.current = false;
        setWarning(false);
      }
    };
    window.addEventListener("storage", onStorage);

    const timer = setInterval(() => {
      if (lastActivity.current === 0) return;
      const now = Date.now();
      let last = lastActivity.current;
      try {
        last = mostRecentActivity(last, localStorage.getItem(IDLE_ACTIVITY_KEY), now);
      } catch {
        // Sin localStorage se usa solo la marca de esta pestaña.
      }
      lastActivity.current = last;

      const idle = now - last;
      const phase = idlePhase(idle);

      if (phase === "vencida") {
        warningRef.current = false;
        setWarning(false);
        void leave();
        return;
      }

      if (phase === "por-vencer") {
        warningRef.current = true;
        setWarning(true);
        setSeconds(secondsUntilLogout(idle));
      } else if (warningRef.current) {
        warningRef.current = false;
        setWarning(false);
      }
    }, TICK_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      window.removeEventListener("storage", onStorage);
      clearInterval(timer);
    };
  }, [markActivity, leave]);

  return (
    <Dialog
      open={warning}
      onClose={stayConnected}
      role="alertdialog"
      size="sm"
      // No se cierra con Escape ni tocando afuera: la decisión es explícita,
      // y un toque perdido no debería contar como "seguir conectado".
      dismissible={false}
      showClose={false}
      title="¿Seguís ahí?"
      description="Cerramos la sesión sola cuando nadie la usa, para que tus movimientos no queden a la vista en una compu prestada."
      footer={
        <>
          <Button variant="secondary" onClick={() => void leave()}>
            Cerrar sesión
          </Button>
          <Button variant="primary" onClick={stayConnected} data-autofocus>
            Seguir conectado
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2" aria-live="polite">
        Se cierra en{" "}
        <span className="money font-medium text-ink">
          {seconds} segundo{seconds === 1 ? "" : "s"}
        </span>
        .
      </p>
    </Dialog>
  );
}
