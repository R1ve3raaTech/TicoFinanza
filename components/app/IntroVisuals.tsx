"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Bus,
  ForkKnife,
  House,
  GameController,
  ShoppingCart,
  CreditCard,
  Barbell,
  HandCoins,
  WifiHigh,
} from "@phosphor-icons/react";

/**
 * Las ilustraciones de la bienvenida del APK.
 *
 * **Son maquetas dibujadas acá, no capturas ni componentes de la app.** Una
 * captura envejece sola —ya pasó: la de `/entrar` mostraba el rail lateral
 * que se había eliminado— y los componentes de verdad piden contexto,
 * sesión y datos. Acá lo único que se promete es la *forma* de cada
 * pantalla, que es lo que no cambia.
 *
 * Los montos son inventados y redondos a propósito: que nadie los lea como
 * datos de alguien.
 *
 * **Por qué ocupan tanto**: la bienvenida anterior era un ícono de 64px, un
 * título y una línea flotando en el medio de la pantalla, con el alto de
 * arriba y de abajo muerto. Mostrar la pantalla de la que habla cada lámina
 * explica más que cualquier párrafo y de paso llena ese alto.
 */

/** Cada pieza entra escalonada, ya dentro de la lámina. */
const SUAVE = [0.16, 1, 0.3, 1] as const;

const pieza: Variants = {
  oculto: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.07, duration: 0.32, ease: SUAVE },
  }),
};

function Pieza({
  i,
  children,
  className = "",
}: {
  i: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div custom={i} variants={pieza} initial="oculto" animate="visible" className={className}>
      {children}
    </motion.div>
  );
}

/** El marco común: una tarjeta que se lee como un pedazo de la app. */
function Marco({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      aria-label={label}
      role="img"
      className="w-full rounded-dialog border border-line bg-surface p-4"
    >
      {children}
    </div>
  );
}

/** Lámina 1: el saldo, que es la cifra con la que abre el resumen. */
export function VisualSaldo() {
  return (
    <Marco label="Ejemplo del resumen: saldo total y el reparto del mes">
      <Pieza i={0}>
        <p className="text-micro uppercase tracking-wide text-ink-3">Saldo total</p>
        <p className="mt-1 text-display tabular-nums text-ink">₡284.500</p>
      </Pieza>

      <Pieza i={1} className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-surface bg-surface-raised px-3 py-2">
          <p className="text-micro text-ink-3">Entró este mes</p>
          <p className="mt-0.5 text-figure tabular-nums text-income">+₡450.000</p>
        </div>
        <div className="rounded-surface bg-surface-raised px-3 py-2">
          <p className="text-micro text-ink-3">Salió este mes</p>
          <p className="mt-0.5 text-figure tabular-nums text-expense">−₡165.500</p>
        </div>
      </Pieza>

      {/* El reparto del mes. Una sola serie, así que un solo tono: un
          arcoíris acá sería decoración, no dato. */}
      <Pieza i={2} className="mt-5">
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
          <span className="h-full flex-[5] rounded-l-full bg-accent" />
          <span className="h-full flex-[3] bg-accent/60" />
          <span className="h-full flex-[2] rounded-r-full bg-accent/30" />
        </div>
        <div className="mt-2 flex justify-between text-micro text-ink-3">
          <span>Fijos 50%</span>
          <span>Diario 30%</span>
          <span>Ahorro 20%</span>
        </div>
      </Pieza>
    </Marco>
  );
}

/** Lámina 2: anotar un movimiento. */
export function VisualAnotar() {
  const reduce = useReducedMotion();
  const chips = [
    { icon: ForkKnife, label: "Comida", tono: "text-cat-naranja", on: true },
    { icon: Bus, label: "Transporte", tono: "text-cat-azul", on: false },
    { icon: ShoppingCart, label: "Mercado", tono: "text-cat-verde", on: false },
  ];

  return (
    <Marco label="Ejemplo del formulario para anotar un gasto">
      <Pieza i={0}>
        <p className="text-micro text-ink-3">Descripción</p>
        <div className="mt-1 rounded-surface border border-line bg-surface-raised px-3 py-2 text-heading text-ink">
          Almuerzo
        </div>
      </Pieza>

      <Pieza i={1} className="mt-3">
        <p className="text-micro text-ink-3">Monto</p>
        <div className="mt-1 flex items-center rounded-surface border border-accent bg-surface-raised px-3 py-2">
          <span className="text-figure tabular-nums text-ink">₡3.500</span>
          {/* El cursor parpadeando dice "acá se escribe" sin una leyenda. */}
          <motion.span
            aria-hidden
            className="ml-0.5 h-5 w-px bg-accent"
            animate={reduce ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        </div>
      </Pieza>

      <Pieza i={2} className="mt-4">
        <p className="text-micro text-ink-3">Categoría</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map(({ icon: Icon, label, tono, on }) => (
            <span
              key={label}
              className={`flex items-center gap-1.5 rounded-control border px-2 py-1 text-meta ${
                on ? "border-accent bg-accent/10 text-ink" : "border-line bg-surface-raised text-ink-2"
              }`}
            >
              <Icon size={13} weight="fill" className={tono} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </Pieza>

      <Pieza i={3} className="mt-4">
        <p className="text-micro text-ink-3">De qué cuenta salió</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-surface border border-line bg-surface-raised px-3 py-2">
          <CreditCard size={15} weight="fill" className="text-ink-2" aria-hidden />
          <span className="text-meta text-ink">Tarjeta de débito</span>
          <span className="ml-auto text-meta tabular-nums text-ink-3">₡84.200</span>
        </div>
      </Pieza>
    </Marco>
  );
}

/** Lámina 3: los gastos fijos con su día de cobro. */
export function VisualFijos() {
  const filas = [
    { icon: House, label: "Alquiler", pie: "Día 1 · Pagado", monto: "₡120.000", urgente: false },
    { icon: WifiHigh, label: "Internet", pie: "Vence en 2 días", monto: "₡22.000", urgente: true },
    { icon: GameController, label: "PlayStation", pie: "Día 28 · Pendiente", monto: "₡5.900", urgente: false },
    { icon: Barbell, label: "Gimnasio", pie: "Día 30 · Pendiente", monto: "₡18.000", urgente: false },
  ];

  return (
    <Marco label="Ejemplo de la lista de gastos fijos del mes">
      {filas.map((f, i) => (
        <Pieza key={f.label} i={i} className={i > 0 ? "mt-3 border-t border-line pt-3" : ""}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-surface bg-surface-raised">
              <f.icon size={16} weight="fill" className="text-ink-2" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-heading text-ink">{f.label}</p>
              {/* El plazo corto va en rojo **y** escrito: nunca solo color. */}
              <p className={`text-micro ${f.urgente ? "text-expense" : "text-ink-3"}`}>{f.pie}</p>
            </div>
            <span className="shrink-0 text-heading tabular-nums text-ink">{f.monto}</span>
          </div>
        </Pieza>
      ))}
    </Marco>
  );
}

/** Lámina 4: un tope y una meta. */
export function VisualPlan() {
  const reduce = useReducedMotion();
  return (
    <Marco label="Ejemplo de un tope por categoría y una meta de ahorro">
      <Pieza i={0}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-heading text-ink">Comida</p>
          <p className="shrink-0 text-meta tabular-nums text-ink-2">₡48.000 de ₡60.000</p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
          <motion.span
            className="block h-full rounded-full bg-warn"
            initial={{ width: 0 }}
            animate={{ width: "80%" }}
            transition={reduce ? { duration: 0 } : { delay: 0.3, duration: 0.7, ease: SUAVE }}
          />
        </div>
        {/* Ámbar quiere decir "ya casi", y acá lo dice también con palabras. */}
        <p className="mt-1.5 text-micro text-warn">Vas al 80% del tope</p>
      </Pieza>

      <Pieza i={1} className="mt-4 border-t border-line pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-heading text-ink">Viaje de fin de año</p>
          <p className="shrink-0 text-meta tabular-nums text-ink-2">₡180.000 de ₡300.000</p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
          <motion.span
            className="block h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={reduce ? { duration: 0 } : { delay: 0.45, duration: 0.7, ease: SUAVE }}
          />
        </div>
        <p className="mt-1.5 text-micro text-ink-3">Te faltan ₡120.000</p>
      </Pieza>

      <Pieza i={2} className="mt-4 border-t border-line pt-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-surface bg-surface-raised">
            <HandCoins size={16} weight="fill" className="text-ink-2" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-heading text-ink">Mariana te debe</p>
            <p className="text-micro text-ink-3">Desde el 3 de noviembre</p>
          </div>
          <span className="shrink-0 text-heading tabular-nums text-ink">₡15.000</span>
        </div>
      </Pieza>
    </Marco>
  );
}
