"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { MoneyDisplay } from "./Money";

/** Cuánto dura el conteo. Corto: es el número que uno viene a leer. */
const DURATION_MS = 650;

/** Suave al final, para que no frene de golpe en la última cifra. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * El saldo, contando hacia arriba la primera vez que se dibuja la pantalla.
 *
 * **Una sola vez y nunca en bucle.** Es la regla de todo el movimiento de la
 * app: responde a algo que la persona hizo —abrir el resumen— y después se
 * queda quieto. Con `prefers-reduced-motion` no cuenta nada y el número
 * aparece directo.
 *
 * **Todo el estado cambia dentro del cuadro de animación, nunca en el cuerpo
 * del efecto.** Dos razones que se tocan: el primer render —el del servidor y
 * el primero del navegador— tiene que dar exactamente lo mismo, o es un error
 * de hidratación; y cambiar estado durante el propio efecto es lo que marca
 * el compilador de React. Como el primer cuadro corre después de pintar, para
 * entonces ya se hidrató y el cero no se ve: el contenedor todavía está en
 * opacidad cero por la entrada (`rise-in`).
 *
 * Las cifras van de **ancho fijo** mientras cuenta: con dígitos
 * proporcionales el número cambia de largo en cada cuadro y el saldo entero
 * se sacude de lado. Al terminar vuelve a las proporcionales, que es como
 * tiene que verse una cifra suelta de este tamaño (ver MoneyDisplay).
 */
export function MoneyCountUp({ value, className = "" }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    // Sin movimiento, nada que animar: `shown` ya es el valor final.
    if (reduce) return;

    let frame = 0;
    let start: number | null = null;

    function step(now: number) {
      if (start === null) {
        start = now;
        setCounting(true);
      }
      const t = Math.min((now - start) / DURATION_MS, 1);
      setShown(Math.round(value * easeOut(t)));
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      setCounting(false);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return <MoneyDisplay value={shown} className={`${counting ? "money " : ""}${className}`} />;
}
