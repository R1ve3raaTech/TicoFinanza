"use client";

import { useState } from "react";
import { ArrowsLeftRight, Plus } from "@phosphor-icons/react";
import { TransferDialog } from "@/components/movements/TransferDialog";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { accountTypeLabel } from "@/lib/accounts";
import type { Account } from "@/lib/types";
import { AccountDialog } from "./AccountDialog";

/**
 * Las billeteras y lo que hay en cada una, arriba del resumen.
 *
 * El saldo de una cuenta no se edita a mano: sale del saldo inicial más todo
 * lo registrado. Tocar una tarjeta abre la cuenta para cambiarle el nombre,
 * el tipo o ese saldo inicial.
 *
 * **Acá ya no va el saldo total.** Subió al encabezado del resumen
 * (components/dashboard/SummaryHero.tsx), que es donde se mira primero; este
 * panel quedó con lo que solo él puede contestar: en cuál de tus billeteras
 * está esa plata.
 */
export function AccountsPanel({ accounts }: { accounts: Account[] }) {
  const [editing, setEditing] = useState<Account | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [session, setSession] = useState(0);

  function openAccount(account: Account | null) {
    setEditing(account);
    setSession((s) => s + 1);
    setAccountOpen(true);
  }

  return (
    <section aria-labelledby="cuentas-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="cuentas-titulo" className="text-heading text-ink">
          Tus cuentas
        </h2>
        <div className="flex items-center gap-1">
          {accounts.length >= 2 && (
            <Button variant="ghost" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowsLeftRight size={14} />
              Transferir
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openAccount(null)} className="-mr-2">
            <Plus size={14} weight="bold" />
            Nueva
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="border-t border-line py-8">
          <p className="max-w-[52ch] text-sm leading-relaxed text-ink-2">
            Creá una billetera por cada lugar donde tenés plata —efectivo, la cuenta del banco, la
            tarjeta— y cada movimiento va a saber de dónde salió.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => openAccount(null)}>
            <Plus size={15} weight="bold" />
            Crear la primera
          </Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => {
              const negative = account.current_balance < 0;
              const type = accountTypeLabel(account.type);
              const showType = account.name.trim().toLowerCase() !== type.toLowerCase();
              return (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => openAccount(account)}
                    className="flex w-full cursor-pointer flex-col gap-2 rounded-surface border border-line bg-surface p-3.5 text-left transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <span className="flex min-w-0 items-baseline justify-between gap-3">
                      <span className="truncate text-label text-ink">{account.name}</span>
                      {showType && (
                        <span className="shrink-0 text-micro text-ink-3">{type}</span>
                      )}
                    </span>
                    <Money
                      value={account.current_balance}
                      className={`text-[1.0625rem] font-medium tracking-[-0.02em] ${
                        negative ? "text-expense" : "text-ink"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <AccountDialog
        key={`cuenta-${session}`}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        account={editing}
      />
      <TransferDialog
        key={`transfer-${transferOpen}`}
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
      />
    </section>
  );
}
