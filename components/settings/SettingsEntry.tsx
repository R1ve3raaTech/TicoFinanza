"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearSix } from "@phosphor-icons/react";
import type { SettingsData } from "./types";

const SettingsDataContext = createContext<SettingsData | null>(null);

/** La ruta de Ajustes, en un solo lugar. */
export const SETTINGS_HREF = "/dashboard/ajustes";

/**
 * Deja los datos de Ajustes a mano para la pantalla.
 *
 * **Vive en el layout y no en la pantalla** porque el layout ya los
 * consulta —el perfil, el tema, las categorías, cuántos movimientos hay— y
 * volver a pedirlos en la página sería hacer las mismas consultas dos
 * veces. La pantalla los toma de acá.
 *
 * Hubo una versión en que este provider era dueño de un diálogo: Ajustes
 * era una ventana encima de lo que estuvieras viendo. Volvió a ser
 * pantalla porque ocho bloques apilados en una ventana chica dejaban todo
 * lo de abajo —cerrar sesión, la zona de peligro— a varios scrolls de
 * distancia. Ver `SettingsScreen`.
 */
export function SettingsDataProvider({
  data,
  children,
}: {
  data: SettingsData;
  children: ReactNode;
}) {
  return (
    <SettingsDataContext.Provider value={data}>{children}</SettingsDataContext.Provider>
  );
}

/**
 * Los datos de Ajustes.
 *
 * Devuelve `null` fuera del provider en vez de tirar: una vista de prueba
 * puede dibujar la pantalla sin él, y romperla entera por eso sería peor
 * que no mostrarla.
 */
export function useSettingsData(): SettingsData | null {
  return useContext(SettingsDataContext);
}

/**
 * La entrada a Ajustes dentro de la píldora de navegación.
 *
 * Es un enlace, no un botón: Ajustes volvió a ser un destino, así que se
 * marca como sección activa igual que las demás.
 */
export function SettingsNavButton({
  variant,
}: {
  /** "top" es la píldora de escritorio; "tab", la de teléfono. */
  variant: "top" | "tab";
}) {
  const pathname = usePathname();
  const activa = pathname === SETTINGS_HREF;

  if (variant === "tab") {
    return (
      <Link
        href={SETTINGS_HREF}
        aria-current={activa ? "page" : undefined}
        className={`relative flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full text-micro font-medium transition-[color,transform] duration-150 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 ${
          activa ? "text-ink" : "text-ink-3"
        }`}
      >
        <GearSix size={19} weight={activa ? "fill" : "regular"} />
        <span className="max-w-full truncate px-0.5">Ajustes</span>
      </Link>
    );
  }

  return (
    <Link
      href={SETTINGS_HREF}
      aria-current={activa ? "page" : undefined}
      className={`group relative flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-[color,transform] duration-150 hover:text-ink active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${
        activa ? "text-ink" : "text-ink-3"
      }`}
    >
      <GearSix
        size={17}
        weight={activa ? "fill" : "regular"}
        className="shrink-0 transition-transform duration-150 group-hover:-translate-y-px motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      />
      Ajustes
    </Link>
  );
}
