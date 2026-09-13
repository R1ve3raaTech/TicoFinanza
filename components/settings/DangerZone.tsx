"use client";

import { useId, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { deleteAllTransactions } from "@/app/dashboard/settings/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { SettingsRow } from "./SettingsSection";

const CONFIRM_WORD = "ELIMINAR";

export function DangerZone({ transactionCount }: { transactionCount: number }) {
  const toast = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setTyped("");
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAllTransactions();
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Todos los movimientos fueron eliminados");
        setOpen(false);
        setTyped("");
      }
    });
  }

  const noun = transactionCount === 1 ? "movimiento" : "movimientos";

  return (
    <>
      <SettingsRow
        inline
        label="Eliminar movimientos"
        description="Borra todos tus movimientos, automáticos y manuales. No se puede deshacer."
      >
        <Button
          variant="danger-ghost"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={transactionCount === 0}
          className="border border-expense/30"
        >
          <Trash size={14} />
          Eliminar todo
        </Button>
      </SettingsRow>

      <Dialog
        open={open}
        onClose={close}
        role="alertdialog"
        size="sm"
        dismissible={!pending}
        title={`¿Eliminar ${transactionCount} ${noun}?`}
        description="Es permanente. Se borran todos tus gastos e ingresos, incluidos los leídos de tus correos."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              type="submit"
              form={formId}
              disabled={pending || typed !== CONFIRM_WORD}
            >
              {pending ? "Eliminando..." : "Eliminar todo"}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            if (typed === CONFIRM_WORD) confirm();
          }}
          className="flex flex-col gap-3"
        >
          <Field
            label={
              <>
                Escribí <span className="font-mono font-semibold text-expense">{CONFIRM_WORD}</span>{" "}
                para confirmar
              </>
            }
          >
            <input
              data-autofocus=""
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className={inputClass}
            />
          </Field>
          <FormError>{error}</FormError>
        </form>
      </Dialog>
    </>
  );
}
