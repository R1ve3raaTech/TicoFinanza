"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { Reveal, SectionHeading } from "./Reveal";

/**
 * Las preguntas que alguien se hace de verdad antes de crearse una cuenta de
 * plata, contestadas de frente — incluidas las incómodas (que hay que anotar
 * a mano, y que no se conecta al banco). Esconderlas es lo que hace que una
 * app así dé desconfianza; contestarlas es lo que la hace creíble.
 */
const faqs = [
  {
    q: "¿TicoFinanza se conecta a mi banco?",
    a: "No. No hay sincronización bancaria ni lectura de correos: vos anotás tus ingresos, tus gastos y tus pagos fijos, y la app lleva las cuentas. Por eso nunca te pedimos usuario ni clave de la banca en línea.",
  },
  {
    q: "¿Entonces tengo que anotar todo a mano?",
    a: "Sí, y conviene decirlo claro. Los gastos fijos se cargan una sola vez —quedan agendados todos los meses con su día de cobro— y los movimientos del día a día se anotan en dos toques. Si querías algo que se llene solo, esta app no es eso.",
  },
  {
    q: "¿Para qué usan mi cuenta de Google?",
    a: "Solo para identificarte al entrar, con los permisos básicos de perfil: nombre, correo y foto. La app no pide acceso a tu Gmail, a tu Drive ni a ningún otro dato de tu cuenta.",
  },
  {
    q: "¿Puedo tener varias cuentas?",
    a: "Sí: efectivo, débito, crédito y ahorro, las que necesités. Cada movimiento se asigna a una y cada cuenta lleva su propio saldo. Mover plata entre ellas —sacar del cajero, pagar la tarjeta— es una transferencia, y no cuenta como ingreso ni como gasto.",
  },
  {
    q: "¿Qué pasa cuando marco un gasto fijo como pagado?",
    a: "Queda pagado para ese mes y sale de los próximos pagos. Al empezar el mes siguiente vuelve solo a pendiente, sin que tengás que resetear nada.",
  },
  {
    q: "¿Qué pasa si un mes no llega al día de cobro?",
    a: "Un cobro agendado el 31 cae el 28 (o el 29) en febrero, y el 30 en abril: la app lo mueve al último día del mes en vez de pasarlo al siguiente.",
  },
  {
    q: "¿Maneja dólares?",
    a: "No. Todo se registra y se suma en colones. Es una decisión a propósito: mezclar monedas con tipos de cambio que cambian todos los días hacía que los totales dejaran de ser comparables.",
  },
  {
    q: "¿Puedo borrar todo si me arrepiento?",
    a: "Sí, desde los ajustes, vos mismo y sin escribirle a nadie. Podés borrar solo tus movimientos, o eliminar la cuenta entera: ahí se van tus movimientos, tus gastos fijos, tus categorías y tu perfil.",
  },
  {
    q: "¿Se instala en el teléfono?",
    a: "Sí. Se agrega a la pantalla de inicio desde el mismo navegador y se abre como cualquier otra app, a pantalla completa. No hay que pasar por ninguna tienda.",
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <Reveal delay={Math.min(index, 4) * 0.04}>
      <div className="border-b border-line">
        <h3>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-accent cursor-pointer"
          >
            <span className="text-[15px] font-medium text-ink sm:text-base">{q}</span>
            <motion.span
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="shrink-0 text-ink-3"
            >
              <Plus size={18} weight="bold" />
            </motion.span>
          </button>
        </h3>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              key="panel"
              initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <p className="max-w-[68ch] pb-5 pr-8 text-sm leading-relaxed text-ink-2">{a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

export function Faq() {
  return (
    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <SectionHeading
        label="Preguntas"
        title="Lo que todos preguntan antes de entrar"
        body="Si algo no queda claro acá, escribinos a info@ticofinanza.com y te contestamos."
      />

      <div className="border-t border-line">
        {faqs.map((faq, i) => (
          <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
        ))}
      </div>
    </div>
  );
}
