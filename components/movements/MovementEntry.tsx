"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { Account, Transaction, TransactionType, UserCategory } from "@/lib/types";
import { MovementDialog } from "./MovementDialog";
import { TransferDialog } from "./TransferDialog";

interface MovementEntryApi {
  create: () => void;
  edit: (movement: Transaction) => void;
  /** Abrir directamente en transferencia entre cuentas. */
  transfer: () => void;
}

const MovementEntryContext = createContext<MovementEntryApi | null>(null);

/**
 * Dueño del formulario de movimientos. La acción aparece en varios lugares
 * (encabezado, estado vacío, barra de teléfono, cada fila de la lista) pero
 * el formulario es uno solo.
 *
 * Cada apertura lo remonta con una `key` nueva: arranca limpio, o con el
 * movimiento a editar, sin resetear estado a mano al cerrar.
 *
 * **También es dueño del formulario de transferencia**, porque desde el
 * control de arriba se pasa de uno al otro. Son dos diálogos y no uno con
 * dos caras: la transferencia escribe en otra tabla, valida otra cosa y no
 * tiene categoría, comprobante ni dólares. Al cambiar, uno sale y el otro
 * entra en 160ms, así que se ve como un cruce y no como cerrar y abrir.
 */
export function MovementEntryProvider({
  customCategories,
  accounts = [],
  recent = [],
  autoOpen = null,
  children,
}: {
  customCategories: UserCategory[];
  accounts?: Account[];
  /** Movimientos recientes, para sugerir categoría y cuenta al escribir. */
  recent?: Pick<Transaction, "description" | "category" | "account_id" | "transaction_date">[];
  /**
   * Abrir el formulario solo al entrar, con esta pestaña marcada.
   *
   * Es lo que usan los accesos rápidos del ícono de la app: quien los
   * toca ya dijo qué quiere anotar, y pedirle un toque más para abrir el
   * formulario desperdiciaría justamente lo que el atajo ahorra.
   */
  autoOpen?: TransactionType | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [kind, setKind] = useState<"MOVEMENT" | "TRANSFER">("MOVEMENT");
  const [type, setType] = useState<TransactionType>(autoOpen ?? "EXPENSE");
  const [session, setSession] = useState(0);

  // Transferir pide dos billeteras: sin eso no hay a dónde mover, y ofrecerlo
  // sería una pestaña que solo lleva a un cartel de "faltan cuentas".
  const canTransfer = accounts.length >= 2;

  const create = useCallback(() => {
    setEditing(null);
    setKind("MOVEMENT");
    setType("EXPENSE");
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  const edit = useCallback((movement: Transaction) => {
    setEditing(movement);
    setKind("MOVEMENT");
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  const transfer = useCallback(() => {
    setEditing(null);
    setKind("TRANSFER");
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  /** Volver de la transferencia a gasto o ingreso, con la pestaña elegida.
   *  Remonta el formulario de movimiento para que abra en ese tipo. */
  const backToMovement = useCallback((next: TransactionType) => {
    setType(next);
    setSession((s) => s + 1);
    setKind("MOVEMENT");
  }, []);

  return (
    <MovementEntryContext.Provider value={{ create, edit, transfer }}>
      {children}
      <MovementDialog
        key={`movimiento-${session}`}
        open={open && kind === "MOVEMENT"}
        onClose={() => setOpen(false)}
        movement={editing}
        customCategories={customCategories}
        accounts={accounts}
        recent={recent}
        initialType={editing ? "EXPENSE" : type}
        // Al editar no: un movimiento guardado no se convierte en
        // transferencia, viven en tablas distintas.
        onTransfer={!editing && canTransfer ? () => setKind("TRANSFER") : undefined}
      />
      {canTransfer && (
        <TransferDialog
          key={`transferencia-${session}`}
          open={open && kind === "TRANSFER"}
          onClose={() => setOpen(false)}
          accounts={accounts}
          onPickMovement={backToMovement}
        />
      )}
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
