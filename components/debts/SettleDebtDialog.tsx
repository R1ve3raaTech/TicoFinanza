"use client";

import { useState, useTransition } from "react";
import { settleDebt } from "@/app/dashboard/plan/actions";
import { AccountPicker } from "@/components/accounts/AccountPicker";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { Switch } from "@/components/ui/Switch";
import type { Account, Debt } from "@/lib/types";

/**
 * Marcar una deuda como saldada, con la opción de registrar el movimiento.
 *
 * Registrar es opcional porque las dos situaciones son comunes: si te
 * pagaron por SINPE a la cuenta del banco, ese ingreso tiene que aparecer en
 * los movimientos y subir el saldo; si te pagaron en efectivo que ya te
 * gastaste, forzar un movimiento le mentiría a la cuenta. Queda prendido por
 * defecto porque es el caso más frecuente.
 */
export function SettleDebtDialog({
  open,
  onClose,
  debt,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  debt: Debt | null;
  accounts: Account[];
}) {
  const toast = useToast();
  const [register, setRegister] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const income = debt?.type === "me_deben";

  function submit() {
    if (!debt) return;
    setError(null);
    startTransition(async () => {
      const result = await settleDebt({ id: debt.id, register, accountId });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(income ? "Cobrado" : "Pagado");
      onClose();
    });
  }

  return (
    <Dialog
      open={open && Boolean(debt)}
      onClose={onClose}
      dismissible={!pending}
      size="sm"
      title={income ? "¿Ya te pagó?" : "¿Ya le pagaste?"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Marcar como saldado"}
          </Button>
        </>
      }
    >
      {debt && (
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-relaxed text-ink-2">
            {income ? (
              <>
                <Money value={debt.amount} className="font-medium text-ink" /> de{" "}
                <span className="font-medium text-ink">{debt.person_name}</span>.
              </>
            ) : (
              <>
                <Money value={debt.amount} className="font-medium text-ink" /> a{" "}
                <span className="font-medium text-ink">{debt.person_name}</span>.
              </>
            )}
          </p>

          <div className="flex items-start justify-between gap-4 border-y border-line py-3">
            <div className="min-w-0">
              <p className="text-label text-ink">
                Registrar el {income ? "ingreso" : "gasto"}
              </p>
              <p className="mt-0.5 text-meta text-ink-3">
                {income
                  ? "Suma a los movimientos del mes y al saldo de la cuenta."
                  : "Resta de los movimientos del mes y del saldo de la cuenta."}
              </p>
            </div>
            <Switch
              checked={register}
              onChange={() => setRegister((v) => !v)}
              disabled={pending}
              label={`Registrar el ${income ? "ingreso" : "gasto"} en una cuenta`}
            />
          </div>

          {register && (
            <AccountPicker
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
              label={income ? "¿A qué cuenta entró?" : "¿De qué cuenta salió?"}
            />
          )}

          <FormError>{error}</FormError>
        </div>
      )}
    </Dialog>
  );
}
