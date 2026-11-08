import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsLeftRight,
  GearSix,
  Receipt,
  SquaresFour,
  Target,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Qué hace cada sección de la app, en dos columnas y corto.
 *
 * Antes cada entrada traía además su propia aclaración en un bloque citado y
 * la guía se comía los primeros 600px de Ajustes, empujando el perfil fuera
 * de la pantalla: nadie entra a Ajustes a leer, entra a cambiar algo. Las
 * tres aclaraciones que de verdad hacen falta se juntaron abajo, donde se
 * leen de corrido.
 */
const SECTIONS: { icon: Icon; title: string; href: string | null; what: string }[] = [
  {
    icon: SquaresFour,
    title: "Resumen",
    href: "/dashboard",
    what: "Cómo venís este mes, qué se vence primero y en qué se te va la plata.",
  },
  {
    icon: Receipt,
    title: "Fijos",
    href: "/dashboard/fijos",
    what: "Los pagos que se repiten todos los meses, con su día de cobro.",
  },
  {
    icon: ArrowsLeftRight,
    title: "Movimientos",
    href: "/dashboard/movimientos",
    what: "Lo que entró y salió, uno por uno, con su cuenta y su comprobante.",
  },
  {
    icon: Target,
    title: "Plan",
    href: "/dashboard/plan",
    what: "Topes de gasto, metas de ahorro (anuales incluidas) y deudas con otras personas.",
  },
  {
    icon: GearSix,
    title: "Ajustes",
    // Sin href: es este mismo diálogo, no una pantalla a la que ir.
    href: null,
    what: "Tu perfil, tus categorías, el tema y los recordatorios. Es esta misma ventana.",
  },
];

const CONFUSIONS = [
  "Un gasto fijo no es un movimiento: se anota una vez y vale todos los meses. Al marcarlo pagado la app te ofrece descontarlo de la cuenta, y ese movimiento no se cuenta otra vez como gasto variable.",
  "Un ingreso fijo no se registra solo el día de pago: te aparece en el resumen para confirmarlo, así un depósito atrasado o distinto no deja el saldo mintiendo.",
  "Una transferencia no es ingreso ni gasto: mover plata del banco al efectivo no cambia cuánto tenés.",
  "Una deuda recién toca tus cuentas el día que la marcás como saldada, y solo si pedís que se registre el movimiento.",
  "Una meta anual (el marchamo, el seguro) divide el monto entre doce. Cuando la pagás, lo apartado vuelve a la cuenta y el gasto la saca: el saldo queda igual al del banco.",
];

export function AppGuide() {
  return (
    <>
      <ul className="grid gap-x-8 gap-y-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ icon: Icon, title, href, what }) => (
          <li key={title} className="flex gap-2.5">
            <Icon size={15} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            <div className="min-w-0">
              {href ? (
                <Link
                  href={href}
                  className="text-label text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  {title}
                </Link>
              ) : (
                <span className="text-label text-ink">{title}</span>
              )}
              <p className="mt-0.5 text-meta leading-relaxed text-ink-3">{what}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-label text-ink-2">Lo que más se confunde</h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {CONFUSIONS.map((text) => (
            <li key={text} className="flex gap-2.5 text-meta leading-relaxed text-ink-3">
              <span aria-hidden className="mt-[0.45em] h-px w-2 shrink-0 bg-line-strong" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
