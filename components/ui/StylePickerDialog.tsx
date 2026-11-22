"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconPicker } from "@/components/ui/IconPicker";
import { toneClasses } from "@/components/ui/CategoryMark";
import { CATEGORY_TONES, type CategoryTone } from "@/lib/categoryStyle";

interface Style {
  icon: string | null;
  /** `undefined` cuando quien lo usa no ofrece color (las cuentas). */
  color?: CategoryTone | null;
}

/**
 * Elegir ícono y color, en un diálogo aparte.
 *
 * **Las dos grillas no pueden vivir en el formulario.** Treinta y siete
 * íconos y once colores sueltos entre el nombre y el botón de guardar
 * tapan todo lo demás: en el diálogo de la cuenta había que pasar la
 * grilla entera para llegar a "Guardar", y en el de la categoría el nombre
 * quedaba arriba de un muro de cuadritos. Acá adentro tienen el espacio
 * que necesitan, y afuera queda una sola fila con la vista previa.
 *
 * El color es opcional: una cuenta no tiene: su marca se tiñe sola.
 */
export function StylePickerDialog({
  open,
  onClose,
  title,
  value,
  onSave,
  preview,
  autoHint = "Auto",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: Style;
  onSave: (style: Style) => void;
  /** Cómo se ve con lo que se está eligiendo. Lo dibuja quien lo usa. */
  preview: (style: Style) => ReactNode;
  autoHint?: string;
}) {
  const [icon, setIcon] = useState(value.icon);
  const [color, setColor] = useState(value.color ?? null);
  const ofreceColor = value.color !== undefined;

  // Se guarda al confirmar, no al tocar cada cuadrito: así cancelar deja
  // todo como estaba.
  const actual: Style = ofreceColor ? { icon, color } : { icon };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Se abre encima del formulario, que es un diálogo de la capa base.
      layer="top"
      size="lg"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onSave(actual)}>
            Listo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-surface bg-surface-raised p-3">
          {preview(actual)}
          <span className="text-label text-ink-2">Así se va a ver</span>
        </div>

        {ofreceColor && (
          <div role="group" aria-label="Color">
            <p className="pb-2 text-label text-ink-2">Color</p>
            <div className="flex flex-wrap gap-1.5">
              <ToneButton tone={null} selected={color === null} onClick={() => setColor(null)} />
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
        )}

        <IconPicker value={icon} onChange={setIcon} autoHint={autoHint} />
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

/**
 * La fila que reemplaza a las grillas en el formulario: la vista previa y
 * el botón que abre el diálogo.
 */
export function StyleRow({
  label = "Ícono",
  preview,
  onOpen,
  hint,
}: {
  label?: string;
  preview: ReactNode;
  onOpen: () => void;
  /** Lo elegido, en una palabra ("Automático", "Naranja"…). */
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-surface border border-line bg-surface-raised p-3">
      <span className="flex min-w-0 items-center gap-2.5">
        {preview}
        <span className="flex min-w-0 flex-col">
          <span className="text-label text-ink">{label}</span>
          {hint && <span className="truncate text-micro text-ink-3">{hint}</span>}
        </span>
      </span>
      <Button variant="secondary" size="sm" onClick={onOpen}>
        Cambiar
      </Button>
    </div>
  );
}
