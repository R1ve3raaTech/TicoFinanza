"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { Account, FixedExpense, UserCategory } from "@/lib/types";
import { FixedExpenseDialog } from "./FixedExpenseDialog";

interface FixedExpenseEntryApi {
  create: () => void;
  edit: (expense: FixedExpense) => void;
}

const FixedExpenseEntryContext = createContext<FixedExpenseEntryApi | null>(null);

/**
 * Dueño del formulario de gastos fijos: el botón del encabezado, el del
 * estado vacío y cada fila de la lista abren el mismo diálogo. Cada apertura
 * lo remonta con una `key` nueva, así arranca del gasto recibido sin resets
 * a mano.
 */
export function FixedExpenseEntryProvider({
  customCategories,
  accounts = [],
  todayKey,
  children,
}: {
  customCategories: UserCategory[];
  accounts?: Account[];
  todayKey: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [session, setSession] = useState(0);

  const create = useCallback(() => {
    setEditing(null);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  const edit = useCallback((expense: FixedExpense) => {
    setEditing(expense);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  return (
    <FixedExpenseEntryContext.Provider value={{ create, edit }}>
      {children}
      <FixedExpenseDialog
        key={session}
        open={open}
        onClose={() => setOpen(false)}
        expense={editing}
        customCategories={customCategories}
        accounts={accounts}
        todayKey={todayKey}
      />
    </FixedExpenseEntryContext.Provider>
  );
}

export function useFixedExpenseEntry(): FixedExpenseEntryApi {
  const api = useContext(FixedExpenseEntryContext);
  if (!api) throw new Error("useFixedExpenseEntry requiere <FixedExpenseEntryProvider>");
  return api;
}

export function AddFixedExpenseButton({
  variant = "primary",
  iconOnly = false,
  label = "Nuevo gasto fijo",
}: {
  variant?: ButtonVariant;
  iconOnly?: boolean;
  label?: string;
}) {
  const { create } = useFixedExpenseEntry();

  if (iconOnly) {
    return (
      <Button variant="primary" size="md" icon onClick={create} aria-label={label}>
        <Plus size={18} weight="bold" />
      </Button>
    );
  }

  return (
    <Button variant={variant} onClick={create}>
      <Plus size={15} weight="bold" />
      {label}
    </Button>
  );
}
