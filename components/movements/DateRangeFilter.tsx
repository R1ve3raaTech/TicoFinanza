"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBlank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { dayLabel, PERIODS, type PeriodId } from "@/lib/dateRange";

/**
 * Período de la lista de movimientos.
 *
 * Solo escribe `?periodo=` en la URL: las fechas las resuelve el servidor en
 * hora de Costa Rica (ver resolvePeriod). Acá no se hace ninguna cuenta de
 * calendario — la versión anterior la hacía en el navegador y en UTC, así
 * que después de las 6 de la tarde "hoy" se iba al día siguiente y la lista
 * salía vacía.
 */
export function DateRangeFilter({
  active,
  basePath = "/dashboard/movimientos",
}: {
  /** El período resuelto por el servidor. */
  active: PeriodId | "personalizado";
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const [navigating, startTransition] = useTransition();

  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function go(query: string) {
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath));
  }

  function applyPeriod(id: PeriodId) {
    setShowCustom(false);
    go(id === "todo" ? "" : `periodo=${id}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    go(new URLSearchParams({ from: customFrom, to: customTo }).toString());
    setShowCustom(false);
  }

  const custom = active === "personalizado";

  const tab = (on: boolean) =>
    `inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-label transition-colors duration-150 cursor-pointer ${
      on ? "bg-surface-raised text-ink" : "font-normal text-ink-3 hover:text-ink"
    }`;

  return (
    <div aria-busy={navigating}>
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        <ul aria-label="Período" className="flex w-max items-center gap-0.5">
          {PERIODS.map((period) => (
            <li key={period.id}>
              <button
                type="button"
                aria-pressed={active === period.id}
                onClick={() => applyPeriod(period.id)}
                className={tab(active === period.id)}
              >
                {/* En teléfono la etiqueta corta, para que las seis entren
                    sin que haya que arrastrar la fila hasta el final. */}
                <span className="sm:hidden">{period.short}</span>
                <span className="hidden sm:inline">{period.label}</span>
              </button>
            </li>
          ))}
          <li className="ml-1 border-l border-line pl-1.5">
            <button
              type="button"
              aria-pressed={custom}
              aria-expanded={showCustom}
              aria-controls="rango-personalizado"
              onClick={() => setShowCustom((v) => !v)}
              className={tab(custom)}
            >
              <CalendarBlank size={14} aria-hidden />
              {custom && from && to ? `${dayLabel(from)} – ${dayLabel(to)}` : "Fechas"}
            </button>
          </li>
        </ul>
      </div>

      {showCustom && (
        <div
          id="rango-personalizado"
          className="mt-3 flex flex-wrap items-end gap-3 border-y border-line py-3"
        >
          <Field label="Desde" className="w-[10.5rem]">
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Hasta" className="w-[10.5rem]">
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Button size="field" onClick={applyCustom} disabled={!customFrom || !customTo}>
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}
