"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { addCategory, deleteCategory, updateCategory } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { StylePickerDialog, StyleRow } from "@/components/ui/StylePickerDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { isCategoryTone, type CategoryTone } from "@/lib/categoryStyle";
import { MATERIAL_SYMBOLS } from "@/lib/materialSymbols";
import type { TransactionType, UserCategory } from "@/lib/types";

/**
 * Las categorías propias, en su propio diálogo.
 *
 * Antes vivían apretadas en dos filas del diálogo de ajustes: una tira de
 * chips diminutos donde el mismo chip servía para editar y la X de al lado
 * para borrar, y el editor se abría como un TERCER diálogo encima. Acá hay
 * sitio para una lista de verdad —marca, nombre y sus dos acciones— y el
 * editor es **otra vista del mismo panel**, no otro diálogo: una pila de
 * tres ventanas no se sabe cuál cierra cuál.
 */
export function CategoryDialog({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: UserCategory[];
}) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [editing, setEditing] = useState<UserCategory | null>(null);

  const visible = categories.filter((c) => c.type === type);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Se abre encima del diálogo de ajustes.
      layer="top"
      size="lg"
      title={
        editing ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Volver a la lista"
              className="-ml-1.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-3 transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
            >
              <ArrowLeft size={15} />
            </button>
            <span className="truncate">{editing.name}</span>
          </span>
        ) : (
          "Categorías"
        )
      }
      footer={
        editing ? undefined : (
          <Button variant="secondary" onClick={onClose}>
            Listo
          </Button>
        )
      }
    >
      {editing ? (
        <CategoryForm
          // Remonta el formulario al cambiar de categoría: si no, los
          // campos se quedarían con los de la anterior.
          key={editing.id}
          category={editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Segmented
            value={type}
            onChange={setType}
            ariaLabel="Tipo de categoría"
            fullWidth
            options={[
              { value: "EXPENSE", label: "De gasto" },
              { value: "INCOME", label: "De ingreso" },
            ]}
          />

          <NewCategory type={type} />

          {visible.length > 0 ? (
            <ul className="border-t border-line">
              {visible.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onEdit={() => setEditing(category)}
                />
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-4 text-meta text-ink-3">
              Las que trae la app ya están disponibles. Acá aparecen las tuyas.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** Una categoría en la lista: su marca, su nombre y sus dos acciones. */
function CategoryItem({
  category,
  onEdit,
}: {
  category: UserCategory;
  onEdit: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.error) toast.error(result.error);
      else toast.success(`"${category.name}" eliminada`);
    });
  }

  return (
    <li className="flex items-center gap-3 border-b border-line py-2">
      <CategoryMark category={category.name} size={30} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{category.name}</span>
      <Button variant="ghost" size="sm" onClick={onEdit} disabled={pending}>
        <PencilSimple size={14} />
        Editar
      </Button>
      <Button
        variant="danger-ghost"
        size="sm"
        icon
        onClick={remove}
        disabled={pending}
        aria-label={`Borrar ${category.name}`}
      >
        <Trash size={14} />
      </Button>
    </li>
  );
}

/** El campo para crear una categoría nueva del tipo que se está viendo. */
function NewCategory({ type }: { type: TransactionType }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noun = type === "INCOME" ? "ingreso" : "gasto";

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await addCategory(trimmed, type);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setName("");
      toast.success(`"${trimmed}" agregada`);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Nueva categoría de ${noun}`}
          aria-label={`Nueva categoría de ${noun}`}
          className={inputClass}
        />
        <Button type="submit" variant="secondary" size="field" disabled={pending || !name.trim()}>
          <Plus size={14} />
          Agregar
        </Button>
      </div>
      <FormError>{error}</FormError>
    </form>
  );
}

/**
 * Nombre, ícono y color de una categoría propia.
 *
 * Los íconos son Material Symbols de Google con los trazos guardados en el
 * repo (ver lib/materialSymbols.ts): sin fuente externa, así siguen
 * dibujándose sin señal. De los colores se guarda la CLAVE del tono
 * ("naranja") y no un hexadecimal, para que el mismo color valga en tema
 * claro y en oscuro.
 *
 * **"Automático" es una opción de verdad, y es la de arranque.** Sin ícono
 * ni color elegidos la app los decide a partir del nombre, que es lo que
 * venía haciendo; obligar a elegir convertiría crear una categoría en un
 * trámite de tres decisiones.
 */
function CategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: UserCategory;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState<string | null>(category.icon ?? null);
  const [color, setColor] = useState<CategoryTone | null>(
    isCategoryTone(category.color) ? category.color : null
  );
  const [error, setError] = useState<string | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    name.trim() !== category.name ||
    icon !== (category.icon ?? null) ||
    color !== (isCategoryTone(category.color) ? category.color : null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateCategory(category.id, { name, icon, color });
      if (result.error) {
        setError(result.error);
        // Además del error en línea: el panel tiene scroll y el mensaje de
        // abajo quedaba fuera de pantalla, así que tocar "Guardar" y que
        // fallara se veía igual que tocar y que no pasara nada. El aviso
        // flotante no se puede perder de vista.
        toast.error(result.error);
        return;
      }
      toast.success(`"${name.trim()}" guardada`);
      onSaved();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* La vista previa es la confirmación de lo que se está eligiendo:
          el mismo cuadrito que va a salir en las listas, en vivo. */}
      <div className="flex items-center gap-3 rounded-surface bg-surface-raised p-3">
        <CategoryMark
          category={name || category.name}
          size={46}
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

      {/* Las dos grillas vivían acá y tapaban el formulario entero: el
          nombre quedaba arriba de un muro de cuadritos y había que pasarlo
          todo para llegar a "Guardar". Ahora son una fila con la vista
          previa y un diálogo propio. */}
      <StyleRow
        label="Ícono y color"
        hint={
          icon || color
            ? [icon ? MATERIAL_SYMBOLS[icon]?.label : null, color].filter(Boolean).join(" · ")
            : "Los decide la app por el nombre"
        }
        preview={
          <CategoryMark
            category={name || category.name}
            size={34}
            previewIcon={icon}
            previewTone={color ?? undefined}
          />
        }
        onOpen={() => setStyleOpen(true)}
      />

      <StylePickerDialog
        key={`estilo-${styleOpen}`}
        open={styleOpen}
        onClose={() => setStyleOpen(false)}
        title="Ícono y color"
        value={{ icon, color }}
        preview={(style) => (
          <CategoryMark
            category={name || category.name}
            size={34}
            previewIcon={style.icon}
            previewTone={style.color ?? undefined}
          />
        )}
        onSave={(style) => {
          setIcon(style.icon);
          setColor(style.color ?? null);
          setStyleOpen(false);
        }}
      />

      <FormError>{error}</FormError>

      {/* Los botones van dentro del panel y no en el pie del diálogo: el pie
          es de la lista, y el formulario es una vista de paso. */}
      <div className="flex gap-2 border-t border-line pt-4 [&>*]:flex-1 sm:justify-end sm:[&>*]:flex-none">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          disabled={pending || !name.trim() || !dirty}
        >
          {pending ? (
            "Guardando..."
          ) : (
            <>
              <Check size={14} />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
