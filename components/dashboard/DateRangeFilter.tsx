"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBlank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { DATE_RANGE_PRESETS, presetRange } from "@/lib/dateRange";

const shortDate = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" });

/** "YYYY-MM-DD" a "3 sep". Mediodía local, para que ningún huso lo corra de día. */
function labelFromKey(key: string): string {
  return shortDate.format(new Date(`${key}T12:00:00`));
}

/**
 * Período del dashboard. Va pegado al saldo porque es lo que cambia: con un
 * rango puesto, el número pasa a ser el neto de esas fechas. Pestañas de
 * texto en una fila que en teléfono se desliza de costado, en vez de una
 * pastilla que partía en dos renglones.
 */
export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const hasFilter = Boolean(from && to);
  const [navigating, startTransition] = useTransition();

  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function applyRange(range: { from: string; to: string } | null) {
    const params = new URLSearchParams();
    if (range) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `/dashboard?${query}` : "/dashboard"));
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    applyRange({ from: customFrom, to: customTo });
    setShowCustom(false);
  }

  // ¿el filtro activo coincide con alguno de los presets?
  const activePreset = DATE_RANGE_PRESETS.find((p) => {
    const r = presetRange(p.days);
    return r.from === from && r.to === to;
  });

  const segments = [{ label: "Todo", days: null }, ...DATE_RANGE_PRESETS] as const;
  const activeLabel = !hasFilter ? "Todo" : (activePreset?.label ?? null);
  const customActive = hasFilter && !activePreset;

  const tab = (active: boolean) =>
    `inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-label transition-colors duration-150 cursor-pointer ${
      active ? "bg-surface-raised text-ink" : "font-normal text-ink-3 hover:text-ink"
    }`;

  return (
    <div aria-busy={navigating}>
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        <ul aria-label="Período" className="flex w-max items-center gap-0.5">
          {segments.map((s) => {
            const active = activeLabel === s.label;
            return (
              <li key={s.label}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setShowCustom(false);
                    applyRange(s.days === null ? null : presetRange(s.days));
                  }}
                  className={tab(active)}
                >
                  {s.label}
                </button>
              </li>
            );
          })}
          <li className="ml-1 border-l border-line pl-1.5">
            <button
              type="button"
              aria-pressed={customActive}
              aria-expanded={showCustom}
              aria-controls="rango-personalizado"
              onClick={() => setShowCustom((v) => !v)}
              className={tab(customActive)}
            >
              <CalendarBlank size={14} aria-hidden />
              {customActive && from && to ? `${labelFromKey(from)} – ${labelFromKey(to)}` : "Fechas"}
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
