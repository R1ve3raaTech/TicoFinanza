import { Money, MoneyDisplay } from "@/components/ui/Money";
import { formatMoney } from "@/lib/format";
import type { MonthHeadline } from "@/lib/greeting";

/** Qué dice la línea de proyección según lo que falte por moverse. */
function projectionLabel(pendingIncome: number, pendingFixed: number): string {
  if (pendingIncome > 0 && pendingFixed > 0) {
    return `Si entran ${formatMoney(pendingIncome)} y pagás ${formatMoney(pendingFixed)} de fijos`;
  }
  if (pendingIncome > 0) return `Cuando entren los ${formatMoney(pendingIncome)} que faltan`;
  return `Si pagás los ${formatMoney(pendingFixed)} de fijos que faltan`;
}

/**
 * La cabeza del resumen: cuánta plata hay y cómo viene el mes, en una
 * oración.
 *
 * El saludo por nombre no está acá sino en la línea de contexto del
 * encabezado ("Buenas tardes, Camil · Sábado 7 de noviembre"): como línea
 * aparte quedaban tres textos apilados antes de llegar a la cifra, que es a
 * lo que uno entra.
 *
 * **El saldo total subió acá desde el panel "Tus cuentas".** Era la cifra que
 * uno viene a ver —la única pregunta que se trae al abrir una app de
 * plata— y estaba a 22px, abajo de las cuatro tarjetas del mes y de los tres
 * primeros pasos: en teléfono había que bajar para verla. Arriba y en la
 * escala `display` manda sobre el resto de la pantalla.
 *
 * Esa escala existía en los tokens desde el rediseño de 2026-09 ("el saldo es
 * la única cifra display y nunca baja de 48px", app/globals.css) y no la usaba
 * nadie: el saldo se dibujaba con `text-figure`, el tamaño de las cifras de
 * resumen. O sea que la cifra protagonista se veía igual que sus cuatro
 * acompañantes.
 *
 * Sigue habiendo **una sola** cifra protagonista por pantalla: el panel de
 * cuentas ya no repite el total, solo desglosa por billetera.
 *
 * Sin ninguna cuenta no hay saldo que mostrar y queda solo el saludo: un
 * ₡0 gigante arriba de una cuenta recién creada no es un dato, es un
 * desánimo.
 */
export function SummaryHero({
  headline,
  total,
  hasAccounts,
  pendingFixed = 0,
  pendingIncome = 0,
}: {
  /** Cómo viene el mes, en una oración. null si no hay nada anotado. */
  headline: MonthHeadline | null;
  /** Suma de los saldos de todas las billeteras. */
  total: number;
  hasAccounts: boolean;
  /** Gastos fijos del mes que todavía no se pagaron. */
  pendingFixed?: number;
  /** Ingresos fijos del mes que todavía no entraron. */
  pendingIncome?: number;
}) {
  const projected = total + pendingIncome - pendingFixed;
  const showProjection = hasAccounts && (pendingFixed > 0 || pendingIncome > 0);

  return (
    <section aria-label="Tu plata hoy" className="pb-6 pt-3 md:pt-2">
      {hasAccounts && (
        <>
          <p className="text-meta text-ink-3">Disponible hoy</p>
          <p
            className={`mt-1 text-display md:text-display-lg ${
              total < 0 ? "text-expense" : "text-ink"
            }`}
          >
            <MoneyDisplay value={total} />
          </p>

          {/* Cómo cerrás el mes: lo que hay hoy, más los ingresos fijos que
              faltan por entrar, menos los gastos fijos que faltan por salir.
              Solo cuenta ingresos que vos declaraste como fijos — nunca
              inventa plata que la app no sabe que viene. */}
          {showProjection && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-meta text-ink-3">
              {projectionLabel(pendingIncome, pendingFixed)}
              <span aria-hidden>→</span>
              <Money
                value={projected}
                className={projected < 0 ? "text-expense" : "text-ink-2"}
              />
            </p>
          )}
        </>
      )}

      {/* La frase que contesta "cómo vengo", con los números de la persona.
          Sin ella la pantalla abría con cuatro cifras y nada que las
          interpretara. */}
      <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-ink-2">
        {headline ? (
          <>
            {headline.text}
            {headline.pending && <span className="text-ink-3"> {headline.pending}</span>}
          </>
        ) : (
          <>Todavía no anotaste nada este mes. Empezá por los tres pasos de abajo.</>
        )}
      </p>
    </section>
  );
}
