"use client";

import { useId, useState, useTransition } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { deleteTransaction, updateTransaction } from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { BANK_BRAND } from "@/lib/bankBrand";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import type { BankName, Transaction, TransactionType, UserCategory } from "@/lib/types";
import { BankLogo } from "./BankLogo";
import { AmountInput, BankPicker, CategoryPicker, TypeToggle } from "./TransactionFormFields";

const TZ = "America/Costa_Rica";

function Row({ label, children, selectable = false }: { label: string; children: React.ReactNode; selectable?: boolean }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="pt-px text-meta text-ink-3">{label}</dt>
      <dd className={`min-w-0 break-words text-sm text-ink ${selectable ? "select-text" : ""}`}>{children}</dd>
    </div>
  );
}

/** "YYYY-MM-DDTHH:mm" en hora local, para <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TransactionDetailModal({
  transaction,
  customCategories = [],
  onClose,
}: {
  transaction: Transaction | null;
  customCategories?: UserCategory[];
  onClose: () => void;
}) {
  const toast = useToast();
  const formId = useId();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Se guarda el último movimiento mostrado para que el diálogo pueda
  // animar su salida con el contenido todavía puesto.
  const [shown, setShown] = useState<Transaction | null>(transaction);
  if (transaction && transaction !== shown) setShown(transaction);
  const t = transaction ?? shown;

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState<BankName>("Efectivo");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const allExpenseCategories = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...customCategories.filter((c) => c.type === "EXPENSE").map((c) => c.name),
  ];
  const allIncomeCategories = [
    ...DEFAULT_INCOME_CATEGORIES,
    ...customCategories.filter((c) => c.type === "INCOME").map((c) => c.name),
  ];
  const categories = type === "EXPENSE" ? allExpenseCategories : allIncomeCategories;

  function handleClose() {
    setConfirming(false);
    setEditing(false);
    setError(null);
    onClose();
  }

  function startEditing() {
    if (!transaction) return;
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setBank(transaction.bank_name);
    setCategory(
      transaction.category ??
        (transaction.type === "EXPENSE" ? allExpenseCategories[0] : allIncomeCategories[0])
    );
    setDescription(transaction.description ?? "");
    setDate(toLocalInput(transaction.transaction_date));
    setError(null);
    setEditing(true);
  }

  function pickType(next: TransactionType) {
    setType(next);
    setCategory(next === "EXPENSE" ? allExpenseCategories[0] : allIncomeCategories[0]);
  }

  function handleSave() {
    if (!transaction) return;
    setError(null);
    if (!amount || Number(amount.replace(",", ".")) <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    startTransition(async () => {
      const result = await updateTransaction(transaction.id, {
        amount: Number(amount.replace(",", ".")),
        description: description.trim(),
        category,
        type,
        transactionDate: new Date(date).toISOString(),
        bank,
      });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Movimiento actualizado");
        setEditing(false);
      }
    });
  }

  function handleDelete() {
    if (!transaction) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        setConfirming(false);
      } else {
        toast.success("Movimiento eliminado");
        handleClose();
      }
    });
  }

  const income = t?.type === "INCOME";

  return (
    <>
      <Dialog
        open={Boolean(transaction)}
        onClose={editing ? () => setEditing(false) : handleClose}
        dismissible={!isPending}
        title={
          editing ? "Editar movimiento" : (t?.description ?? (income ? "Ingreso" : "Gasto"))
        }
        footer={
          editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form={formId} disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger-ghost" onClick={() => setConfirming(true)} className="sm:mr-auto">
                <Trash size={15} />
                Eliminar
              </Button>
              <Button variant="secondary" onClick={startEditing}>
                <PencilSimple size={15} />
                Editar
              </Button>
            </>
          )
        }
      >
        {t && !editing && (
          <>
            <div className="flex items-center gap-3 pb-4">
              <BankLogo bank={t.bank_name} size={36} />
              <div className="min-w-0">
                <Money
                  value={income ? t.amount : -t.amount}
                  plus
                  className={`block text-figure ${income ? "text-income" : "text-ink"}`}
                />
                <p className="text-meta text-ink-3">
                  {BANK_BRAND[t.bank_name].label} · {income ? "Ingreso" : "Gasto"}
                </p>
              </div>
            </div>

            <dl className="divide-y divide-line border-t border-line">
              <Row label="Categoría">
                {t.category ?? <span className="text-ink-3">Sin categoría</span>}
              </Row>
              <Row label="Origen">{t.is_automated ? "Automático (correo)" : "Manual"}</Row>
              <Row label="Fecha">
                {new Intl.DateTimeFormat("es-CR", {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone: TZ,
                }).format(new Date(t.transaction_date))}
              </Row>
              <Row label="Registrado">
                {new Intl.DateTimeFormat("es-CR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: TZ,
                }).format(new Date(t.created_at))}
              </Row>
              <Row label="ID" selectable>
                <span className="font-mono text-meta text-ink-2">{t.id}</span>
              </Row>
              {t.gmail_message_id && (
                <Row label="ID de correo" selectable>
                  <span className="font-mono text-meta text-ink-2">{t.gmail_message_id}</span>
                </Row>
              )}
            </dl>
            {error && (
              <div className="pt-3">
                <FormError>{error}</FormError>
              </div>
            )}
          </>
        )}

        {t && editing && (
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-5"
          >
            <TypeToggle value={type} onChange={pickType} />
            <AmountInput value={amount} onChange={setAmount} />
            <Field label="Descripción">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                className={inputClass}
              />
            </Field>
            <CategoryPicker categories={categories} value={category} onChange={setCategory} />
            <BankPicker label="Entidad" value={bank} onChange={setBank} />
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

      <ConfirmDialog
        open={confirming}
        title="¿Eliminar este movimiento?"
        description="Esta acción no se puede deshacer."
        pending={isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
