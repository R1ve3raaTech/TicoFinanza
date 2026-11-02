"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { Account, Transaction, UserCategory } from "@/lib/types";
import { MovementDialog } from "./MovementDialog";

interface MovementEntryApi {
  create: () => void;
  edit: (movement: Transaction) => void;
}

const MovementEntryContext = createContext<MovementEntryApi | null>(null);

/**
 * Dueño del formulario de movimientos. La acción aparece en varios lugares
 * (encabezado, estado vacío, barra de teléfono, cada fila de la lista) pero
 * el formulario es uno solo.
 *
 * Cada apertura lo remonta con una `key` nueva: arranca limpio, o con el
 * movimiento a editar, sin resetear estado a mano al cerrar.
 */
export function MovementEntryProvider({
  customCategories,
  accounts = [],
  recent = [],
  children,
}: {
  customCategories: UserCategory[];
  accounts?: Account[];
  /** Movimientos recientes, para sugerir categoría y cuenta al escribir. */
  recent?: Pick<Transaction, "description" | "category" | "account_id" | "transaction_date">[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [session, setSession] = useState(0);

  const create = useCallback(() => {
    setEditing(null);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  const edit = useCallback((movement: Transaction) => {
    setEditing(movement);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  return (
    <MovementEntryContext.Provider value={{ create, edit }}>
      {children}
      <MovementDialog
        key={session}
        open={open}
        onClose={() => setOpen(false)}
        movement={editing}
        customCategories={customCategories}
        accounts={accounts}
        recent={recent}
      />
    </MovementEntryContext.Provider>
  );
}

export function useMovementEntry(): MovementEntryApi {
  const api = useContext(MovementEntryContext);
  if (!api) throw new Error("useMovementEntry requiere <MovementEntryProvider>");
  return api;
}

export function AddMovementButton({
  variant = "primary",
  iconOnly = false,
}: {
  variant?: ButtonVariant;
  iconOnly?: boolean;
}) {
  const { create } = useMovementEntry();

  if (iconOnly) {
    return (
      <Button
        variant="primary"
        size="md"
        icon
        onClick={create}
        aria-label="Registrar ingreso o gasto"
      >
        <Plus size={18} weight="bold" />
      </Button>
    );
  }

  return (
    <Button variant={variant} onClick={create}>
      <Plus size={15} weight="bold" />
      Registrar movimiento
    </Button>
  );
}
