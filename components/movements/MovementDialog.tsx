"use client";

import { useId, useRef, useState, useTransition } from "react";
import { CaretDown, CurrencyDollar, Trash, Users } from "@phosphor-icons/react";
import { addTransaction, deleteTransaction, updateTransaction } from "@/app/dashboard/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQueueOwner } from "@/components/offline/QueueOwner";
import { queueMovement } from "@/components/offline/useOfflineQueue";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { expenseCategories, incomeCategories } from "@/lib/categories";
import { monthKey } from "@/lib/fixedExpenses";
import { isFrameworkNavigation, isNetworkFailure, localId } from "@/lib/offline";
import { deleteReceiptFile } from "@/lib/receiptUpload";
import { frequentEntries, type RecentMovement } from "@/lib/quickEntry";
import { suggestFor } from "@/lib/smartMatch";
import { conversionLabel, DEFAULT_USD_RATE, isValidRate, usdToCrc } from "@/lib/usd";
import type { Account, Transaction, TransactionType, UserCategory } from "@/lib/types";
import {
  AmountInput,
  CategoryPicker,
  EntryKindToggle,
  TypeToggle,
  formatAmountInput,
  parseAmount,
} from "./MovementFields";
import { BillSplitPanel } from "./BillSplitPanel";
import { QuickEntries } from "./QuickEntries";
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
  recent = [],
  initialType = "EXPENSE",
  onTransfer,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Pasar al formulario de transferencia entre cuentas. Si no viene, el
   * control de arriba solo ofrece gasto e ingreso — es lo que pasa al
   * editar un movimiento ya guardado y cuando hay una sola cuenta.
   */
  onTransfer?: () => void;
  /** Movimiento a editar, o null para registrar uno nuevo. */
  movement?: Transaction | null;
  /** Pestaña marcada al abrir uno nuevo. Al editar manda el movimiento. */
  initialType?: TransactionType;
  customCategories?: UserCategory[];
  accounts?: Account[];
  /** Movimientos recientes, para sugerir categoría y cuenta. */
  recent?: RecentMovement[];
}) {
  const toast = useToast();
  const formId = useId();
  const editing = Boolean(movement);

  const expense = expenseCategories(customCategories);
  const income = incomeCategories(customCategories);

  const [type, setType] = useState<TransactionType>(movement?.type ?? initialType);
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
  const owner = useQueueOwner();

  // Anotar en dólares: se convierte al guardar y lo que queda registrado es
  // un monto en colones, como cualquier otro.
  const [usd, setUsd] = useState(false);
  const [rate, setRate] = useState(String(DEFAULT_USD_RATE));
  const [splitOpen, setSplitOpen] = useState(false);
  /**
   * Cuenta, fecha y comprobante arrancan plegados.
   *
   * De los ocho bloques del formulario, seis son siempre lo mismo en un
   * gasto del día a día: la cuenta de siempre, ahora, sin foto. Teniéndolos
   * desplegados hay que bajar con el teclado abierto —que tapa media
   * pantalla— para llegar a la categoría, y eso es lo que hacía lento
   * anotar. Al editar van abiertos: ahí uno viene justamente a revisar.
   */
  const [detailsOpen, setDetailsOpen] = useState(editing || Boolean(originalReceipt));

  // La sugerencia solo pisa la categoría mientras nadie la haya tocado a
  // mano: adivinar por encima de una decisión explícita es peor que no
  // adivinar.
  const [touchedCategory, setTouchedCategory] = useState(editing);
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

  // La sugerencia se CALCULA en el render, no se guarda en estado ni se
  // sincroniza con un efecto: es una función pura de lo que hay escrito.
  // Guardarla obligaría a mantener dos fuentes de verdad en sincronía, que
  // es de donde salen los formularios que se "pegan" en un valor viejo.
  const suggested =
    touchedCategory || type !== "EXPENSE"
      ? null
      : suggestFor(description, categories, recent);

  // De los mismos movimientos recientes que ya alimentan la sugerencia de
  // categoría: no hay consulta nueva.
  const frequent = frequentEntries(recent, type);

  const effectiveCategory = suggested?.category ?? category;
  const effectiveAccountId =
    suggested?.accountId && accounts.some((a) => a.id === suggested.accountId)
      ? suggested.accountId
      : accountId;

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
    const typed = parseAmount(amount);
    if (!amount || !Number.isFinite(typed) || typed <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }

    const parsedRate = Number(rate.replace(",", "."));
    if (usd && !isValidRate(parsedRate)) {
      setError("El tipo de cambio no parece válido. Revisalo.");
      return;
    }
    const value = usd ? usdToCrc(typed, parsedRate) : typed;

    startTransition(async () => {
      // El mismo id para el intento con señal y para el reintento desde la
      // cola: si el primero llegó al servidor y lo que se perdió fue la
      // respuesta, el segundo choca con el índice único y no duplica el
      // gasto (migración 0024).
      const input = {
        amount: value,
        description,
        category: effectiveCategory,
        type,
        transactionDate: new Date(date).toISOString(),
        accountId: effectiveAccountId,
        receiptPath,
        clientId: localId(),
        // Esta pantalla se dibujó con esta sesión. Si la cookie ya es de
        // otra cuenta (pestaña vieja, cambio de usuario en la compu), el
        // servidor lo rechaza en vez de anotarlo donde no va.
        expectedUserId: owner,
      };
      // Sin señal, un movimiento nuevo se guarda en el teléfono en vez de
      // perderse. Editar y borrar no: esas tocan una fila que ya existe en
      // la base, y resolverlas a ciegas desde una cola local es cómo se
      // pierde la edición de otro dispositivo.
      if (
        !movement &&
        owner &&
        typeof navigator !== "undefined" &&
        navigator.onLine === false
      ) {
        await queueMovement(owner, input);
        savedRef.current = true;
        toast.success("Sin señal: se guardó acá y se manda solo");
        onClose();
        return;
      }

      let result: { error: string | null } | undefined;
      try {
        result = movement
          ? await updateTransaction(movement.id, input)
          : await addTransaction(input);
      } catch (networkError) {
        // Un redirect del servidor (sesión vencida) no es un fallo: se deja
        // pasar para que la navegación ocurra en vez de mostrar un error
        // de conexión que no tiene nada que ver.
        if (isFrameworkNavigation(networkError)) throw networkError;
        if (!movement && owner && isNetworkFailure(networkError)) {
          await queueMovement(owner, input);
          savedRef.current = true;
          toast.success("Sin señal: se guardó acá y se manda solo");
          onClose();
          return;
        }
        setError("No se pudo guardar. Revisá la conexión e intentá de nuevo.");
        return;
      }

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
      setConfirmingDelete(false);
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
          {onTransfer ? (
            <EntryKindToggle
              value={type}
              canTransfer
              onChange={(kind) => (kind === "TRANSFER" ? onTransfer() : pickType(kind))}
            />
          ) : (
            <TypeToggle value={type} onChange={pickType} />
          )}

          {/* Lo de siempre: un toque llena monto, detalle, categoría y
              cuenta. Solo al registrar — al editar no hay nada que repetir. */}
          {!editing && frequent.length > 0 && (
            <QuickEntries
              entries={frequent}
              onPick={(entry) => {
                setAmount(formatAmountInput(entry.amount));
                setDescription(entry.description);
                setCategory(entry.category ?? categories[0]);
                setTouchedCategory(true);
                if (entry.accountId) setAccountId(entry.accountId);
              }}
            />
          )}

          <div className="flex flex-col gap-2">
            <AmountInput
              value={amount}
              onChange={setAmount}
              autoFocus
              label={usd ? "Monto en dólares" : "Monto"}
            />

            {usd && (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Tipo de cambio" className="w-[8.5rem]">
                  <input
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className={`${inputClass} money`}
                  />
                </Field>
                {parseAmount(amount) > 0 && isValidRate(Number(rate.replace(",", "."))) && (
                  <p className="pb-2 text-meta text-ink-3">
                    {conversionLabel(parseAmount(amount), Number(rate.replace(",", ".")))} ={" "}
                    <Money
                      value={usdToCrc(parseAmount(amount), Number(rate.replace(",", ".")))}
                      className="text-ink"
                    />
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={usd}
                onClick={() => setUsd((v) => !v)}
                className="-ml-2"
              >
                <CurrencyDollar size={14} />
                {usd ? "Volver a colones" : "Anotar en dólares"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={splitOpen}
                aria-expanded={splitOpen}
                onClick={() => setSplitOpen((v) => !v)}
              >
                <Users size={14} />
                Dividir cuenta
              </Button>
            </div>

            {splitOpen && (
              <BillSplitPanel
                onApply={(yours, message) => {
                  setUsd(false);
                  setAmount(formatAmountInput(yours));
                  if (!description.trim()) setDescription(message);
                  setSplitOpen(false);
                }}
              />
            )}
          </div>

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
            createType={type}
            value={effectiveCategory}
            onChange={(next) => {
              setTouchedCategory(true);
              setCategory(next);
            }}
            label={type === "INCOME" ? "Tipo de ingreso" : "Categoría"}
          />

          {suggested?.source && (
            <p className="-mt-3 text-meta text-ink-3">
              {suggested.source === "historial"
                ? "Categoría y cuenta tomadas de la última vez que anotaste algo parecido."
                : "Categoría sugerida por el comercio. Cambiala si no es."}
            </p>
          )}

          {detailsOpen ? (
            <>
              <AccountPicker
                accounts={accounts}
                value={effectiveAccountId}
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
            </>
          ) : (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="-mt-1 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-control text-label text-ink-3 transition-colors duration-150 hover:text-ink"
            >
              <CaretDown size={12} weight="bold" aria-hidden />
              Más detalles
            </button>
          )}

          <FormError>{error}</FormError>
        </form>
      </Dialog>

      {/* `&& open`: la confirmación no sobrevive al diálogo que la abrió. */}
      <ConfirmDialog
        open={confirmingDelete && open}
        title="¿Eliminar este movimiento?"
        description="Esta acción no se puede deshacer."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
