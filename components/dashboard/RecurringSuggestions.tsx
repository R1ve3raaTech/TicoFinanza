"use client";

import { useState, useTransition } from "react";
import { ArrowsClockwise, Check } from "@phosphor-icons/react";
import { confirmRecurring, stopRecurring } from "@/app/dashboard/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatAmountInput, parseAmount } from "@/lib/amount";
import { frequencyLabel, type RecurringMovement } from "@/lib/recurring";

/**
 * "¿Lo anotamos?" para los movimientos que se repiten.
 *
 * **El monto se puede cambiar antes de confirmar, y ese es el punto.** El
 * almuerzo no cuesta lo mismo todos los días; si la app lo insertara sola
 * con el monto de la plantilla, el saldo se iría separando del real un poco
 * cada día y nadie sabría por qué. Con un toque queda anotado el monto de
 * siempre; con dos, el de hoy.
 *
 * Solo se proponen **las de hoy**, nunca las de días pasados: ver
 * `dueToday` en lib/recurring.ts.
 */
export function RecurringSuggestions({
  movements,
}: {
  movements: RecurringMovement[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [ocultos, setOcultos] = useState<string[]>([]);

  const visibles = movements.filter((m) => !ocultos.includes(m.id));
  if (visibles.length === 0) return null;

  function confirmar(movement: RecurringMovement) {
    const escrito = montos[movement.id];
    const amount = escrito ? parseAmount(escrito) : movement.amount;
    startTransition(async () => {
      const result = await confirmRecurring(movement.id, amount);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOcultos((list) => [...list, movement.id]);
      toast.success(`"${movement.description}" anotado`);
    });
  }

  function dejar(movement: RecurringMovement) {
    startTransition(async () => {
      const result = await stopRecurring(movement.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOcultos((list) => [...list, movement.id]);
      toast.success("Ya no se va a proponer");
    });
  }

  return (
    <section aria-labelledby="repetidos-titulo" className="mt-8 min-w-0">
      <h2 id="repetidos-titulo" className="flex items-center gap-2 text-heading text-ink">
        <ArrowsClockwise size={16} aria-hidden className="shrink-0 text-ink-3" />
        {visibles.length === 1 ? "Lo que se repite hoy" : "Lo que se repite hoy"}
      </h2>

      <ul className="mt-4 border-t border-line">
        {visibles.map((movement) => (
          <li
            key={movement.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line py-3"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CategoryMark category={movement.category} size={30} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {movement.description}
                </span>
                <span className="block truncate text-meta text-ink-3">
                  {frequencyLabel(movement)}
                </span>
              </span>
            </span>

            {/* En teléfono las acciones bajan a su propia línea: el monto
                editable más los dos botones no entran al lado del detalle,
                y con `shrink-0` desbordaban la pantalla. */}
            <span className="flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0">
              {/* Editable: el monto de la plantilla es el de siempre, no el
                  de hoy. */}
              <MoneyInput
                value={montos[movement.id] ?? formatAmountInput(movement.amount)}
                onChange={(value) => setMontos((m) => ({ ...m, [movement.id]: value }))}
                className="w-24 sm:w-28"
                aria-label={`Monto de ${movement.description}`}
              />
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => dejar(movement)}>
                Ya no
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => confirmar(movement)}
              >
                <Check size={13} weight="bold" />
                Anotar
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
