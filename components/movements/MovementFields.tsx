"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import { addCategory } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { FormError, labelClass } from "@/components/ui/Field";
import { handleAmountChange } from "@/components/ui/MoneyInput";
import { Segmented } from "@/components/ui/Segmented";
import { ToggleChip } from "@/components/ui/ToggleChip";
import type { TransactionType } from "@/lib/types";

/** Piezas compartidas por el formulario de movimiento y el de gasto fijo. */

export function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}) {
  return (
    <Segmented
      ariaLabel="Tipo de movimiento"
      value={value}
      onChange={onChange}
      fullWidth
      options={[
        { value: "EXPENSE", label: "Gasto" },
        { value: "INCOME", label: "Ingreso", tone: "income" },
      ]}
    />
  );
}

/** Lo que se puede anotar: un gasto, un ingreso, o plata que se mueve de una
 *  billetera propia a otra. */
export type EntryKind = TransactionType | "TRANSFER";

/**
 * Las tres cosas que se pueden anotar, en el mismo control.
 *
 * La transferencia **existía desde la migración 0020** pero vivía detrás de
 * un botón chico en el panel "Tus cuentas" del resumen, lejos de donde uno
 * va cuando quiere registrar algo. El resultado real: pasar plata del ahorro
 * a la principal terminaba anotado como dos movimientos —un ingreso y un
 * gasto— que además ensucian el mes, porque un traslado no es ni lo uno ni
 * lo otro. Acá está donde se busca.
 *
 * "Transferir" solo aparece con dos cuentas o más (sin eso no hay a dónde
 * mover) y solo al registrar: un movimiento ya guardado no se convierte en
 * transferencia, son tablas distintas.
 */
export function EntryKindToggle({
  value,
  onChange,
  canTransfer,
}: {
  value: EntryKind;
  onChange: (kind: EntryKind) => void;
  canTransfer: boolean;
}) {
  return (
    <Segmented
      ariaLabel="Qué vas a anotar"
      value={value}
      onChange={onChange}
      fullWidth
      options={[
        { value: "EXPENSE", label: "Gasto" },
        { value: "INCOME", label: "Ingreso", tone: "income" },
        // "Transferir" y no "Transferencia": a 360px la palabra larga no
        // entra en un tercio del ancho del diálogo y parte en dos líneas.
        ...(canTransfer ? [{ value: "TRANSFER" as const, label: "Transferir" }] : []),
      ]}
    />
  );
}

export function AmountInput({
  value,
  onChange,
  autoFocus = false,
  label = "Monto",
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  label?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <span className="flex items-baseline gap-1.5 border-b border-line-strong pb-1 transition-colors duration-150 focus-within:border-accent">
        <span aria-hidden className="text-[1.5rem] leading-none text-ink-3">
          ₡
        </span>
        <input
          // El Dialog enfoca `data-autofocus` al abrirse (autoFocus de React
          // no deja el atributo en el DOM y el foco se lo ganaba el panel).
          data-autofocus={autoFocus ? "" : undefined}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          // Solo dígitos, y los miles se agrupan al escribir: ver
          // lib/amount.ts y components/ui/MoneyInput.tsx.
          onChange={(e) => handleAmountChange(e, onChange)}
          placeholder="0"
          // `money` son cifras de ancho fijo. Acá no es un detalle de
          // alineación: al agrupar los miles el texto cambia de largo
          // debajo del cursor, y con dígitos de ancho variable la cifra
          // entera se corre un pelo con cada tecla.
          className="money w-full min-w-0 bg-transparent text-[2.25rem] font-medium leading-tight tracking-[-0.03em] text-ink outline-none placeholder:text-ink-3/50 focus-visible:outline-none"
        />
      </span>
    </label>
  );
}

/**
 * Elegir la categoría, y crear una nueva sin salir del formulario.
 *
 * Las categorías propias existen desde siempre, pero vivían **solo** en
 * Ajustes → Categorías. En la práctica eso significa que quien está
 * anotando ₡29.000 de ferretería tiene que abandonar el formulario a medio
 * llenar, irse a otra pantalla, crear la categoría y volver a empezar. Nadie
 * hace eso: se elige "Otro" y la plata termina en una bolsa que no dice
 * nada. El botón de acá crea la categoría y la deja elegida en el mismo
 * toque.
 *
 * La recién creada se guarda además en un estado local (`justAdded`) y no se
 * espera a que el servidor devuelva la lista: la acción revalida la ruta,
 * pero el chip tiene que aparecer marcado ya, antes de ese viaje.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  label = "Categoría",
  createType,
}: {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  label?: string;
  /** Con esto aparece el botón de crear una categoría nueva de ese tipo. */
  createType?: TransactionType;
}) {
  const labelId = useId();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  // Lo que ya está en la lista del servidor no se repite acá.
  const extra = justAdded.filter((c) => !categories.includes(c));
  const all = [...categories, ...extra];

  function create() {
    if (!createType) return;
    const name = draft.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const result = await addCategory(name, createType);
      if (result.error || !result.name) {
        setError(result.error ?? "No se pudo agregar.");
        return;
      }
      setJustAdded((list) => [...list, result.name]);
      onChange(result.name);
      setDraft("");
      setAdding(false);
      toast.success(`"${result.name}" agregada`);
    });
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {all.map((c) => (
          <ToggleChip key={c} pressed={value === c} onClick={() => onChange(c)}>
            {/* La misma marca de color e ícono que la categoría tiene en las
                listas, para reconocerla sin leer. */}
            <CategoryMark category={c} size={16} className="-ml-0.5 rounded-[4px]" />
            {c}
          </ToggleChip>
        ))}

        {createType && !adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              // El foco se pide en el siguiente cuadro: el campo todavía no
              // existe en el DOM cuando corre este manejador.
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-control border border-dashed border-line-strong px-2.5 text-label text-ink-3 transition-[color,border-color,transform] duration-150 hover:border-ink hover:text-ink active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <Plus size={12} weight="bold" aria-hidden />
            Nueva
          </button>
        )}

        {createType && adding && (
          <span className="inline-flex h-8 items-center gap-1 rounded-control border border-accent pl-2 pr-0.5">
            <input
              ref={inputRef}
              value={draft}
              maxLength={24}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // El formulario de afuera guarda con Enter: acá Enter crea
                // la categoría y no el movimiento a medio llenar.
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
                if (e.key === "Escape") {
                  // `nativeEvent.stopPropagation()` y no solo el del evento
                  // de React: el diálogo escucha Escape en `document`, y sin
                  // frenar el evento nativo ahí, cancelar el nombre de la
                  // categoría cerraba el formulario entero a medio llenar.
                  e.preventDefault();
                  e.nativeEvent.stopPropagation();
                  setAdding(false);
                  setDraft("");
                  setError(null);
                }
              }}
              placeholder="Ferretería, mascotas…"
              aria-label="Nombre de la categoría nueva"
              className="w-36 bg-transparent text-label text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={create}
              disabled={pending || !draft.trim()}
              aria-label="Crear la categoría"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-ink-2 transition-colors duration-150 hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              <Check size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft("");
                setError(null);
              }}
              aria-label="Cancelar"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-ink-3 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
            >
              <X size={13} />
            </button>
          </span>
        )}
      </div>
      <FormError>{error}</FormError>
    </div>
  );
}

/**
 * `parseAmount` y `formatAmountInput` viven ahora en lib/amount.ts, junto
 * con la limpieza de lo que se escribe (que antes no existía: el campo
 * aceptaba letras). Se re-exportan desde acá porque los doce diálogos de la
 * app las importan de este archivo.
 */
export { formatAmountInput, parseAmount } from "@/lib/amount";
