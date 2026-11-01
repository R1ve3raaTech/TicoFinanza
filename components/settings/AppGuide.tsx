import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsLeftRight,
  GearSix,
  Receipt,
  SquaresFour,
  Target,
} from "@phosphor-icons/react/dist/ssr";

interface GuideEntry {
  icon: Icon;
  title: string;
  href: string;
  what: string;
  /** Lo que la gente entiende mal de esa sección. */
  note?: string;
}

/**
 * Qué hace cada sección de la app.
 *
 * Vive en Ajustes y no en un recorrido guiado al entrar: un tour se cierra
 * una vez, a los diez segundos de llegar, y después no hay forma de
 * volverlo a ver. Esto se puede consultar el día que haga falta, que es
 * cuando uno de verdad se pregunta por qué los gastos fijos no aparecen en
 * la lista de movimientos.
 */
const ENTRIES: GuideEntry[] = [
  {
    icon: SquaresFour,
    title: "Resumen",
    href: "/dashboard",
    what: "Cómo venís este mes: lo que entró, lo que se va en fijos, lo que gastaste a mano y lo que queda. Abajo, qué se vence primero, el calendario del mes y en qué se te va la plata.",
  },
  {
    icon: Receipt,
    title: "Fijos",
    href: "/dashboard/fijos",
    what: "Los pagos que se repiten todos los meses: alquiler, servicios, gimnasio, suscripciones. Cada uno con su día de cobro y su estado.",
    note: "Un gasto fijo no es un movimiento: se anota una vez y vale todos los meses. Marcarlo como pagado no crea un movimiento ni cambia el saldo de la cuenta — el mes siguiente vuelve a estar pendiente solo.",
  },
  {
    icon: ArrowsLeftRight,
    title: "Movimientos",
    href: "/dashboard/movimientos",
    what: "Lo que entró y salió de verdad, anotado uno por uno, con su categoría, su cuenta y su comprobante si le sacaste foto. Acá también van las transferencias entre tus propias cuentas.",
    note: "Una transferencia no es ingreso ni gasto: mover plata del banco al efectivo no cambia cuánto tenés, así que no toca el superávit del mes.",
  },
  {
    icon: Target,
    title: "Plan",
    href: "/dashboard/plan",
    what: "Lo que te proponés, en tres pestañas. Presupuestos: un tope de gasto por categoría y por mes. Metas: plata apartada para algo concreto. Deudas: lo que te deben y lo que debés.",
    note: "Prestar plata no es un gasto y que te deban no es un ingreso: una deuda recién toca tus cuentas el día que la marcás como saldada, y solo si pedís que se registre el movimiento.",
  },
  {
    icon: GearSix,
    title: "Ajustes",
    href: "/dashboard/ajustes",
    what: "Tu perfil, tus categorías propias, el tema claro u oscuro, los recordatorios de vencimiento y la exportación a CSV.",
  },
];

export function AppGuide() {
  return (
    <ul className="border-t border-line">
      {ENTRIES.map(({ icon: Icon, title, href, what, note }) => (
        <li
          key={title}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-line py-4 sm:gap-x-4"
        >
          <span
            aria-hidden
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-raised text-ink-3"
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <Link
              href={href}
              className="text-label text-ink underline-offset-4 hover:text-accent hover:underline"
            >
              {title}
            </Link>
            <p className="mt-1 max-w-[62ch] text-meta leading-relaxed text-ink-3">{what}</p>
            {note && (
              <p className="mt-2 max-w-[62ch] border-l-2 border-line-strong pl-3 text-meta leading-relaxed text-ink-2">
                {note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
