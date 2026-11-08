"use client";

import { useState, useTransition } from "react";
import { PencilSimple, X } from "@phosphor-icons/react";
import { addCategory, deleteCategory } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { CategoryMark } from "@/components/ui/CategoryMark";
import { FormError, inputClass } from "@/components/ui/Field";
import type { TransactionType, UserCategory } from "@/lib/types";
import { CategoryEditor } from "./CategoryEditor";
import { SettingsRow } from "./SettingsSection";

function CategoryGroup({
  title,
  type,
  categories,
}: {
  title: string;
  type: TransactionType;
  categories: UserCategory[];
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<UserCategory | null>(null);
  const [session, setSession] = useState(0);
  const noun = type === "INCOME" ? "ingreso" : "gasto";

  function edit(category: UserCategory) {
    setEditing(category);
    setSession((n) => n + 1);
  }

  function submit() {
    if (!name.trim()) return;
    const submittedName = name.trim();
    setError(null);
    startTransition(async () => {
      const result = await addCategory(name, type);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setName("");
        toast.success(`"${submittedName}" agregada`);
      }
    });
  }

  function remove(id: string, categoryName: string) {
    startTransition(async () => {
      await deleteCategory(id);
      toast.success(`"${categoryName}" eliminada`);
    });
  }

  return (
    <SettingsRow label={title} alignTop>
      <div className="flex flex-col gap-3">
        {categories.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <li
                key={c.id}
                className="inline-flex h-8 items-center gap-1 rounded-control border border-line bg-surface pl-1.5 pr-0.5 text-label font-normal text-ink"
              >
                {/* Tocar la categoría abre su editor: nombre, ícono y color.
                    El cuadrito muestra lo que va a verse en las listas. */}
                <button
                  type="button"
                  onClick={() => edit(c)}
                  aria-label={`Editar ${c.name}`}
                  className="-my-1 flex cursor-pointer items-center gap-1.5 rounded-[4px] py-1 pr-1 transition-colors duration-150 hover:text-accent"
                >
                  <CategoryMark category={c.name} size={18} className="rounded-[4px]" />
                  {c.name}
                  <PencilSimple size={11} aria-hidden className="text-ink-3" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c.id, c.name)}
                  aria-label={`Borrar ${c.name}`}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-ink-3 transition-colors duration-150 cursor-pointer hover:bg-surface-hover hover:text-ink"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pt-1 text-meta text-ink-3">Sin categorías extra todavía.</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2 sm:max-w-sm"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Nueva categoría de ${noun}`}
            aria-label={`Nueva categoría de ${noun}`}
            className={inputClass}
          />
          <Button type="submit" variant="secondary" size="field" disabled={pending || !name.trim()}>
            Agregar
          </Button>
        </form>
        <FormError>{error}</FormError>
      </div>

      <CategoryEditor
        key={session}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        category={editing}
      />
    </SettingsRow>
  );
}

export function CategoryManager({ categories }: { categories: UserCategory[] }) {
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const income = categories.filter((c) => c.type === "INCOME");

  return (
    <>
      <CategoryGroup title="De gasto" type="EXPENSE" categories={expense} />
      <CategoryGroup title="De ingreso" type="INCOME" categories={income} />
    </>
  );
}
