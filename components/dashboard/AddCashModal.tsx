"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CaretDown, CheckCircle } from "@phosphor-icons/react";
import { addCashTransaction, suggestCategory } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { BANK_BRAND } from "@/lib/bankBrand";
import {
  DEFAULT_EXPENSE_CATEGORIES as expenseCategories,
  DEFAULT_INCOME_CATEGORIES as incomeCategories,
} from "@/lib/categories";
import type { BankName, TransactionType, UserCategory } from "@/lib/types";
import { AmountInput, BankPicker, CategoryPicker, TypeToggle } from "./TransactionFormFields";

// Tiempo de pausa al tipear antes de pedirle a la IA que sugiera categoría.
const AI_SUGGEST_DELAY_MS = 650;

/** "YYYY-MM-DDTHH:mm" en hora local, para el valor inicial de <input type="datetime-local">. */
function nowForInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formulario de movimiento manual. Se abre desde CashEntryProvider, que lo
 * remonta en cada apertura — por eso el estado arranca limpio sin reset.
 */
export function AddCashModal({
  open,
  onClose,
  customCategories = [],
}: {
  open: boolean;
  onClose: () => void;
  customCategories?: UserCategory[];
}) {
  const formId = useId();
  const detailsId = useId();
  const [saved, setSaved] = useState(false);

  const allExpenseCategories = [
    ...expenseCategories,
    ...customCategories.filter((c) => c.type === "EXPENSE").map((c) => c.name),
  ];
  const allIncomeCategories = [
    ...incomeCategories,
    ...customCategories.filter((c) => c.type === "INCOME").map((c) => c.name),
  ];

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState<BankName>("Efectivo");
  const [category, setCategory] = useState(allExpenseCategories[0]);
  const [categoryIsAiPick, setCategoryIsAiPick] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const categories = type === "EXPENSE" ? allExpenseCategories : allIncomeCategories;
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(nowForInput);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRequestId = useRef(0);

  function pickType(t: TransactionType) {
    setType(t);
    setCategory(t === "EXPENSE" ? allExpenseCategories[0] : allIncomeCategories[0]);
    setCategoryIsAiPick(false);
  }

  function pickCategory(c: string) {
    setCategory(c);
    setCategoryIsAiPick(false);
  }

  // Sugerencia de categoría por IA: dispara sola una pausa después de que el
  // usuario deja de tipear la descripción, así no hace falta ni un botón ni
  // un tap extra para la mayoría de los movimientos.
  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);

    if (value.trim().length < 3) {
      setSuggesting(false);
      return;
    }

    const requestId = ++suggestRequestId.current;
    suggestTimer.current = setTimeout(async () => {
      setSuggesting(true);
      const result = await suggestCategory({
        description: value,
        type,
        amount: Number(amount.replace(",", ".")) || 0,
        bank,
      });
      if (requestId !== suggestRequestId.current) return;
      setSuggesting(false);
      if (result.category) {
        setCategory(result.category);
        setCategoryIsAiPick(true);
      }
    }, AI_SUGGEST_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, []);

  function submit() {
    setError(null);
    if (!amount || Number(amount.replace(",", ".")) <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    startTransition(async () => {
      const result = await addCashTransaction({
        amount: Number(amount.replace(",", ".")),
        description: description.trim(),
        category,
        type,
        transactionDate: new Date(date).toISOString(),
        bank,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(onClose, 900);
      }
    });
  }

  const categoryStatus = suggesting
    ? "buscando la categoría…"
    : categoryIsAiPick
      ? "sugerida según la descripción"
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!pending && !saved}
      title="Nuevo movimiento"
      footer={
        saved ? undefined : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={pending}>
              {pending ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </>
        )
      }
    >
      {saved ? (
        <p role="status" className="flex items-center gap-2.5 py-6 text-sm text-ink">
          <CheckCircle size={20} weight="fill" className="shrink-0 text-income" aria-hidden />
          Listo, ya está en tus movimientos.
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
          <TypeToggle value={type} onChange={pickType} />

          <AmountInput value={amount} onChange={setAmount} autoFocus />

          <Field label="Descripción">
            <input
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={type === "EXPENSE" ? "¿En qué? (ej. Uber, súper...)" : "¿De dónde? (opcional)"}
              className={inputClass}
            />
          </Field>

          <CategoryPicker
            categories={categories}
            value={category}
            onChange={pickCategory}
            status={categoryStatus}
          />

          <div className="border-y border-line">
            <button
              type="button"
              aria-expanded={showDetails}
              aria-controls={detailsId}
              onClick={() => setShowDetails((v) => !v)}
              className="flex h-11 w-full items-center justify-between gap-3 text-left text-label text-ink-2 transition-colors duration-150 cursor-pointer hover:text-ink"
            >
              <span>
                Origen y fecha{" "}
                <span className="font-normal text-ink-3">
                  · {bank === "Efectivo" ? "Efectivo" : BANK_BRAND[bank].initials},{" "}
                  {new Date(date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                </span>
              </span>
              <CaretDown
                size={14}
                aria-hidden
                className={`shrink-0 transition-transform duration-150 ${showDetails ? "rotate-180" : ""}`}
              />
            </button>
            {showDetails && (
              <div id={detailsId} className="flex flex-col gap-4 pb-4">
                <BankPicker label="¿De dónde salió? (si no te llegó solo)" value={bank} onChange={setBank} />
                <Field label="Fecha y hora">
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </div>

          <FormError>{error}</FormError>
        </form>
      )}
    </Dialog>
  );
}
