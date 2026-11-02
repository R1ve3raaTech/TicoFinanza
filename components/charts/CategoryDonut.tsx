"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { CategorySlice } from "@/lib/insights";

// Geometría del anillo. El radio y el grosor están en unidades del viewBox,
// no en píxeles: el SVG escala con el contenedor.
const SIZE = 160;
const RADIUS = 62;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Hueco entre porciones, en unidades de arco. Separa cada bloque del
// siguiente sin depender del color (2px de superficie, como el resto de los
// gráficos de la app).
const GAP = 3;

/**
 * Desglose del gasto del mes por categoría.
 *
 * Una sola rampa de celeste, de más oscuro (la categoría que más pesa) a más
 * claro, en vez de un color por categoría: verde/rojo/ámbar están reservados
 * para ingreso/gasto/alerta, y un arcoíris de seis tonos no se distingue con
 * daltonismo (los pasos de esta rampa están validados con el script de la
 * skill dataviz, en claro y en oscuro). Como el orden ES el dato —de la que
 * más gasta a la que menos— que el color siga ese orden suma información en
 * vez de gastarla.
 *
 * La leyenda es también la lista ordenada con los montos, así que la
 * identidad de cada porción nunca depende del color, y es lo que da acceso
 * con teclado al gráfico.
 */
export function CategoryDonut({ slices, total }: { slices: CategorySlice[]; total: number }) {
  const [active, setActive] = useState<string | null>(null);

  if (slices.length === 0 || total <= 0) {
    return (
      <p className="text-sm text-ink-3">
        Todavía no hay gastos este mes. Cuando registrés alguno —o agregués un gasto fijo— acá vas
        a ver en qué se te va la plata.
      </p>
    );
  }

  const activeSlice = slices.find((s) => s.label === active) ?? null;

  // Cada porción arranca donde terminó la suma de las anteriores. Se calcula
  // con un acumulado explícito en vez de mutar una variable dentro del map:
  // el render tiene que dar el mismo resultado cada vez que corre.
  const arcs = slices.map((slice, index) => {
    const length = CIRCUMFERENCE * slice.share;
    // El hueco se le saca al trazo, no al avance: así los bloques no se
    // corren de posición cuando una porción es muy chica.
    const drawn = Math.max(length - GAP, 0.5);
    return {
      slice,
      color: `var(--chart-ramp-${Math.min(index + 1, 6)})`,
      dash: `${drawn} ${CIRCUMFERENCE - drawn}`,
      offset: slices.slice(0, index).reduce((sum, s) => sum + CIRCUMFERENCE * s.share, 0),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label="Gasto del mes por categoría"
          className="-rotate-90"
        >
          {arcs.map(({ slice, color, dash, offset: dashOffset }) => (
            <circle
              key={slice.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={dash}
              strokeDashoffset={-dashOffset}
              onMouseEnter={() => setActive(slice.label)}
              onMouseLeave={() => setActive(null)}
              className={`transition-opacity duration-150 ${
                active && active !== slice.label ? "opacity-45" : "opacity-100"
              }`}
            />
          ))}
        </svg>

        {/* Centro: el total del mes, o la porción que se está señalando. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span aria-live="polite" className="max-w-full truncate text-micro text-ink-3">
            {activeSlice ? activeSlice.label : "Gasto del mes"}
          </span>
          <span className="money mt-0.5 max-w-full truncate text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">
            {formatMoney(activeSlice ? activeSlice.amount : total)}
          </span>
          {activeSlice && (
            <span className="money text-micro text-ink-3">
              {Math.round(activeSlice.share * 100)}%
            </span>
          )}
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-col">
        {arcs.map(({ slice, color }) => (
          <li key={slice.label}>
            <button
              type="button"
              onMouseEnter={() => setActive(slice.label)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(slice.label)}
              onBlur={() => setActive(null)}
              className={`-mx-2 flex w-[calc(100%+1rem)] cursor-default items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-hover/70 ${
                active === slice.label ? "bg-surface-hover/70" : ""
              }`}
            >
              <span
                aria-hidden
                style={{ background: color }}
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              />
              <span className="min-w-0 flex-1 truncate text-label font-normal text-ink-2">
                {slice.label}
              </span>
              <span className="money shrink-0 text-label text-ink">
                {formatMoney(slice.amount)}
              </span>
              {/* La variación va en tinta neutra, no en verde o rojo:
                  gastar más en una categoría no es "malo" por sí solo, y
                  pintarlo de alarma todos los meses enseña a ignorarlo. */}
              {typeof slice.changePercent === "number" && (
                <span className="money hidden w-12 shrink-0 text-right text-micro text-ink-3 sm:block">
                  {slice.changePercent > 0 ? "+" : ""}
                  {Math.round(slice.changePercent)}%
                </span>
              )}
              <span className="money w-9 shrink-0 text-right text-meta text-ink-3">
                {Math.round(slice.share * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Los mismos datos en tabla, para lectores de pantalla. */}
      <table className="sr-only">
        <caption>Gasto del mes por categoría, en colones</caption>
        <thead>
          <tr>
            <th scope="col">Categoría</th>
            <th scope="col">Monto</th>
            <th scope="col">Porcentaje</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((slice) => (
            <tr key={slice.label}>
              <th scope="row">{slice.label}</th>
              <td>{formatMoney(slice.amount)}</td>
              <td>{Math.round(slice.share * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
