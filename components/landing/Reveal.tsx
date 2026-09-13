"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Entrada al hacer scroll, compartida por todas las secciones de la landing.
 *
 * `initial` NO depende de `reduce`: en el primer render del cliente (antes de
 * que el efecto de `useReducedMotion` resuelva el valor real) tiene que
 * coincidir exactamente con lo que renderizó el servidor, o React tira un
 * error de hidratación. Solo la duración cambia con reduced motion — el
 * elemento igual pasa de invisible a visible al entrar en pantalla, pero sin
 * desplazamiento ni curva de animación perceptible.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Encabezado de sección: etiqueta chica + título, mismo ritmo siempre.
 * La etiqueta va en tinta neutra, no en el acento — el celeste queda para
 * CTA, foco y links, no para decorar un rótulo.
 */
export function SectionHeading({
  label,
  title,
  body,
  centered = false,
}: {
  label: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <Reveal className={centered ? "flex flex-col items-center text-center" : undefined}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <h2 className="mt-3 max-w-[26ch] text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink md:text-3xl">
        {title}
      </h2>
      {body && (
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-ink-2 sm:text-base">{body}</p>
      )}
    </Reveal>
  );
}
