import Link from "next/link";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { Money } from "@/components/ui/Money";
import { URGENT_DAYS, type UpcomingPayment } from "@/lib/fixedExpenses";

const MAX_ROWS = 6;

const monthDay = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "YYYY-MM-DD" a "5 nov". Se lee en UTC porque la clave ya es un día fijo. */
function dayLabel(key: string): string {
  return monthDay.format(new Date(`${key}T12:00:00Z`));
}

function whenText(payment: UpcomingPayment): string {
  if (payment.dueInDays < 0) {
    const days = Math.abs(payment.dueInDays);
    // Corto a propósito: "Venció hace 26 d" partía la columna en tres
    // renglones y empujaba la fila al doble de alto.
    return `Hace ${days} d`;
  }
  if (payment.dueInDays === 0) return "Hoy";
  if (payment.dueInDays === 1) return "Mañana";
  return `En ${payment.dueInDays} d`;
}

/**
 * Próximos pagos, del más cercano a vencer al más lejano.
 *
 * Lo que vence dentro de menos de cinco días (o ya venció sin pagarse) se
 * resalta en rojo, con ícono y con el texto del plazo: el color es refuerzo,
 * no el único aviso — en escala de grises o con daltonismo la fila igual se
 * lee como urgente.
 *
 * Cada fila abre con la **marca de su categoría**, la misma que usan Fijos y
 * Movimientos. Antes la categoría era texto gris debajo del nombre: había
 * que leer fila por fila para encontrar "el recibo del agua", que es
 * justamente lo que esta lista tiene que contestar de un vistazo.
 *
 * El ícono de urgencia se mudó a la columna "Vence", al lado del plazo en
 * rojo: ahí es donde está el dato, y así la marca de categoría tiene el
 * lugar de adelante para ella sola.
 */
export function UpcomingPayments({ payments }: { payments: UpcomingPayment[] }) {
  const pending = payments.filter((p) => p.status === "PENDING");
  const rows = (pending.length > 0 ? pending : payments).slice(0, MAX_ROWS);
  const urgentCount = pending.filter((p) => p.urgent).length;

  return (
    <section aria-labelledby="proximos-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="proximos-titulo" className="text-heading text-ink">
          Próximos pagos
          {urgentCount > 0 && (
            <span className="ml-2 text-meta font-normal text-expense">
              {urgentCount} por vencer
            </span>
          )}
        </h2>
        <Link
          href="/dashboard/fijos"
          className="inline-flex items-center gap-1 text-label text-accent underline-offset-4 hover:underline"
        >
          Gastos fijos
          <ArrowRight size={12} aria-hidden />
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="border-t border-line py-8">
          <p className="text-sm text-ink-2">
            No hay cobros agendados.{" "}
            <Link href="/dashboard/fijos" className="text-accent underline-offset-4 hover:underline">
              Agregá tus gastos fijos
            </Link>{" "}
            y acá vas a ver cuál vence primero.
          </p>
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">
            Cobros ordenados por fecha. Se marca lo que vence en menos de {URGENT_DAYS} días.
          </caption>
          <thead>
            <tr className="border-y border-line">
              <th scope="col" className="py-2 text-micro font-medium text-ink-3">
                Pago
              </th>
              <th scope="col" className="w-[5.5rem] py-2 text-micro font-medium text-ink-3">
                Vence
              </th>
              {/* Más angosta en teléfono: con la marca de categoría
                  adelante, 7rem acá dejaban a "Claude Code Pro" cortado. */}
              <th
                scope="col"
                className="w-[6rem] py-2 text-right text-micro font-medium text-ink-3 sm:w-[7rem]"
              >
                Monto
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((payment) => {
              const alert = payment.status === "PENDING" && payment.urgent;
              return (
                <tr
                  key={payment.id}
                  className="border-b border-line transition-colors duration-150 hover:bg-surface-hover"
                >
                  <td className="py-3 pr-3 align-middle">
                    <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                      <CategoryMark category={payment.category} size={26} className="sm:hidden" />
                      <CategoryMark
                        category={payment.category}
                        size={30}
                        className="hidden sm:flex"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {payment.name}
                        </span>
                        <span className="block truncate text-meta text-ink-3">
                          {payment.status === "PAID"
                            ? "Pagado este mes"
                            : (payment.category ?? "Sin categoría")}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <span
                      className={`flex items-center gap-1.5 whitespace-nowrap text-label ${
                        alert ? "font-medium text-expense" : "font-normal text-ink-2"
                      }`}
                    >
                      {alert && (
                        <WarningCircle size={14} weight="fill" aria-hidden className="shrink-0" />
                      )}
                      {payment.dueInDays < 0 && <span className="sr-only">Venció </span>}
                      {whenText(payment)}
                    </span>
                    <span className="block text-meta text-ink-3">{dayLabel(payment.dueKey)}</span>
                  </td>
                  <td className="py-3 align-middle text-right">
                    <Money value={-payment.amount} className="text-sm font-medium text-ink" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {pending.length > MAX_ROWS && (
        <p className="pt-3 text-meta text-ink-3">
          Y {pending.length - MAX_ROWS} más este mes.{" "}
          <Link href="/dashboard/fijos" className="text-accent underline-offset-4 hover:underline">
            Ver todos
          </Link>
        </p>
      )}
    </section>
  );
}
