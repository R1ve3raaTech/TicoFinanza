"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { UserCategory } from "@/lib/types";
import { AddCashModal } from "./AddCashModal";

const CashEntryContext = createContext<(() => void) | null>(null);

/**
 * Dueño del formulario de "anotar efectivo". La acción aparece en más de un
 * lugar (encabezado, estado vacío, barra de teléfono) pero el formulario es
 * uno solo.
 *
 * Cada apertura remonta el formulario con una `key` nueva: arranca limpio
 * (fecha y hora de ahora, campos vacíos) sin tener que resetear estado a
 * mano con timeouts al cerrar.
 */
export function CashEntryProvider({
  customCategories,
  children,
}: {
  customCategories: UserCategory[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  const openEntry = useCallback(() => {
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  return (
    <CashEntryContext.Provider value={openEntry}>
      {children}
      <AddCashModal
        key={session}
        open={open}
        onClose={() => setOpen(false)}
        customCategories={customCategories}
      />
    </CashEntryContext.Provider>
  );
}

export function AddCashButton({
  variant = "primary",
  iconOnly = false,
}: {
  variant?: ButtonVariant;
  iconOnly?: boolean;
}) {
  const openEntry = useContext(CashEntryContext);
  if (!openEntry) throw new Error("AddCashButton debe usarse dentro de <CashEntryProvider>");

  if (iconOnly) {
    return (
      <Button variant="primary" size="md" icon onClick={openEntry} aria-label="Anotar efectivo">
        <Plus size={18} weight="bold" />
      </Button>
    );
  }

  return (
    <Button variant={variant} onClick={openEntry}>
      <Plus size={15} weight="bold" />
      Anotar efectivo
    </Button>
  );
}
