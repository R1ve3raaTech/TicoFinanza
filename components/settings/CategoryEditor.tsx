"use client";

import { useState, useTransition } from "react";
import { updateCategory } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { CategoryMark, toneClasses } from "@/components/ui/CategoryMark";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { CATEGORY_TONES, isCategoryTone, type CategoryTone } from "@/lib/categoryStyle";
import { MATERIAL_SYMBOLS, SYMBOL_NAMES } from "@/lib/materialSymbols";
import type { UserCategory } from "@/lib/types";

/**
 * Elegirle nombre, ícono y color a una categoría propia.
 *
 * Los íconos son Material Symbols de Google, con los trazos guardados en el
 * repo (ver lib/materialSymbols.ts): sin fuente externa, así siguen
 * dibujándose sin señal.
 *
 * Los colores son los diez tonos de la paleta de categorías, y se guarda la
 * clave del tono y no un hexadecimal, para que el mismo color valga en
 * tema claro y en oscuro.
 *
 * **"Automático" es una opción de verdad, y es la de arranque.** Sin ícono y
 * sin color elegidos, la app los decide sola a partir del nombre, que es lo
 * que venía haciendo y funciona bien. Obligar a elegir convertiría crear una
 * categoría en un trámite de tres decisiones.
 */
export function CategoryEditor({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category: UserCategory | null;
}) {
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null);
  const [color, setColor] = useState<CategoryTone | null>(
    isCategoryTone(category?.color) ? category.color : null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!category) return null;

  function submit() {
    if (!category) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCategory(category.id, { name, icon, color });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(`"${name.trim()}" guardada`);
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!pending}
      size="lg"
      title="Editar categoría"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <CategoryMark
            category={name || category.name}
            size={44}
            previewIcon={icon}
            previewTone={color ?? undefined}
          />
          <Field label="Nombre" className="min-w-0 flex-1">
            <input
              data-autofocus=""
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div role="group" aria-label="Color">
          <p className="pb-2 text-label text-ink-2">Color</p>
          <div className="flex flex-wrap gap-1.5">
            <ToneButton
              tone={null}
              selected={color === null}
              onClick={() => setColor(null)}
            />
            {CATEGORY_TONES.map((tone) => (
              <ToneButton
                key={tone}
                tone={tone}
                selected={color === tone}
                onClick={() => setColor(tone)}
              />
            ))}
          </div>
        </div>

        <div role="group" aria-label="Ícono">
          <p className="pb-2 text-label text-ink-2">Ícono</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
            <button
              type="button"
              aria-pressed={icon === null}
              aria-label="Ícono automático"
              onClick={() => setIcon(null)}
              className={`flex h-10 cursor-pointer items-center justify-center rounded-control border text-micro transition-[border-color,transform] duration-150 active:scale-[0.94] motion-reduce:active:scale-100 ${
                icon === null ? "border-ink text-ink" : "border-line text-ink-3 hover:border-line-strong"
              }`}
            >
              Auto
            </button>
            {SYMBOL_NAMES.map((symbol) => {
              const selected = icon === symbol;
              return (
                <button
                  key={symbol}
                  type="button"
                  aria-pressed={selected}
                  aria-label={MATERIAL_SYMBOLS[symbol].label}
                  title={MATERIAL_SYMBOLS[symbol].label}
                  onClick={() => setIcon(symbol)}
                  className={`flex h-10 cursor-pointer items-center justify-center rounded-control border transition-[border-color,color,transform] duration-150 active:scale-[0.94] motion-reduce:active:scale-100 ${
                    selected ? "border-ink text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <svg viewBox="0 -960 960 960" width={20} height={20} fill="currentColor" aria-hidden>
                    <path d={MATERIAL_SYMBOLS[symbol].path} />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        <FormError>{error}</FormError>
      </div>
    </Dialog>
  );
}

function ToneButton({
  tone,
  selected,
  onClick,
}: {
  tone: CategoryTone | null;
  selected: boolean;
  onClick: () => void;
}) {
  const classes = tone ? toneClasses(tone) : null;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={tone ? `Color ${tone}` : "Color automático"}
      onClick={onClick}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-control border transition-[border-color,transform] duration-150 active:scale-[0.94] motion-reduce:active:scale-100 ${
        selected ? "border-ink" : "border-transparent"
      } ${classes ? classes.soft : "bg-surface-raised"}`}
    >
      {tone ? (
        <span aria-hidden className={`h-4 w-4 rounded-[3px] ${classes?.dot}`} />
      ) : (
        <span aria-hidden className="text-micro text-ink-3">
          Auto
        </span>
      )}
    </button>
  );
}
