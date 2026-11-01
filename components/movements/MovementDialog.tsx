"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { addTransaction, deleteTransaction, updateTransaction } from "@/app/dashboard/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { expenseCategories, incomeCategories } from "@/lib/categories";
import { monthKey } from "@/lib/fixedExpenses";
import { deleteReceiptFile } from "@/lib/receiptUpload";
import type { Account, Transaction, TransactionType, UserCategory } from "@/lib/types";
import {
  AmountInput,
  CategoryPicker,
  TypeToggle,
  formatAmountInput,
  parseAmount,
} from "./MovementFields";
import { ReceiptField } from "./ReceiptField";

/** "YYYY-MM-DDTHH:mm" en hora local, para <input type="datetime-local">. */
function forInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

const monthFormat = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10" a "octubre de 2026". */
function monthName(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Alta y edición de un movimiento en el mismo formulario: los campos son los
 * mismos, y tener dos diálogos casi iguales era la mitad de los modales que
 * había antes. El provider lo remonta en cada apertura, así que el estado
 * arranca del movimiento recibido sin resets a mano.
 */
export function MovementDialog({
  open,
  onClose,
  movement,
  customCategories = [],
  accounts = [],
}: {
  open: boolean;
  onClose: () => void;
  /** Movimiento a editar, o null para registrar uno nuevo. */
  movement?: Transaction | null;
  customCategories?: UserCategory[];
  accounts?: Account[];
}) {
  const toast = useToast();
  const formId = useId();
  const editing = Boolean(movement);

  const expense = expenseCategories(customCategories);
  const income = incomeCategories(customCategories);

  const [type, setType] = useState<TransactionType>(movement?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(movement ? formatAmountInput(movement.amount) : "");
  const [description, setDescription] = useState(movement?.description ?? "");
  const [category, setCategory] = useState(
    movement?.category ?? (movement?.type === "INCOME" ? income[0] : expense[0])
  );
  const [date, setDate] = useState(
    forInput(movement ? new Date(movement.transaction_date) : new Date())
  );
  // Un movimiento nuevo cae en la primera cuenta, que es la de casi todos
  // los días; cambiarla es un toque.
  const [accountId, setAccountId] = useState<string | null>(
    movement ? movement.account_id : (accounts[0]?.id ?? null)
  );
  const originalReceipt = movement?.receipt_url ?? null;
  const [receiptPath, setReceiptPath] = useState<string | null>(originalReceipt);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  // El comprobante se sube al elegirlo, antes de guardar el movimiento: si el
  // formulario se cierra sin guardar hay que borrar ese archivo, que si no
  // queda en el bucket sin que ningún movimiento lo referencie.
  const savedRef = useRef(false);

  const categories = type === "EXPENSE" ? expense : income;

  // El mes de hoy se calcula una sola vez al montar: leer el reloj durante
  // el render es impuro y React lo prohíbe.
  const [currentMonth] = useState(() => monthKey());
  const pickedMonth = date.slice(0, 7);
  const otherMonth =
    pickedMonth && pickedMonth !== currentMonth ? monthName(pickedMonth) : null;

  function close() {
    if (!savedRef.current && receiptPath && receiptPath !== originalReceipt) {
      void deleteReceiptFile(receiptPath);
    }
    onClose();
  }

  function pickType(next: TransactionType) {
    setType(next);
    // La categoría elegida pertenece a la otra lista: se cambia por la
    // primera de la nueva en vez de dejar marcado un chip que no se muestra.
    const nextCategories = next === "EXPENSE" ? expense : income;
    if (!nextCategories.includes(category)) setCategory(nextCategories[0]);
  }

  function submit() {
    setError(null);
    const value = parseAmount(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }

    startTransition(async () => {
      const input = {
        amount: value,
        description,
        category,
        type,
        transactionDate: new Date(date).toISOString(),
        accountId,
        receiptPath,
      };
      const result = movement
        ? await updateTransaction(movement.id, input)
        : await addTransaction(input);

      if (result?.error) {
        setError(result.error);
        return;
      }
      savedRef.current = true;
      toast.success(editing ? "Movimiento actualizado" : "Movimiento registrado");
      onClose();
    });
  }

  function remove() {
    if (!movement) return;
    startTransition(async () => {
      const result = await deleteTransaction(movement.id);
      if (result?.error) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      // El movimiento (y con él su comprobante) ya no existe: nada que
      // limpiar al cerrar.
      savedRef.current = true;
      toast.success("Movimiento eliminado");
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={close}
        dismissible={!pending}
        title={editing ? "Editar movimiento" : "Nuevo movimiento"}
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
            <Button variant="secondary" onClick={close} disabled={pending}>
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
          <TypeToggle value={type} onChange={pickType} />

          <AmountInput value={amount} onChange={setAmount} autoFocus />

          <Field label="Descripción">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "EXPENSE" ? "Súper, gasolina, almuerzo…" : "Salario de octubre, proyecto…"
              }
              className={inputClass}
            />
          </Field>

          <CategoryPicker
            categories={categories}
            value={category}
            onChange={setCategory}
            label={type === "INCOME" ? "Tipo de ingreso" : "Categoría"}
          />

          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label={type === "INCOME" ? "¿A qué cuenta entró?" : "¿De qué cuenta salió?"}
          />

          <Field
            label="Fecha y hora"
            // El resumen cuenta solo el mes en curso. Sin este aviso, quien
            // anota algo de un mes pasado ve que las cifras de arriba no se
            // mueven y concluye que no se guardó.
            hint={
              otherMonth
                ? `Queda registrado en ${otherMonth}, así que no entra en las cifras del resumen de este mes. Lo vas a ver acá, en Movimientos.`
                : undefined
            }
          >
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <ReceiptField path={receiptPath} onChange={setReceiptPath} onError={setError} />

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar este movimiento?"
        description="Esta acción no se puede deshacer."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
