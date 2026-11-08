"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { GearSix } from "@phosphor-icons/react";
import { SettingsDialog, type SettingsData } from "./SettingsDialog";

interface SettingsEntryApi {
  open: () => void;
}

const SettingsEntryContext = createContext<SettingsEntryApi | null>(null);

/**
 * Dueño del diálogo de ajustes.
 *
 * Va en el layout de /dashboard y no en una pantalla, porque se abre desde
 * los dos lugares donde está la cuenta: la navegación (en teléfono, donde
 * no hay menú de cuenta) y el menú de la foto (en escritorio).
 *
 * Cada apertura lo remonta con una `key` nueva: así vuelve a la pestaña de
 * Perfil y toma los datos frescos del servidor después de un guardado, sin
 * resetear nada a mano al cerrar.
 */
export function SettingsEntryProvider({
  data,
  children,
}: {
  data: SettingsData;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);

  const open = useCallback(() => {
    setSession((s) => s + 1);
    setIsOpen(true);
  }, []);

  return (
    <SettingsEntryContext.Provider value={{ open }}>
      {children}
      <SettingsDialog
        key={session}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        data={data}
      />
    </SettingsEntryContext.Provider>
  );
}

/**
 * Abrir los ajustes desde donde sea.
 *
 * Devuelve null fuera del provider en vez de tirar: la navegación es la
 * misma en todas las pantallas con sesión, pero el botón no tiene por qué
 * romper una pantalla que se dibuje sin el provider (una preview, por
 * ejemplo).
 */
export function useSettingsEntry(): SettingsEntryApi | null {
  return useContext(SettingsEntryContext);
}

/**
 * La entrada a los ajustes dentro de la píldora de navegación.
 *
 * Es un botón y no un enlace porque ya no hay pantalla a dónde ir: abre el
 * diálogo encima de lo que estabas viendo. Por eso tampoco se marca como
 * sección activa — no es un destino.
 */
export function SettingsNavButton({
  variant,
}: {
  /** "top" es la píldora de escritorio; "tab", la de teléfono. */
  variant: "top" | "tab";
}) {
  const entry = useSettingsEntry();
  if (!entry) return null;

  if (variant === "tab") {
    return (
      <button
        type="button"
        onClick={entry.open}
        aria-haspopup="dialog"
        className="relative flex h-12 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-micro font-medium text-ink-3 transition-[color,transform] duration-150 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <GearSix size={19} />
        <span className="max-w-full truncate px-0.5">Ajustes</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={entry.open}
      aria-haspopup="dialog"
      className="group relative flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm font-medium text-ink-3 transition-[color,transform] duration-150 hover:text-ink active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <GearSix
        size={17}
        className="shrink-0 transition-transform duration-150 group-hover:-translate-y-px motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      />
      Ajustes
    </button>
  );
}
