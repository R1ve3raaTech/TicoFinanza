"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AddMovementTabButton } from "@/components/movements/MovementEntry";
import { SettingsNavButton } from "@/components/settings/SettingsEntry";
import { NAV_ITEMS, isNavActive } from "./navItems";

/**
 * Navegación de teléfono: una píldora flotante abajo.
 *
 * Son secciones pares y se salta entre ellas todo el tiempo, así que van
 * abajo, al alcance del pulgar y siempre a la vista. Antes era una barra
 * pegada al borde de la pantalla; flotando, el contenido se ve pasar por
 * debajo y la barra se lee como un control de la app y no como el final de
 * la página.
 *
 * Mismas microinteracciones que la píldora de escritorio (ver TopNav): la
 * pastilla de la sección activa se desliza al cambiar de pestaña, el toque
 * hunde la pestaña, y el ícono pasa a relleno. Todo se apaga con movimiento
 * reducido.
 *
 * Con cinco pestañas el ancho es el que manda: las que tienen nombre largo
 * usan su `shortLabel` acá, para no truncarse a 360px.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <div
      // El contenedor fijo cubre el ancho para centrar la píldora: no puede
      // recibir clics o se come los de la franja de abajo del contenido.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <nav
        aria-label="Principal"
        className="pointer-events-auto w-full max-w-[26rem] rounded-full border border-line bg-surface/85 p-1 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.45)] backdrop-blur-xl"
      >
        <ul className="flex items-stretch">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative min-w-0 flex-1">
                {active && (
                  <motion.span
                    layoutId="tab-seccion-activa"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-surface-hover"
                    transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-micro font-medium transition-[color,transform] duration-150 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                    active ? "text-ink" : "text-ink-3"
                  }`}
                >
                  <Icon size={19} weight={active ? "fill" : "regular"} />
                  <span className="max-w-full truncate px-0.5">
                    {item.shortLabel ?? item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          {/* Ajustes abre un diálogo. En teléfono no hay menú de cuenta, así
              que este botón es la única puerta a la cuenta: sacarlo de la
              barra dejaría el perfil y el cierre de sesión inalcanzables. */}
          <li className="relative min-w-0 flex-1">
            <SettingsNavButton variant="tab" />
          </li>

          {/* Anotar, al alcance del pulgar: era el botón de la esquina
              de arriba a la derecha, que en un teléfono grande es el punto
              más lejano del dedo y es la acción que más se repite.

              Abre el formulario encima de donde estés. Antes era un enlace
              a `/dashboard/movimientos?nuevo=gasto` y tenía un fallo tonto:
              en cuanto la URL ya traía ese parámetro, volver a tocarlo
              navegaba al mismo sitio y no pasaba nada. */}
          <li className="relative shrink-0 self-center pl-1">
            <AddMovementTabButton />
          </li>
        </ul>
      </nav>
    </div>
  );
}
