import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

/**
 * Mockup del producto para el hero: el resumen del mes y los próximos pagos,
 * que es lo que la app contesta de un vistazo.
 *
 * Estático a propósito. El mockup anterior animaba un correo bancario
 * convirtiéndose en movimiento —la app ya no lee correos— y una animación en
 * loop infinito no es lo que la nueva guía visual permite. Los números son de
 * ejemplo y están escritos acá, no son datos de nadie.
 */
const SUMMARY = [
  { label: "Ingresos", value: "₡680.000", swatch: "bg-chart-income" },
  { label: "Gastos fijos", value: "₡312.500", swatch: "bg-chart-ramp-1" },
  { label: "Variables", value: "₡184.300", swatch: "bg-chart-expense" },
];

const PAYMENTS = [
  { name: "Alquiler", when: "En 2 d", day: "1 nov", amount: "₡185.000", urgent: true },
  { name: "Internet", when: "En 4 d", day: "3 nov", amount: "₡22.500", urgent: true },
  { name: "Gimnasio", when: "En 9 d", day: "8 nov", amount: "₡18.000", urgent: false },
  { name: "Netflix", when: "En 13 d", day: "12 nov", amount: "₡6.900", urgent: false },
];

export function HeroMockup() {
  return (
    <div
      aria-hidden
      className="w-full max-w-[420px] select-none rounded-dialog border border-line bg-surface p-5 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.35)]"
    >
      <p className="text-micro text-ink-3">Tu mes de noviembre</p>

      <p className="money mt-2 text-[2rem] font-medium leading-none tracking-[-0.04em] text-ink">
        <span className="mr-[0.06em] text-[0.6em] font-normal text-ink-3">₡</span>183.200
      </p>
      <p className="mt-1.5 text-meta text-ink-3">Superávit neto</p>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
        {SUMMARY.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-micro text-ink-3">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-[2px] ${item.swatch}`} />
              {item.label}
            </dt>
            <dd className="money mt-1 truncate text-label text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 border-t border-line pt-4 text-micro text-ink-3">Próximos pagos</p>
      <ul className="mt-1">
        {PAYMENTS.map((payment) => (
          <li
            key={payment.name}
            className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {payment.urgent && (
                <WarningCircle size={13} weight="fill" className="shrink-0 text-expense" />
              )}
              <span className="truncate text-label font-normal text-ink">{payment.name}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-3">
              <span
                className={`text-meta ${payment.urgent ? "font-medium text-expense" : "text-ink-3"}`}
              >
                {payment.when}
              </span>
              <span className="money w-[4.5rem] text-right text-label text-ink">
                −{payment.amount}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
