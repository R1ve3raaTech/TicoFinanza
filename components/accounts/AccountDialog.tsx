"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { createAccount, deleteAccount, updateAccount } from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { formatAmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Select, inputClass } from "@/components/ui/Field";
import { ACCOUNT_TYPES } from "@/lib/accounts";
import type { Account, AccountType } from "@/lib/types";

/**
 * Alta y edición de una billetera.
 *
 * El campo es el saldo *inicial*, no el actual: el actual lo calcula la base
 * sumando todo lo registrado. Si alguien quiere cuadrar la cuenta con la
 * realidad, mueve el inicial y el resto se reacomoda solo.
 */
export function AccountDialog({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}) {
  const toast = useToast();
  const formId = useId();
  const typeId = useId();
  const editing = Boolean(account);

  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "efectivo");
  const [initial, setInitial] = useState(
    account ? formatAmountInput(account.initial_balance) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const hint = ACCOUNT_TYPES.find((t) => t.value === type)?.hint;

  function submit() {
    setError(null);
    const value = initial.trim() === "" ? 0 : parseAmount(initial);
    if (!name.trim()) {
      setError("Ponele un nombre (ej. BAC débito, Efectivo, Visa).");
      return;
    }
    if (!Number.isFinite(value)) {
      setError("El saldo inicial no es un número válido.");
      return;
    }

    startTransition(async () => {
      const input = { name, type, initialBalance: value };
      const result = account
        ? await updateAccount(account.id, input)
        : await createAccount(input);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Cuenta actualizada" : "Cuenta creada");
      onClose();
    });
  }

  function remove() {
    if (!account) return;
    startTransition(async () => {
      const result = await deleteAccount(account.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      toast.success("Cuenta eliminada");
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        dismissible={!pending}
        title={editing ? "Editar cuenta" : "Nueva cuenta"}
        description={
          editing ? undefined : "Una billetera por cada lugar donde tenés plata."
        }
        footer={
          <>
            {editing && (
              <Button
                variant="danger-ghost"
                onClick={() => setConfirmingDelete(true)}
                disabled={pending}
                className="sm:mr-auto"
              >
                <Trash size={15} />
                Eliminar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          <Field label="Nombre">
            <input
              data-autofocus=""
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Efectivo, BAC débito, Visa…"
              className={inputClass}
            />
          </Field>

          <Field label="Tipo" hint={hint}>
            <Select
              id={typeId}
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              aria-label="Tipo de cuenta"
            >
              {ACCOUNT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Saldo inicial"
            hint="Lo que hay en la cuenta hoy, antes de registrar movimientos. En una tarjeta de crédito puede ser negativo."
          >
            <input
              inputMode="decimal"
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
              placeholder="0"
              className={`${inputClass} money`}
            />
          </Field>

          {editing && (
            <p className="text-meta leading-relaxed text-ink-3">
              Saldo de hoy: el inicial más todo lo registrado en esta cuenta. Se recalcula solo.
            </p>
          )}

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar esta cuenta?"
        description="Los movimientos que tenía quedan sin cuenta asignada, no se borran. Las transferencias desde o hacia ella sí se eliminan."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
