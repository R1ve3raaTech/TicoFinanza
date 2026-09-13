"use client";

import { useState, useTransition } from "react";
import { ArrowsClockwise, CircleNotch } from "@phosphor-icons/react";
import { generateInsightsSummary } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { FinanceSnapshot } from "@/lib/ai/insightsSummary";

/**
 * Resumen escrito del mes. Va como una fila de informe (título a la
 * izquierda, texto a la derecha) y no como una tarjeta con degradé y
 * destellos: es un párrafo, se tiene que leer como tal.
 */
export function AiSummary({ snapshot }: { snapshot: FinanceSnapshot }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateInsightsSummary(snapshot);
      if (result.error) setError(result.error);
      setSummary(result.summary);
    });
  }

  return (
    <section
      aria-labelledby="resumen-ia-titulo"
      className="grid gap-3 border-t border-line pb-8 pt-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10"
    >
      <div>
        <h2 id="resumen-ia-titulo" className="text-heading text-ink">
          Resumen con IA
        </h2>
        <p className="mt-0.5 text-meta text-ink-3">
          Un párrafo corto sobre cómo viene tu mes, generado por Claude.
        </p>
      </div>

      <div className="min-w-0 md:pt-0.5" aria-live="polite" aria-busy={pending}>
        {pending ? (
          <p className="flex h-9 items-center gap-2 text-sm text-ink-2">
            <CircleNotch size={15} aria-hidden className="animate-spin motion-reduce:animate-none" />
            Leyendo tus números…
          </p>
        ) : summary ? (
          <>
            <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink">{summary}</p>
            <Button variant="ghost" size="sm" onClick={generate} className="-ml-2.5 mt-2">
              <ArrowsClockwise size={14} />
              Regenerar
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={generate}>
            Generar resumen
          </Button>
        )}
        {error && (
          <div className="mt-2">
            <FormError>{error}</FormError>
          </div>
        )}
      </div>
    </section>
  );
}
