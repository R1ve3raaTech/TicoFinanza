"use client";

import type { PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { EnvelopeSimple, ForkKnife, Lightning, ShoppingCart } from "@phosphor-icons/react";

const incoming = [
  {
    id: "sinpe",
    from: "SINPE Móvil",
    subject: "Transferencia recibida",
    body: "Recibiste ₡25.000 de María Solano",
    result: {
      icon: Lightning,
      description: "María Solano",
      bank: "SINPE",
      amount: "+₡25.000",
      income: true,
    },
    emailClass: "mockup-email-0",
    resultClass: "mockup-result-0",
  },
  {
    id: "bac",
    from: "BAC Credomatic",
    subject: "Notificación de compra",
    body: "Compra por ₡8.450 en AutoMercado",
    result: {
      icon: ShoppingCart,
      description: "AutoMercado",
      bank: "BAC",
      amount: "-₡8.450",
      income: false,
    },
    emailClass: "mockup-email-1",
    resultClass: "mockup-result-1",
  },
  {
    id: "bcr",
    from: "BCR",
    subject: "Compra con tarjeta",
    body: "Pago de $12.90 en Uber Eats",
    // El correo llega en dólares (así lo manda el banco), pero el
    // movimiento registrado siempre queda en colones — TicoFinanza convierte
    // sola con el tipo de cambio del día (ver lib/exchangeRate.ts). El
    // contraste entre esta línea y el resultado de abajo es la demostración;
    // no hay que explicarlo aparte.
    result: {
      icon: ForkKnife,
      description: "Uber Eats",
      bank: "BCR",
      amount: "-₡6.500",
      income: false,
    },
    emailClass: "mockup-email-2",
    resultClass: "mockup-result-2",
  },
];

const springConfig = { stiffness: 200, damping: 20, mass: 0.5 } as const;

export function MockupPreview() {
  const reduce = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), springConfig);
  const rotateY = useSpring(useMotionValue(0), springConfig);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(offsetX * 10);
    rotateX.set(offsetY * -10);
  }

  function handlePointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div className="relative w-full max-w-md">
      <motion.div
        aria-hidden="true"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        className="relative w-full rounded-dialog border border-line-strong bg-surface/95 p-5 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
      >
        {/* Correo entrante */}
        <div className="relative h-24">
          {incoming.map((entry) => (
            <div
              key={entry.id}
              className={`absolute inset-x-0 top-0 flex items-start gap-3 rounded-surface border border-line bg-surface-raised/80 p-3.5 ${entry.emailClass}`}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-hover">
                <EnvelopeSimple size={16} weight="bold" className="text-ink-2" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-2">{entry.from}</p>
                <p className="truncate text-sm text-ink">{entry.subject}</p>
                <p className="truncate text-xs text-ink-3">{entry.body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mb-3 mt-4 text-xs font-medium text-ink-3">
          Tus movimientos
        </p>

        {/* Lista de transacciones generadas */}
        <div className="relative h-[212px]">
          <p className="mockup-placeholder absolute inset-x-0 top-0 rounded-surface border border-dashed border-line p-3 text-center text-xs text-ink-3">
            Esperando correos bancarios
          </p>
          {incoming.map((entry, i) => {
            const t = entry.result;
            const Icon = t.icon;
            return (
              <div
                key={entry.id}
                className={`absolute inset-x-0 flex items-center gap-3 rounded-surface border border-line bg-surface p-3 ${entry.resultClass}`}
                style={{ top: `${i * 70}px` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-raised">
                  <Icon size={16} weight="bold" className="text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{t.description}</p>
                  <p className="text-xs text-ink-3">{t.bank}</p>
                </div>
                <span
                  className={`money text-sm ${
                    t.income ? "text-income" : "text-ink-2"
                  }`}
                >
                  {t.amount}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
