"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, labelClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { splitBill, splitMessage } from "@/lib/billSplit";
import { parseAmount } from "./MovementFields";

/**
 * Calculadora de cuenta: servicio, IVA y división entre varios.
 *
 * Existe porque el momento en que uno paga una cuenta compartida es
 * exactamente el momento en que hay que anotar el gasto, y hasta ahora
 * había que hacer la cuenta en otra app y volver. Lo que se registra es
 * **tu parte**, no el total: el resto te lo van a devolver.
 */
export function BillSplitPanel({
  onApply,
}: {
  /** Tu parte, y el texto para cobrarle al resto. */
  onApply: (yours: number, message: string) => void;
}) {
  const [base, setBase] = useState("");
  const [service, setService] = useState(true);
  const [tax, setTax] = useState(true);
  const [people, setPeople] = useState("2");
  const [copied, setCopied] = useState(false);

  const result = splitBill({
    base: parseAmount(base),
    service,
    tax,
    people: Number.parseInt(people, 10) || 1,
  });

  const message = splitMessage(result);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles no pasa nada: el texto está a la vista
      // para copiarlo a mano.
    }
  }

  const chip = (on: boolean) =>
    `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control border px-2.5 text-label transition-colors duration-150 ${
      on ? "border-accent bg-accent/10 text-ink" : "border-line-strong text-ink-3 hover:text-ink"
    }`;

  return (
    <div className="flex flex-col gap-4 rounded-surface border border-line bg-surface-raised/50 p-3.5">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
        <Field label="Consumo">
          <input
            inputMode="decimal"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="0"
            className={`${inputClass} money`}
          />
        </Field>
        <Field label="Personas">
          <input
            inputMode="numeric"
            value={people}
            onChange={(e) => setPeople(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className={`${inputClass} money`}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Recargos</span>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={service} onClick={() => setService((v) => !v)} className={chip(service)}>
            {service && <Check size={12} weight="bold" aria-hidden />}
            Servicio 10 %
          </button>
          <button type="button" aria-pressed={tax} onClick={() => setTax((v) => !v)} className={chip(tax)}>
            {tax && <Check size={12} weight="bold" aria-hidden />}
            IVA 13 %
          </button>
        </div>
      </div>

      {result.total > 0 && (
        <>
          <dl className="grid grid-cols-3 gap-3 border-y border-line py-3">
            <div className="min-w-0">
              <dt className="text-micro text-ink-3">Total</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={result.total} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-micro text-ink-3">Cada uno</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={result.perPerson} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-micro text-ink-3">Tu parte</dt>
              <dd className="money mt-0.5 text-label text-ink">
                <Money value={result.yours} />
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onApply(result.yours, message)}>
              Usar tu parte como monto
            </Button>
            {result.people > 1 && (
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar cobro"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
