import { Money, MoneyDisplay } from "@/components/ui/Money";
import type { Aguinaldo } from "@/lib/aguinaldo";

const monthFormat = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function longDate(dayKey: string): string {
  return monthFormat.format(new Date(`${dayKey}T12:00:00Z`));
}

/**
 * Aguinaldo: cuánto va juntando el décimo tercer mes.
 *
 * El dato que la gente no tiene a mano no es la fórmula sino la ventana:
 * se cuenta de diciembre a noviembre, no por año calendario. Por eso la
 * ventana va escrita con fechas y no solo nombrada.
 *
 * Es un servidor componente: son puras cuentas sobre datos que ya vienen
 * resueltos, no hay nada que tocar.
 */
export function AguinaldoPanel({ data }: { data: Aguinaldo }) {
  const { accrued, estimate, projected, monthsRecorded, monthsElapsed, months, year } = data;
  const empty = monthsRecorded === 0;
  // Nombrados y no solo contados: la tira de doce celdas se lee con el
  // puntero encima, que en teléfono no existe. El dato que sirve es cuál
  // mes falta, para ir a anotarlo.
  const missing = months
    .filter((month) => month.closed && month.amount === 0)
    .map((month) => month.label.replace(/\.$/, ""));
  // La proyección solo aporta algo mientras falten meses: en noviembre ya
  // no es una estimación, es el número.
  const showProjection = !empty && monthsRecorded < 12 && projected !== estimate;

  return (
    <section aria-labelledby="aguinaldo-titulo" className="mt-10 min-w-0">
      {/* Envuelve en vez de apretarse: en teléfono la ventana con las dos
          fechas completas no cabe al lado del título. */}
      <div className="flex min-h-10 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 pb-1">
        <h2 id="aguinaldo-titulo" className="text-heading text-ink">
          Aguinaldo {year}
        </h2>
        <span className="text-meta text-ink-3">
          {longDate(data.from)} — {longDate(data.to)}
        </span>
      </div>

      <div className="border-t border-line pt-4">
        {empty ? (
          <p className="max-w-[58ch] text-sm leading-relaxed text-ink-2">
            Todavía no hay salario anotado en esta ventana. El aguinaldo se calcula sobre lo
            ganado entre el 1.º de diciembre y el 30 de noviembre, dividido entre doce, y cuenta
            solo lo que registrés en la categoría <span className="text-ink">Salario</span>: lo
            de por fuera de planilla no genera aguinaldo.
          </p>
        ) : (
          <>
            <p className="text-meta text-ink-3">Con lo anotado hasta hoy</p>
            <p className="mt-1 text-display text-ink">
              <MoneyDisplay value={estimate} />
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-6 border-y border-line py-3 sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-meta text-ink-3">Salario acumulado</dt>
                <dd className="money mt-0.5 text-label text-ink">
                  <Money value={accrued} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-meta text-ink-3">Meses anotados</dt>
                <dd className="money mt-0.5 text-label text-ink">
                  {monthsRecorded} de {monthsElapsed}
                </dd>
              </div>
              {showProjection && (
                <div className="min-w-0">
                  <dt className="text-meta text-ink-3">Si sigue igual</dt>
                  <dd className="money mt-0.5 text-label text-ink">
                    <Money value={projected} />
                  </dd>
                </div>
              )}
            </dl>

            {/* Doce celdas, una por mes de la ventana. No es un gráfico de
                magnitud sino de cobertura: lo que hay que ver de un vistazo
                es qué mes quedó sin anotar, que es lo que deja el cálculo
                corto. Un solo color, como manda una serie única. */}
            <div
              role="img"
              aria-label={`${monthsRecorded} de los ${monthsElapsed} meses cerrados de la ventana tienen salario anotado.`}
              className="mt-4 flex gap-1"
            >
              {months.map((month) => (
                <span
                  key={month.monthKey}
                  title={`${month.label}: ${
                    month.amount > 0
                      ? `₡${month.amount.toLocaleString("de-DE")}`
                      : month.closed
                        ? "sin salario anotado"
                        : month.current
                          ? "el mes que corre"
                          : "todavía no llega"
                  }`}
                  className={`h-6 flex-1 rounded-[3px] ${
                    month.amount > 0
                      ? "bg-chart-neutral"
                      : month.closed
                        ? "border border-dashed border-line-strong"
                        : "bg-chart-track"
                  }`}
                />
              ))}
            </div>
            <div aria-hidden className="mt-1 flex gap-1">
              {months.map((month) => (
                <span
                  key={month.monthKey}
                  className="flex-1 truncate text-center text-micro text-ink-3"
                >
                  {month.label.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>

            <p className="mt-4 max-w-[58ch] text-meta leading-relaxed text-ink-3">
              Se cuenta lo ganado entre diciembre y noviembre, dividido entre doce, y se paga
              dentro de los primeros veinte días de diciembre. Acá entra solo lo que anotaste en
              la categoría Salario: lo de por fuera de planilla no genera aguinaldo.
              {missing.length > 0 && (
                <>
                  {" "}
                  Sin salario anotado:{" "}
                  <span className="text-ink-2">
                    {missing.length === 1
                      ? missing[0]
                      : `${missing.slice(0, -1).join(", ")} y ${missing[missing.length - 1]}`}
                  </span>
                  , así que el número de arriba se queda corto.
                </>
              )}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
