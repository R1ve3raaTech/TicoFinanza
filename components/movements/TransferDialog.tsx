"use client";

import { useId, useState, useTransition } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { createTransfer } from "@/app/dashboard/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Select, inputClass } from "@/components/ui/Field";
import { accountTypeLabel } from "@/lib/accounts";
import type { Account, TransactionType } from "@/lib/types";
import { AmountInput, EntryKindToggle, parseAmount } from "./MovementFields";

/** "YYYY-MM-DDTHH:mm" en hora local, para <input type="datetime-local">. */
function forInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

/**
 * Mover plata entre dos billeteras propias (sacar del cajero, pagar la
 * tarjeta, apartar al ahorro).
 *
 * No es ingreso ni gasto: baja un saldo y sube el otro, y el superávit del
 * mes no se entera. La pantalla lo dice con todas las letras, porque es la
 * duda número uno de cualquiera que usa esto por primera vez.
 *
 * Con `onPickMovement` arriba aparece el mismo control de tres opciones que
 * el formulario de movimientos, para poder devolverse: abierto desde ahí,
 * esto es una de las tres cosas que se pueden anotar, no un formulario
 * aparte al que uno llegó por otro lado.
 */
export function TransferDialog({
  open,
  onClose,
  accounts,
  defaultFromId,
  onPickMovement,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  defaultFromId?: string | null;
  /** Volver al formulario de gasto o ingreso. Sin esto no se dibuja el
   *  control de arriba (el caso de "Transferir" desde "Tus cuentas"). */
  onPickMovement?: (type: TransactionType) => void;
}) {
  const toast = useToast();
  const formId = useId();
  const fromId = useId();
  const toId = useId();

  const [from, setFrom] = useState(defaultFromId ?? accounts[0]?.id ?? "");
  const [to, setTo] = useState(
    accounts.find((a) => a.id !== (defaultFromId ?? accounts[0]?.id))?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(forInput(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = parseAmount(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    if (!from || !to) {
      setError("Elegí la cuenta de origen y la de destino.");
      return;
    }
    if (from === to) {
      setError("El origen y el destino tienen que ser cuentas distintas.");
      return;
    }

    startTransition(async () => {
      const result = await createTransfer({
        fromAccountId: from,
        toAccountId: to,
        amount: value,
        description,
        transferDate: new Date(date).toISOString(),
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Transferencia registrada");
      onClose();
    });
  }

  const options = accounts.map((account) => (
    <option key={account.id} value={account.id}>
      {account.name} · {accountTypeLabel(account.type).toLowerCase()}
    </option>
  ));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title="Transferencia entre cuentas"
      description="No cuenta como ingreso ni como gasto."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            disabled={pending || accounts.length < 2}
          >
            {pending ? "Guardando..." : "Transferir"}
          </Button>
        </>
      }
    >
      {accounts.length < 2 ? (
        <p className="py-4 text-sm text-ink-2">
          Para transferir hacen falta al menos dos cuentas.
        </p>
      ) : (
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          {onPickMovement && (
            <EntryKindToggle
              value="TRANSFER"
              canTransfer
              onChange={(kind) => kind !== "TRANSFER" && onPickMovement(kind)}
            />
          )}

          <AmountInput value={amount} onChange={setAmount} autoFocus />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Desde" className="min-w-0 flex-1">
              <Select id={fromId} value={from} onChange={(e) => setFrom(e.target.value)}>
                {options}
              </Select>
            </Field>
            <ArrowRight
              size={16}
              aria-hidden
              className="hidden shrink-0 pb-3 text-ink-3 sm:block"
            />
            <Field label="Hasta" className="min-w-0 flex-1">
              <Select id={toId} value={to} onChange={(e) => setTo(e.target.value)}>
                {options}
              </Select>
            </Field>
          </div>

          <Field label="Detalle">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Retiro del cajero, pago de la tarjeta…"
              className={inputClass}
            />
          </Field>

          <Field label="Fecha y hora">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <FormError>{error}</FormError>
        </form>
      )}
    </Dialog>
  );
}
