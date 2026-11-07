"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { caretAfterDigits, countDigits, typedAmount } from "@/lib/amount";
import { inputClass } from "./Field";

/**
 * El comportamiento del campo de monto, compartido por todos los diálogos:
 * solo dígitos y los miles agrupados al escribir (ver lib/amount.ts).
 *
 * **Escribe el valor en el nodo antes de avisar.** Es lo que mantiene el
 * cursor en su lugar: si solo se levantara el estado, React vuelve a pintar
 * el campo con un texto más largo —se le metió un punto de miles— y el
 * navegador manda el cursor al final en cada tecla, así que corregir un
 * dígito en el medio de un monto es imposible. Al escribirlo acá, el texto
 * que React pinta después es el mismo que ya está en el DOM y no toca la
 * selección.
 */
export function handleAmountChange(
  event: ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
  allowNegative = false
): void {
  const el = event.currentTarget;
  const caret = el.selectionStart ?? el.value.length;
  const digitsBefore = countDigits(el.value.slice(0, caret));
  const next = typedAmount(el.value, allowNegative);

  if (next !== el.value) {
    el.value = next;
    const position = caretAfterDigits(next, digitsBefore);
    el.setSelectionRange(position, position);
  }

  onChange(next);
}

/**
 * Campo de monto del alto de un campo normal, para los formularios donde el
 * monto es un dato más (el saldo de una cuenta, la base de una cuenta
 * dividida). El monto protagonista de un movimiento usa `AmountInput`, que
 * es el mismo comportamiento con la cifra grande.
 *
 * `inputMode="decimal"` saca el teclado numérico en el teléfono; lo que
 * impide escribir letras es `handleAmountChange`, no el inputMode, que es
 * apenas una sugerencia al teclado.
 */
export function MoneyInput({
  value,
  onChange,
  allowNegative = false,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /** Permite un menos al principio. Solo el saldo de una cuenta lo usa. */
  allowNegative?: boolean;
}) {
  return (
    <input
      {...props}
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => handleAmountChange(e, onChange, allowNegative)}
      className={`${inputClass} money ${className}`}
    />
  );
}
