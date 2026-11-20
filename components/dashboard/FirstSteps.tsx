"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { CaretDown, Check, Plus } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { AddFixedExpenseButton } from "@/components/fixed/FixedExpenseEntry";
import { AddMovementButton } from "@/components/movements/MovementEntry";
import { Button, buttonClass } from "@/components/ui/Button";

interface Step {
  title: string;
  body: string;
  done: boolean;
  action: (primary: boolean) => ReactNode;
}

/**
 * Los cinco pasos que dejan la app funcionando, con el estado real de la
 * cuenta.
 *
 * Reemplaza al "Empezá por acá" de antes, que eran dos tarjetas fijas: no
 * sabían qué habías hecho ya, así que seguían diciendo "cargá tus gastos
 * fijos" cuando ya los habías cargado. Acá cada paso se tacha solo, y el
 * botón celeste está únicamente en el siguiente que falta — que además es
 * cómo se respeta la regla de una sola acción primaria por pantalla.
 *
 * **Los cinco se pueden terminar, y eso es lo que decide cuáles entran.**
 * Eran tres porque presupuestos y metas son opcionales y, en la lista, el
 * panel no desaparecería nunca para quien no los usa. Los dos que se
 * agregaron no tienen ese problema: el ingreso fijo y el primer tope son
 * configuración de una vez, como los gastos fijos. Una meta de ahorro
 * sigue afuera por la misma razón de antes.
 *
 * El ingreso fijo además completa el saldo proyectado del resumen: sin él
 * la app sabe lo que vas a pagar pero no lo que va a entrar, y la
 * proyección queda a medias.
 */
export function FirstSteps({
  hasAccount,
  hasFixed,
  hasMovement,
  hasFixedIncome,
  hasBudget,
}: {
  hasAccount: boolean;
  hasFixed: boolean;
  hasMovement: boolean;
  hasFixedIncome: boolean;
  hasBudget: boolean;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const listId = useId();
  const reduce = useReducedMotion();
  // Abierto de entrada: quien todavía tiene pasos pendientes necesita
  // verlos. Lo que el desplegable resuelve es poder sacarlos de en medio
  // cuando ya sabés qué falta y querés mirar el resto del resumen.
  const [open, setOpen] = useState(true);

  const steps: Step[] = [
    {
      title: "Creá una cuenta",
      body: "Una por cada lugar donde tenés plata: efectivo, la cuenta del banco, la tarjeta. Cada movimiento va a saber de dónde salió.",
      done: hasAccount,
      action: (primary) => (
        <Button
          variant={primary ? "primary" : "secondary"}
          size="sm"
          onClick={() => setAccountOpen(true)}
        >
          <Plus size={14} weight="bold" />
          Nueva cuenta
        </Button>
      ),
    },
    {
      title: "Cargá tus gastos fijos",
      body: "Alquiler, agua, luz, internet, gimnasio, suscripciones. Con su día de cobro, para que la app te avise cuál vence primero.",
      done: hasFixed,
      action: (primary) => <AddFixedExpenseButton variant={primary ? "primary" : "secondary"} />,
    },
    {
      title: "Anotá un ingreso o un gasto",
      body: "El salario, lo del freelance, el súper, la gasolina. Con su categoría, para ver después en qué se te va la plata.",
      done: hasMovement,
      action: (primary) => <AddMovementButton variant={primary ? "primary" : "secondary"} />,
    },
    {
      title: "Cargá tu ingreso fijo",
      body: "El salario o la quincena, con el día en que entra. Con esto el resumen puede decirte cómo vas a cerrar el mes, no solo cómo venís.",
      done: hasFixedIncome,
      action: (primary) => (
        <Link
          href="/dashboard/fijos?ver=ingresos"
          className={buttonClass({ variant: primary ? "primary" : "secondary", size: "sm" })}
        >
          <Plus size={14} weight="bold" />
          Nuevo ingreso
        </Link>
      ),
    },
    {
      title: "Poné un tope",
      body: "Un límite mensual a la categoría que se te va de las manos. La app lo compara con lo que llevás gastado y te avisa antes de pasarte.",
      done: hasBudget,
      action: (primary) => (
        <Link
          href="/dashboard/plan"
          className={buttonClass({ variant: primary ? "primary" : "secondary", size: "sm" })}
        >
          <Plus size={14} weight="bold" />
          Nuevo tope
        </Link>
      ),
    },
  ];

  const pending = steps.filter((step) => !step.done).length;
  if (pending === 0) return null;

  const nextIndex = steps.findIndex((step) => !step.done);
  const done = steps.length - pending;

  return (
    <section aria-labelledby="primeros-pasos-titulo" className="mt-8 border-t border-line pt-8">
      {/* Todo el encabezado es el disparador, no una flecha chiquita al
          lado: el blanco de un dedo es la fila entera. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-control px-2 py-1 text-left transition-colors duration-150 hover:bg-surface-hover/60"
      >
        <h2 id="primeros-pasos-titulo" className="flex items-center gap-2 text-heading text-ink">
          Empezá por acá
          <CaretDown
            size={14}
            weight="bold"
            aria-hidden
            className={`shrink-0 text-ink-3 transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </h2>
        <span className="money text-meta text-ink-3">
          {done} de {steps.length} listos
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={listId}
            // `height: auto` animado por framer: mide el contenido y lo
            // despliega. El `overflow-hidden` es lo que hace que se vea
            // deslizar en vez de aparecer de golpe.
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
      <ol className="mt-5 border-t border-line">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 border-b border-line py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4"
          >
            {/* El número dice el orden y el tilde dice que ya está: el
                estado nunca depende solo del color. */}
            <span
              aria-hidden
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-micro font-semibold ${
                step.done
                  ? "border-income/40 bg-income/10 text-income"
                  : "border-line-strong text-ink-3"
              }`}
            >
              {step.done ? <Check size={12} weight="bold" /> : index + 1}
            </span>

            <div className="min-w-0">
              <p className={`text-label ${step.done ? "text-ink-3 line-through" : "text-ink"}`}>
                {step.title}
              </p>
              {!step.done && (
                <p className="mt-1 max-w-[58ch] text-meta leading-relaxed text-ink-3">
                  {step.body}
                </p>
              )}
            </div>

            {!step.done && (
              <div className="col-start-2 sm:col-start-3 sm:pt-0.5">
                {step.action(index === nextIndex)}
              </div>
            )}
          </li>
        ))}
      </ol>
          </motion.div>
        )}
      </AnimatePresence>

      <AccountDialog
        key={`cuenta-${accountOpen}`}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        account={null}
      />
    </section>
  );
}
