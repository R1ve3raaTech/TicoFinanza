"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { SettingsNavButton } from "@/components/settings/SettingsEntry";
import { NAV_ITEMS, isNavActive } from "./navItems";
import { UserMenu } from "./UserMenu";

/**
 * Navegación de tablet y escritorio (`md` en adelante): una píldora flotante
 * centrada arriba.
 *
 * Reemplaza el rail de la izquierda. El rail se llevaba 88px de ancho en
 * laptop y 232px en escritorio con cinco entradas que no los necesitaban,
 * mientras el contenido —que son tablas y gráficos, cosas anchas— quedaba
 * apretado. Arriba, la navegación ocupa alto y no ancho.
 *
 * Flota en vez de ser una barra pegada al borde: el contenido pasa por
 * debajo con el fondo difuminado, así se nota que la página sigue y no que
 * la navegación corta la pantalla en dos.
 *
 * Tres microinteracciones, todas en respuesta a algo que la persona hace
 * (nada que se mueva solo):
 *
 * 1. La pastilla de la sección activa se **desliza** de una entrada a la
 *    otra al navegar. Es una sola `motion.span` con `layoutId`: framer la
 *    mide y la anima entre posiciones, sin que haya que calcular nada.
 * 2. Apretar hunde la entrada un 4 %, igual que los botones de la app — en
 *    pantalla táctil (una tablet) no hay hover y sin esto el toque no
 *    devuelve señal.
 * 3. Al pasar el puntero, el ícono de la entrada sube un píxel.
 *
 * Con `prefers-reduced-motion` el deslizamiento pasa a durar 0 y el hundido
 * se apaga: la pastilla sigue marcando la sección, pero sin movimiento.
 */
export function TopNav({
  name,
  email,
  avatarUrl,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    // El contenedor fijo ocupa todo el ancho para centrar la píldora, así
    // que no puede recibir clics: sin `pointer-events-none` se come los de
    // la franja de arriba del contenido. La píldora los vuelve a aceptar.
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 hidden justify-center px-4 pt-3 md:flex">
      <nav
        aria-label="Principal"
        className="pointer-events-auto flex h-14 items-center gap-1 rounded-full border border-line bg-surface/80 px-2 shadow-[0_8px_28px_-14px_rgb(0_0_0/0.4)] backdrop-blur-xl"
      >
        <Link
          href="/dashboard"
          aria-label="TicoFinanza, ir al resumen"
          className="ml-1 mr-1 inline-flex shrink-0 items-center gap-2 rounded-full px-1 text-ink transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <BrandMark size={21} />
          {/* A 768px justo las cinco entradas y la cuenta llenan la
              píldora; el nombre escrito vuelve desde lg. */}
          <span className="hidden text-[0.9375rem] font-semibold leading-none tracking-[-0.02em] lg:inline">
            TicoFinanza
          </span>
        </Link>

        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-line" />

        <ul className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative">
                {active && (
                  <motion.span
                    layoutId="nav-seccion-activa"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-surface-hover"
                    transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-[color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                    active ? "text-ink" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  <Icon
                    size={17}
                    weight={active ? "fill" : "regular"}
                    className="shrink-0 transition-transform duration-150 group-hover:-translate-y-px motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {/* Ajustes abre un diálogo, así que es un botón suelto y no una
              entrada de la lista: no es un destino y no se marca activo. */}
          <li>
            <SettingsNavButton variant="top" />
          </li>
        </ul>

        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-line" />

        <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
      </nav>
    </div>
  );
}
