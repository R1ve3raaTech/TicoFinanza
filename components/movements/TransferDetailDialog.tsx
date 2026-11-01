"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Trash } from "@phosphor-icons/react";
import { deleteTransfer } from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Money } from "@/components/ui/Money";
import { accountNames } from "@/lib/accounts";
import { CR_TZ } from "@/lib/fixedExpenses";
import type { Account, Transfer } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: CR_TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Detalle de una transferencia. No se edita: son dos campos y una fecha, y
 * rehacerla es más corto que corregirla — así que lo único que ofrece es
 * borrarla, que devuelve la plata a la cuenta de origen.
 */
export function TransferDetailDialog({
  transfer,
  accounts,
  onClose,
}: {
  transfer: Transfer | null;
  accounts: Account[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const names = accountNames(accounts);
  const name = (id: string) => names.get(id) ?? "Cuenta eliminada";

  function remove() {
    if (!transfer) return;
    startTransition(async () => {
      const result = await deleteTransfer(transfer.id);
      if (result?.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Transferencia eliminada");
      setConfirming(false);
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={Boolean(transfer)}
        onClose={onClose}
        size="sm"
        dismissible={!pending}
        title="Transferencia"
        footer={
          <>
            <Button
              variant="danger-ghost"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="sm:mr-auto"
            >
              <Trash size={15} />
              Eliminar
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cerrar
            </Button>
          </>
        }
      >
        {transfer && (
          <div className="flex flex-col gap-4">
            <Money
              value={transfer.amount}
              tabular={false}
              className="text-figure text-ink"
            />

            <div className="flex items-center gap-3 rounded-control border border-line bg-surface-raised px-3 py-2.5 text-label">
              <span className="min-w-0 flex-1 truncate text-ink">
                {name(transfer.from_account_id)}
              </span>
              <ArrowRight size={14} aria-hidden className="shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-right text-ink">
                {name(transfer.to_account_id)}
              </span>
            </div>

            <dl className="flex flex-col gap-2 text-meta">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">Fecha</dt>
                <dd className="text-ink-2">{dateFormat.format(new Date(transfer.transfer_date))}</dd>
              </div>
              {transfer.description && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">Detalle</dt>
                  <dd className="min-w-0 truncate text-ink-2">{transfer.description}</dd>
                </div>
              )}
            </dl>

            <p className="text-meta leading-relaxed text-ink-3">
              Una transferencia no cuenta como ingreso ni como gasto: solo mueve plata entre tus
              cuentas.
            </p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirming}
        title="¿Eliminar esta transferencia?"
        description="Los saldos de las dos cuentas vuelven a como estaban."
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
