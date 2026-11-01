"use client";

import { useState, type ReactNode } from "react";
import { Check, Plus } from "@phosphor-icons/react";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { AddFixedExpenseButton } from "@/components/fixed/FixedExpenseEntry";
import { AddMovementButton } from "@/components/movements/MovementEntry";
import { Button } from "@/components/ui/Button";

interface Step {
  title: string;
  body: string;
  done: boolean;
  action: (primary: boolean) => ReactNode;
}

/**
 * Los tres pasos que dejan la app funcionando, con el estado real de la
 * cuenta.
 *
 * Reemplaza al "Empezá por acá" de antes, que eran dos tarjetas fijas: no
 * sabían qué habías hecho ya, así que seguían diciendo "cargá tus gastos
 * fijos" cuando ya los habías cargado. Acá cada paso se tacha solo, y el
 * botón celeste está únicamente en el siguiente que falta — que además es
 * cómo se respeta la regla de una sola acción primaria por pantalla.
 *
 * Son tres y no cuatro a propósito: presupuestos y metas son opcionales, y
 * si estuvieran en la lista el panel no desaparecería nunca para quien no
 * los quiere usar. Esos se explican en Ajustes → Guía.
 */
export function FirstSteps({
  hasAccount,
  hasFixed,
  hasMovement,
}: {
  hasAccount: boolean;
  hasFixed: boolean;
  hasMovement: boolean;
}) {
  const [accountOpen, setAccountOpen] = useState(false);

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
  ];

  const pending = steps.filter((step) => !step.done).length;
  if (pending === 0) return null;

  const nextIndex = steps.findIndex((step) => !step.done);
  const done = steps.length - pending;

  return (
    <section aria-labelledby="primeros-pasos-titulo" className="mt-8 border-t border-line pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="primeros-pasos-titulo" className="text-heading text-ink">
          Empezá por acá
        </h2>
        <span className="money text-meta text-ink-3">
          {done} de {steps.length} listos
        </span>
      </div>
      <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">
        TicoFinanza no lee tus correos ni se conecta a tu banco: vos anotás lo que entra y lo que
        sale, y la app lleva la cuenta.
      </p>

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

      <AccountDialog
        key={`cuenta-${accountOpen}`}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        account={null}
      />
    </section>
  );
}
