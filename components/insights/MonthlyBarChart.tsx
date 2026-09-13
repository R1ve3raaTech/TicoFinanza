"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import type { MonthTotal } from "@/lib/insights";

type Series = "income" | "expense";

const SERIES_LABEL: Record<Series, string> = { income: "Ingresos", expense: "Gastos" };

// Clases literales por tamaño (Tailwind no ve clases armadas con variables).
const SIZES = {
  sm: { half: "h-16", axis: "top-16", bottom: "top-32", bar: "max-w-[16px]" },
  lg: { half: "h-28", axis: "top-28", bottom: "top-56", bar: "max-w-[24px]" },
} as const;

/** Redondea hacia arriba a un número "limpio" (1, 2, 2.5, 5 × 10ⁿ) para la escala. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function compact(value: number): string {
  if (value >= 1_000_000) {
    return `₡${(value / 1_000_000).toLocaleString("es-CR", { maximumFractionDigits: 1 })} M`;
  }
  if (value >= 1_000) return `₡${Math.round(value / 1_000)} mil`;
  return `₡${Math.round(value)}`;
}

/**
 * Ingresos hacia arriba y gastos hacia abajo desde una línea de cero, en vez
 * de dos barras del mismo lado. NO volver a barras agrupadas.
 *
 * El motivo no es estético: verde contra rojo es de los pares menos
 * distinguibles para alguien con deuteranopía (~1 de cada 12 hombres; el
 * validador da ΔE < 8 para cualquier par verde/rosa que conserve el
 * significado), y en barras agrupadas el color era lo *único* que separaba
 * una serie de la otra. Poniéndolas a lados opuestos, quien identifica es la
 * posición y el color pasa a ser refuerzo — junto con la leyenda y la tabla
 * para lectores de pantalla. De paso el gráfico contesta de un vistazo si el
 * mes cerró para arriba o para abajo.
 */
export function MonthlyBarChart({ data, size = "sm" }: { data: MonthTotal[]; size?: "sm" | "lg" }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<{ i: number; series: Series } | null>(null);
  const s = SIZES[size];
  const showScale = size === "lg";
  const rawMax = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  // Con escala visible, el tope es un número limpio que se puede rotular.
  const max = showScale ? niceCeil(rawMax) : rawMax;

  // Sin movimientos no hay nada que graficar: ejes y "+0k" en blanco se
  // leían como un gráfico roto.
  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <p className="text-sm text-ink-3">
        Todavía no hay movimientos en estos meses. Cuando entren, vas a ver acá lo que entró y
        lo que salió cada mes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-meta text-ink-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-chart-income" />
          {SERIES_LABEL.income}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-chart-expense" />
          {SERIES_LABEL.expense}
        </span>
      </div>

      <div className="flex">
        {showScale && (
          <div aria-hidden className="money relative w-16 shrink-0 text-micro text-ink-3">
            <span className="absolute right-3 top-0 -translate-y-1/2">{compact(max)}</span>
            <span className={`absolute right-3 ${s.axis} -translate-y-1/2`}>0</span>
            <span className={`absolute right-3 ${s.bottom} -translate-y-1/2`}>{compact(max)}</span>
          </div>
        )}

        <div className="relative flex min-w-0 flex-1 justify-between gap-2 sm:gap-3">
          {/* Líneas finas y sólidas: el tope de la escala arriba y abajo, y el
              eje de cero continuo de lado a lado (cortado por columna deja de
              leerse como eje). */}
          {showScale && (
            <>
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-line" />
              <span aria-hidden className={`pointer-events-none absolute inset-x-0 ${s.bottom} h-px bg-line`} />
            </>
          )}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 ${s.axis} z-0 h-px bg-line-strong`}
          />

          {data.map((d, i) => {
            const net = d.income - d.expense;
            const current = i === data.length - 1;
            return (
              <div key={d.monthKey} className="relative z-10 flex min-w-0 flex-1 flex-col items-center">
                {(["income", "expense"] as const).map((series) => {
                  const value = d[series];
                  const isActive = active?.i === i && active.series === series;
                  const up = series === "income";
                  const pct = value > 0 ? Math.max((value / max) * 100, 2) : 0;
                  return (
                    <div key={series} className="relative w-full">
                      {/* El área sensible cubre la mitad entera de la columna,
                          no solo la barra: apuntarle a una barra fina con el
                          dedo es imposible. */}
                      <button
                        type="button"
                        onMouseEnter={() => setActive({ i, series })}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive({ i, series })}
                        onBlur={() => setActive(null)}
                        onClick={() =>
                          setActive((cur) =>
                            cur?.i === i && cur.series === series ? null : { i, series }
                          )
                        }
                        aria-label={`${SERIES_LABEL[series]} de ${d.label}: ${formatMoney(value)}`}
                        className={`flex ${s.half} w-full cursor-pointer flex-col items-center rounded-[4px] transition-colors duration-150 hover:bg-ink/[0.04] focus-visible:outline-offset-0 ${
                          up ? "justify-end" : "justify-start"
                        }`}
                      >
                        {/* Barra angosta a propósito: pegadas unas con otras se
                            leían como un bloque de color. Punta redondeada de
                            4px, base cuadrada contra el eje. */}
                        {/* `initial` fijo (no depende de reduced motion): el
                            hook devuelve null en el servidor y true en el
                            cliente, y cambiar el estilo inicial entre los dos
                            rompía la hidratación. Solo cambia la duración. */}
                        <motion.span
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: reduce ? 0 : 0.35, ease: [0.2, 0, 0, 1] }}
                          className={`block w-full ${s.bar} transition-opacity duration-150 ${
                            up ? "rounded-t-[4px] bg-chart-income" : "rounded-b-[4px] bg-chart-expense"
                          } ${active && !isActive ? "opacity-60" : "opacity-100"}`}
                        />
                      </button>

                      {isActive && (
                        <div
                          role="tooltip"
                          className={`pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-control border border-line-strong bg-surface px-2 py-1 shadow-[0_6px_20px_-8px_rgb(0_0_0/0.3)] ${
                            up ? "bottom-full mb-1.5" : "top-full mt-1.5"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`h-0.5 w-2.5 ${up ? "bg-chart-income" : "bg-chart-expense"}`}
                          />
                          <span className="money text-label text-ink">{formatMoney(value)}</span>
                          <span className="text-micro capitalize text-ink-3">
                            {SERIES_LABEL[series].toLowerCase()} · {d.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <span
                  className={`mt-2 truncate text-micro capitalize ${
                    current ? "font-medium text-ink-2" : "text-ink-3"
                  }`}
                >
                  {d.label}
                </span>
                <span className="money text-[10px] leading-3 text-ink-3">
                  {net >= 0 ? "+" : "−"}
                  {Math.abs(Math.round(net / 1000))}k
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Los mismos datos en tabla, para lectores de pantalla y para quien no
          pueda leer el gráfico. */}
      <table className="sr-only">
        <caption>Ingresos y gastos en colones por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">{SERIES_LABEL.income}</th>
            <th scope="col">{SERIES_LABEL.expense}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.monthKey}>
              <th scope="row">{d.label}</th>
              <td>{formatMoney(d.income)}</td>
              <td>{formatMoney(d.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
