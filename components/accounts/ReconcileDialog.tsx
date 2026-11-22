"use client";

import { useId, useState, useTransition } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { reconcileAccount } from "@/app/dashboard/actions";
import { useToast } from "@/components/Toast";
import { formatAmountInput, parseAmount } from "@/components/movements/MovementFields";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Select } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Segmented } from "@/components/ui/Segmented";
import { reconcile, suggestedMode, type ReconcileMode } from "@/lib/reconcile";
import type { Account } from "@/lib/types";
import { AccountMark } from "./AccountMark";

/**
 * "¿Cuánto dice tu banco?"
 *
 * El saldo de la app sale de sumar lo que la persona anotó, así que cuando
 * no coincide con el banco la diferencia **es plata que se movió y nadie
 * registró**. Esta pantalla existe para que ese número no se pierda: la
 * diferencia se anota como movimiento en vez de borrarse.
 *
 * Toda la explicación de por qué, y de las dos salidas, está en
 * `lib/reconcile.ts`.
 */
export function ReconcileDialog({
  open,
  onClose,
  accounts,
  movementCounts,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  /** Cuántos movimientos tiene cada cuenta, para proponer qué hacer. */
  movementCounts: Record<string, number>;
}) {
  const toast = useToast();
  const formId = useId();
  const accountId = useId();

  const [selected, setSelected] = useState(accounts[0]?.id ?? "");
  const [bank, setBank] = useState("");
  const [mode, setMode] = useState<ReconcileMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const account = accounts.find((a) => a.id === selected) ?? accounts[0];
  const appBalance = account ? account.current_balance : 0;

  // Mientras no haya nada escrito no se muestra ninguna diferencia: un
  // "faltan ₡120.000" calculado contra un campo vacío es una alarma falsa.
  const escrito = bank.trim() !== "";
  const bankBalance = escrito ? parseAmount(bank) : appBalance;
  const valido = escrito && Number.isFinite(bankBalance);
  const resultado = reconcile(appBalance, valido ? bankBalance : appBalance);

  const sugerido = account ? suggestedMode(movementCounts[account.id] ?? 0) : "registrar";
  const elegido = mode ?? sugerido;

  function submit() {
    setError(null);
    if (!account) return;
    if (!valido) {
      setError("Escribí lo que dice tu banco.");
      return;
    }

    startTransition(async () => {
      const res = await reconcileAccount(account.id, bankBalance, elegido);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success(
        resultado.kind === "cuadra"
          ? "La cuenta ya cuadraba."
          : elegido === "registrar"
            ? "Registrado como movimiento sin identificar."
            : "Saldo corregido."
      );
      onClose();
    });
  }

  if (!account) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Conciliar con el banco"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={pending || !valido}>
            {pending ? "Guardando…" : "Cuadrar"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {accounts.length > 1 && (
          <Field label="Cuenta">
            <Select
              id={accountId}
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setBank("");
                setMode(null);
              }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {/* El saldo de la app, para comparar sin cambiar de pantalla. */}
        <div className="flex items-center gap-3 rounded-control border border-line bg-surface-raised p-3">
          <AccountMark account={account} size={32} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-label text-ink">{account.name}</span>
            <span className="text-micro text-ink-3">Según la app</span>
          </span>
          <Money value={appBalance} tabular className="text-label font-medium text-ink" />
        </div>

        <Field label="¿Cuánto dice tu banco?">
          {/* `allowNegative`: una tarjeta de crédito va en contra. */}
          <MoneyInput
            value={bank}
            onChange={(v) => setBank(v)}
            placeholder={formatAmountInput(appBalance)}
            allowNegative
            data-autofocus
          />
        </Field>

        {valido && resultado.kind === "cuadra" && (
          <p className="flex items-center gap-2 text-meta text-income">
            <Check size={15} weight="bold" />
            Cuadra. No hay nada que corregir.
          </p>
        )}

        {valido && resultado.kind !== "cuadra" && (
          <div className="flex flex-col gap-3 rounded-control border border-line p-3">
            <p className="flex flex-wrap items-center gap-2 text-meta text-ink-2">
              <span>
                {resultado.kind === "falta"
                  ? "En el banco hay menos:"
                  : "En el banco hay más:"}
              </span>
              <Money
                value={resultado.difference}
                tabular
                className={`text-label font-medium ${
                  resultado.kind === "falta" ? "text-expense" : "text-income"
                }`}
              />
            </p>

            <Segmented
              ariaLabel="Qué hacer con la diferencia"
              value={elegido}
              onChange={(v) => setMode(v as ReconcileMode)}
              options={[
                { value: "registrar", label: "Es plata que se movió" },
                { value: "punto-de-partida", label: "Estaba mal el inicial" },
              ]}
            />

            {/* Lo que va a pasar, escrito. Es una acción que escribe en el
                historial, así que no puede ser una sorpresa. */}
            <p className="flex items-start gap-1.5 text-meta text-ink-3">
              <ArrowRight size={13} className="mt-[3px] shrink-0" />
              {elegido === "registrar" ? (
                <span>
                  Se anota {resultado.movement?.type === "EXPENSE" ? "un gasto" : "un ingreso"} de{" "}
                  <Money value={resultado.movement?.amount ?? 0} tabular className="text-ink-2" />{" "}
                  en &ldquo;Sin identificar&rdquo;, y cuenta en el mes.
                </span>
              ) : (
                <span>
                  Se mueve el saldo de partida. No se anota ningún movimiento y el mes no cambia.
                </span>
              )}
            </p>
          </div>
        )}

        <FormError>{error}</FormError>
      </form>
    </Dialog>
  );
}
