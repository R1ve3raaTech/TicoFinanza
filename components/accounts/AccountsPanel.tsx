"use client";

import { useState } from "react";
import { ArrowsLeftRight, Bank, CreditCard, Money as Billete, PiggyBank, Plus } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { TransferDialog } from "@/components/movements/TransferDialog";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { accountShare, accountTypeLabel } from "@/lib/accounts";
import type { Account, AccountType } from "@/lib/types";
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
/**
 * Un ícono por tipo de billetera.
 *
 * La tarjeta de una cuenta era nombre + monto y nada más: tres cajas
 * iguales que había que leer para distinguir. Con el ícono se separan de un
 * vistazo, que es lo que uno hace con esta lista.
 */
const ICONS: Record<AccountType, Icon> = {
  efectivo: Billete,
  debito: Bank,
  credito: CreditCard,
  ahorro: PiggyBank,
};

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
          <p className="text-sm text-ink-2">
            Una billetera por cada lugar donde tenés plata: efectivo, banco, tarjeta.
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
              const Icon = ICONS[account.type];
              const share = accountShare(account, accounts);
              const percent = Math.round(share * 100);
              return (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => openAccount(account)}
                    className="group flex w-full cursor-pointer flex-col gap-3 rounded-surface border border-line bg-surface p-3.5 text-left transition-[background-color,border-color,transform] duration-150 hover:border-line-strong hover:bg-surface-hover active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-raised text-ink-3 transition-colors duration-150 group-hover:text-ink-2">
                        <Icon size={16} weight="fill" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-label text-ink">{account.name}</span>
                        <span className="text-micro text-ink-3">{type}</span>
                      </span>
                    </span>

                    <Money
                      value={account.current_balance}
                      className={`text-[1.0625rem] font-medium tracking-[-0.02em] ${
                        negative ? "text-expense" : "text-ink"
                      }`}
                    />

                    {/* Cuánto de tu plata está acá. Una sola serie, así que
                        un solo color neutro: el celeste y el verde acá
                        significarían otra cosa. Con saldo negativo no se
                        dibuja — una barra "negativa" no quiere decir nada. */}
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-chart-track"
                      >
                        <span
                          className="block h-full rounded-full bg-chart-neutral transition-[width] duration-500 motion-reduce:transition-none"
                          style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }}
                        />
                      </span>
                      <span className="money shrink-0 text-micro text-ink-3">
                        {negative ? "en rojo" : `${percent} %`}
                      </span>
                    </span>
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
