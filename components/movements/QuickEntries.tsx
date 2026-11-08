"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { Money } from "@/components/ui/Money";
import type { QuickEntry } from "@/lib/quickEntry";

/**
 * "Lo de siempre": los movimientos que más repetís, listos de un toque.
 *
 * Un toque llena monto, detalle, categoría y cuenta, y solo queda guardar.
 * No guarda directo a propósito: el almuerzo no siempre cuesta lo mismo, y
 * un botón que escribe en la base sin que se vea qué escribió es la forma
 * más rápida de meter un dato equivocado.
 */
export function QuickEntries({
  entries,
  onPick,
}: {
  entries: QuickEntry[];
  onPick: (entry: QuickEntry) => void;
}) {
  return (
    <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 scrollbar-none">
      {entries.map((entry) => (
        <button
          key={entry.description}
          type="button"
          onClick={() => onPick(entry)}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-control border border-line-strong px-2.5 text-label text-ink transition-[color,border-color,transform] duration-150 hover:border-ink active:scale-[0.97] motion-reduce:active:scale-100"
        >
          <CategoryMark category={entry.category} size={18} className="rounded-[4px]" />
          <span className="max-w-[9rem] truncate">{entry.description}</span>
          <Money value={entry.amount} className="text-ink-3" />
          <ArrowCounterClockwise size={12} aria-hidden className="shrink-0 text-ink-3" />
        </button>
      ))}
    </div>
  );
}
