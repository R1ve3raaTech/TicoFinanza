"use client";

import { useState, useTransition } from "react";
import { Check } from "@phosphor-icons/react";
import { confirmFixedPayment } from "@/app/dashboard/fijos/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { Money } from "@/components/ui/Money";
import type { FixedPaymentMatch } from "@/lib/autoPayments";

const fecha = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Costa_Rica",
});

/**
 * "¿Esto ya lo pagaste?" en el resumen.
 *
 * La app encuentra el movimiento que parece ser el pago de un gasto fijo
 * —mismo monto, misma cuenta, cerca del día de cobro— y lo propone. Un
 * toque marca el fijo como pagado y ata el movimiento, que es lo que evita
 * que ese gasto cuente dos veces (ver confirmFixedPayment).
 *
 * **Propone y no marca solo**, por la misma razón por la que los ingresos
 * fijos se confirman: un emparejamiento equivocado desarma el saldo
 * proyectado sin que nadie se entere. Acá lo peor que pasa es que digas que
 * no, y la propuesta se va sola cuando el movimiento deja de calzar.
 *
 * Solo aparece cuando hay algo que proponer. El resto del mes no ocupa
 * lugar.
 */
export function PaidFixedSuggestions({ matches }: { matches: FixedPaymentMatch[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [descartados, setDescartados] = useState<string[]>([]);

  const visibles = matches.filter((m) => !descartados.includes(m.expense.id));
  if (visibles.length === 0) return null;

  function confirmar(match: FixedPaymentMatch) {
    startTransition(async () => {
      const result = await confirmFixedPayment(match.expense.id, match.transaction.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${match.expense.name}" marcado como pagado`);
    });
  }

  return (
    <section aria-labelledby="ya-pagados-titulo" className="mt-8 min-w-0">
      <h2 id="ya-pagados-titulo" className="text-heading text-ink">
        {visibles.length === 1 ? "¿Este fijo ya lo pagaste?" : "¿Estos fijos ya los pagaste?"}
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        {visibles.length === 1
          ? "Encontramos un movimiento que calza con el cobro."
          : "Encontramos movimientos que calzan con el cobro."}
      </p>

      <ul className="mt-4 border-t border-line">
        {visibles.map((match) => (
          <li
            key={match.expense.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-3"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CategoryMark category={match.expense.category} size={30} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {match.expense.name}
                </span>
                {/* El movimiento que lo prueba, para poder decir que no con
                    criterio: sin esto hay que creerle a la app. */}
                <span className="block truncate text-meta text-ink-3">
                  {match.transaction.description || "Movimiento"} ·{" "}
                  {fecha.format(new Date(match.transaction.transaction_date))}
                </span>
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              <Money value={-match.expense.amount} className="text-sm font-medium text-ink" />
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setDescartados((list) => [...list, match.expense.id])}
              >
                No
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => confirmar(match)}
              >
                <Check size={13} weight="bold" />
                Sí, pagado
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
