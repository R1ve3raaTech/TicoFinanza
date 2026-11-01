"use client";

import { useState } from "react";
import { Money } from "@/components/ui/Money";
import type { CalendarDay } from "@/lib/fixedExpenses";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const WEEKDAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MAX_DOTS = 3;

/**
 * Calendario del mes con los días que tienen cobros agendados.
 *
 * Mínimo a propósito: números chicos, sin cuadrícula pintada, y un punto por
 * cobro (hasta tres, después un "+n"). El punto de acento es un cobro
 * pendiente y el gris uno ya pagado, pero el color no es el único canal —
 * tocar el día abre abajo la lista con nombre, monto y estado escritos, y
 * cada celda lleva su propio `aria-label`.
 */
export function PaymentCalendar({
  days,
  label,
  total,
}: {
  days: CalendarDay[];
  /** "noviembre de 2026" */
  label: string;
  /** Cantidad de cobros del mes, para la línea de contexto. */
  total: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = days.find((d) => d.key === selected && d.charges.length > 0) ?? null;

  return (
    <section aria-labelledby="calendario-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="calendario-titulo" className="text-heading text-ink first-letter:uppercase">
          {label}
        </h2>
        <span className="text-meta text-ink-3">
          {total === 0
            ? "Sin cobros"
            : `${total} cobro${total === 1 ? "" : "s"} este mes`}
        </span>
      </div>

      <div className="border-t border-line pt-3">
        <div aria-hidden className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAYS.map((day, i) => (
            <span key={`${day}-${i}`} className="text-center text-micro text-ink-3">
              {day}
            </span>
          ))}
        </div>

        {/* Sin role="grid": esa estructura exige filas y celdas, y acá cada
            día es un botón con su propio nombre accesible. */}
        <div role="group" aria-label={`Cobros de ${label}`} className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day.key || day.day === null) {
              return <span key={`empty-${index}`} aria-hidden />;
            }

            const count = day.charges.length;
            const pending = day.charges.filter((c) => c.status === "PENDING").length;
            const weekdayName = WEEKDAY_NAMES[index % 7];
            const base =
              "relative flex h-11 flex-col items-center justify-center gap-1 rounded-control text-label transition-colors duration-150";

            if (count === 0) {
              return (
                <span
                  key={day.key}
                  aria-label={`${day.day}, ${weekdayName}, sin cobros`}
                  className={`${base} ${
                    day.isToday
                      ? "font-medium text-ink ring-1 ring-inset ring-line-strong"
                      : day.isPast
                        ? "text-ink-3/60"
                        : "text-ink-3"
                  }`}
                >
                  {day.day}
                </span>
              );
            }

            const isSelected = selected === day.key;
            return (
              <button
                key={day.key}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${day.day} de ${label}, ${count} cobro${count === 1 ? "" : "s"}${
                  pending > 0 ? `, ${pending} pendiente${pending === 1 ? "" : "s"}` : ", pagados"
                }`}
                onClick={() => setSelected(isSelected ? null : day.key)}
                className={`${base} cursor-pointer font-medium ${
                  isSelected
                    ? "bg-surface-selected text-ink ring-1 ring-inset ring-accent"
                    : "text-ink hover:bg-surface-hover"
                } ${day.isToday && !isSelected ? "ring-1 ring-inset ring-line-strong" : ""}`}
              >
                {day.day}
                <span aria-hidden className="flex items-center gap-[2px]">
                  {day.charges.slice(0, MAX_DOTS).map((charge) => (
                    <span
                      key={charge.id}
                      className={`h-[5px] w-[5px] rounded-full ${
                        charge.status === "PENDING" ? "bg-accent" : "bg-ink-3/60"
                      }`}
                    />
                  ))}
                  {count > MAX_DOTS && (
                    <span className="money text-[9px] leading-none text-ink-3">
                      +{count - MAX_DOTS}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="mt-3 border-t border-line pt-3">
          {selectedDay ? (
            <ul className="flex flex-col gap-2">
              {selectedDay.charges.map((charge) => (
                <li key={charge.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-label font-normal text-ink">
                    {charge.name}
                    <span className="ml-2 text-meta text-ink-3">
                      {charge.status === "PAID" ? "pagado" : "pendiente"}
                    </span>
                  </span>
                  <Money value={-charge.amount} className="shrink-0 text-label text-ink" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-meta text-ink-3">
              {total === 0
                ? "Los días con cobros agendados se marcan con un punto."
                : "Tocá un día marcado para ver qué se cobra."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
