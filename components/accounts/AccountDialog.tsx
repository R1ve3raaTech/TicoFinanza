"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { createAccount, deleteAccount, updateAccount } from "@/app/dashboard/actions";
import { StylePickerDialog, StyleRow } from "@/components/ui/StylePickerDialog";
import { MATERIAL_SYMBOLS } from "@/lib/materialSymbols";
import { AccountMark } from "./AccountMark";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Select, inputClass } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ACCOUNT_TYPES } from "@/lib/accounts";
import type { Account, AccountType } from "@/lib/types";

/**
 * Alta y edición de una billetera.
 *
 * **Al editar no hay campo de saldo, y es a propósito.** Lo había, y
 * escribir ahí el saldo de hoy reescribía el punto de partida en silencio:
 * si al banco le faltaban ₡7.000 porque se olvidó anotar unos almuerzos,
 * esa diferencia se borraba en vez de quedar registrada. El único dato que
 * contesta "cuánto se me escapa al mes" se perdía cada vez que alguien
 * cuadraba la cuenta.
 *
 * Ahora el saldo se toca solo desde "Conciliar", que pregunta qué dice el
 * banco y ofrece las dos salidas honestas. Ver `lib/reconcile.ts`.
 *
 * Al **crear** sí se pide: una cuenta nueva no tiene movimientos, así que
 * lo que hay hoy es exactamente el punto de partida.
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
  const [icon, setIcon] = useState<string | null>(account?.icon ?? null);
  const [styleOpen, setStyleOpen] = useState(false);
  // Al editar no se muestra ni se cambia: se manda el actual tal cual, así
  // el ajuste da cero y el punto de partida queda donde estaba.
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const hint = ACCOUNT_TYPES.find((t) => t.value === type)?.hint;

  function submit() {
    setError(null);
    // **Al editar se manda el saldo actual tal cual.** `updateAccount`
    // ajusta el punto de partida por la diferencia contra lo que recibe,
    // así que mandar el mismo número deja la cuenta intacta. Si acá fuera
    // 0 —que es lo que vale el campo vacío— editarle el nombre a una
    // cuenta le pondría el saldo en cero.
    const value = account
      ? account.current_balance
      : balance.trim() === ""
        ? 0
        : parseAmount(balance);
    if (!name.trim()) {
      setError("Ponele un nombre (ej. BAC débito, Efectivo, Visa).");
      return;
    }
    if (!Number.isFinite(value)) {
      setError("El saldo no es un número válido.");
      return;
    }

    startTransition(async () => {
      const input = { name, type, currentBalance: value, icon };
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
      setConfirmingDelete(false);
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

          {editing ? (
            <Field label="Saldo">
              <p className="text-meta text-ink-3">Se cuadra desde &ldquo;Conciliar&rdquo;.</p>
            </Field>
          ) : (
            <Field
              label="Saldo actual"
              hint="Lo que hay en la cuenta en este momento. En una tarjeta de crédito puede ser negativo."
            >
              {/* `allowNegative`: una tarjeta de crédito tiene saldo en
                  contra, y es el único monto de la app que puede ir en menos. */}
              <MoneyInput value={balance} onChange={setBalance} placeholder="0" allowNegative />
            </Field>
          )}

          {/* La grilla entera de íconos acá adentro tapaba el resto del
              formulario: había que pasarla toda para llegar a "Guardar".
              Queda la vista previa y el botón que abre el selector. */}
          <StyleRow
            label="Ícono"
            hint={icon ? MATERIAL_SYMBOLS[icon]?.label : "El que le toca por su tipo"}
            preview={<AccountMark account={{ type, icon }} size={34} />}
            onOpen={() => setStyleOpen(true)}
          />

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <StylePickerDialog
        key={`estilo-${styleOpen}`}
        open={styleOpen && open}
        onClose={() => setStyleOpen(false)}
        title="Ícono de la cuenta"
        value={{ icon }}
        autoHint="Por tipo"
        preview={(style) => <AccountMark account={{ type, icon: style.icon }} size={34} />}
        onSave={(style) => {
          setIcon(style.icon);
          setStyleOpen(false);
        }}
      />

      {/* `&& open`: la confirmación no sobrevive al diálogo que la abrió. */}
      <ConfirmDialog
        open={confirmingDelete && open}
        title="¿Eliminar esta cuenta?"
        description="Los movimientos que tenía quedan sin cuenta asignada, no se borran. Las transferencias desde o hacia ella sí se eliminan."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
