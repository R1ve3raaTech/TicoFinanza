"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowsLeftRight,
  Check,
  Funnel,
  ListChecks,
  MagnifyingGlass,
  Paperclip,
  Trash,
  X,
} from "@phosphor-icons/react";
import { deleteTransactions } from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { Segmented } from "@/components/ui/Segmented";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { accountNames } from "@/lib/accounts";
import { CR_TZ } from "@/lib/fixedExpenses";
import { formatMoney } from "@/lib/format";
import { ledgerNet, type LedgerEntry } from "@/lib/ledger";
import type { Account, Transfer, TransactionType } from "@/lib/types";
import { AddMovementButton, useMovementEntry } from "./MovementEntry";
import { ReceiptViewer } from "./ReceiptViewer";
import { TransferDetailDialog } from "./TransferDetailDialog";

const HIGHLIGHT_MS = 2600;

// Todas las fechas en hora de Costa Rica, fija: si no, el servidor (UTC) y el
// navegador agrupan el mismo movimiento en días distintos y React tira un
// error de hidratación.
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: CR_TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: CR_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayYearFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: CR_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayLabel(key: string, sampleIso: string, todayKey: string): string {
  if (key === todayKey) return "Hoy";
  if (key === shiftDayKey(todayKey, -1)) return "Ayer";
  const format = key.slice(0, 4) === todayKey.slice(0, 4) ? dayFormat : dayYearFormat;
  const text = format.format(new Date(sampleIso)).replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface DayGroup {
  key: string;
  items: LedgerEntry[];
  net: number;
}

type TypeFilter = "ALL" | TransactionType | "TRANSFER";

/**
 * Libro de movimientos: filas separadas por líneas finas y agrupadas por día
 * (con el neto del día), con los ingresos y gastos y las transferencias en
 * la misma lista ordenada por fecha.
 *
 * El neto del día ignora las transferencias a propósito: mover plata de una
 * billetera a otra no cambia cuánto tenés.
 */
export function MovementList({
  title,
  entries,
  accounts,
}: {
  title: string;
  entries: LedgerEntry[];
  accounts: Account[];
}) {
  const toast = useToast();
  const reduce = useReducedMotion();
  const { edit } = useMovementEntry();
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string> | null>(null);
  const [todayKey] = useState(() => dayKeyFormat.format(new Date()));
  const [openTransfer, setOpenTransfer] = useState<Transfer | null>(null);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);

  const [pickMode, setPickMode] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<TypeFilter>("ALL");

  const names = useMemo(() => accountNames(accounts), [accounts]);
  const accountName = (id: string | null) => (id ? (names.get(id) ?? "Cuenta eliminada") : null);

  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .filter((e) => e.kind === "transaction")
            .map((e) => (e.kind === "transaction" ? e.transaction.category : null))
            .filter((c): c is string => Boolean(c))
        )
      ).sort(),
    [entries]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const activeFilterCount =
    (filterCategory ? 1 : 0) + (filterAccount ? 1 : 0) + (filterType === "ALL" ? 0 : 1);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (entry.kind === "transfer") {
        const { transfer } = entry;
        if (filterType !== "ALL" && filterType !== "TRANSFER") return false;
        if (filterCategory) return false;
        if (
          filterAccount &&
          transfer.from_account_id !== filterAccount &&
          transfer.to_account_id !== filterAccount
        ) {
          return false;
        }
        if (normalizedQuery) {
          const haystack = `${transfer.description ?? ""} transferencia ${
            accountName(transfer.from_account_id) ?? ""
          } ${accountName(transfer.to_account_id) ?? ""}`.toLowerCase();
          if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
      }

      const { transaction } = entry;
      if (filterType === "TRANSFER") return false;
      if (filterType !== "ALL" && transaction.type !== filterType) return false;
      if (filterCategory && transaction.category !== filterCategory) return false;
      if (filterAccount && transaction.account_id !== filterAccount) return false;
      if (normalizedQuery) {
        const haystack = `${transaction.description ?? ""} ${transaction.category ?? ""} ${
          accountName(transaction.account_id) ?? ""
        }`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, filterCategory, filterAccount, filterType, normalizedQuery, names]);

  // Las filas ya vienen de más nueva a más vieja, así que alcanza con cortar
  // cada vez que cambia el día.
  const groups = useMemo(() => {
    const list: DayGroup[] = [];
    for (const entry of filteredEntries) {
      const key = dayKeyFormat.format(new Date(entry.date));
      let group = list[list.length - 1];
      if (!group || group.key !== key) {
        group = { key, items: [], net: 0 };
        list.push(group);
      }
      group.items.push(entry);
    }
    for (const group of list) group.net = ledgerNet(group.items);
    return list;
  }, [filteredEntries]);

  function clearFilters() {
    setFilterCategory(null);
    setFilterAccount(null);
    setFilterType("ALL");
  }

  // Solo se resaltan filas que aparecen DESPUÉS del primer render (ej. la que
  // se acaba de registrar) — en la carga inicial nada se marca.
  useEffect(() => {
    const currentIds = new Set(entries.map((e) => e.id));
    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }
    const freshlyAdded = entries.filter((e) => !seenIds.current!.has(e.id)).map((e) => e.id);
    seenIds.current = currentIds;
    if (freshlyAdded.length === 0) return;

    setNewIds(new Set(freshlyAdded));
    const timer = setTimeout(() => setNewIds(new Set()), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [entries]);

  function exitPickMode() {
    setPickMode(false);
    setPickedIds(new Set());
    setConfirmingBulkDelete(false);
  }

  function togglePicked(id: string) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(pickedIds);
    startTransition(async () => {
      const result = await deleteTransactions(ids);
      if (result.error) {
        toast.error(result.error);
        setConfirmingBulkDelete(false);
      } else {
        const plural = ids.length === 1 ? "" : "s";
        toast.success(`${ids.length} movimiento${plural} eliminado${plural}`);
        exitPickMode();
      }
    });
  }

  const searching = normalizedQuery !== "" || activeFilterCount > 0;

  // El espacio para el clip se reserva en TODAS las filas visibles o en
  // ninguna: si solo lo reservaran las que tienen comprobante, los montos de
  // la columna derecha quedarían desalineados entre fila y fila.
  const anyReceipt = filteredEntries.some(
    (entry) => entry.kind === "transaction" && Boolean(entry.transaction.receipt_url)
  );

  return (
    <section aria-labelledby="movimientos-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="movimientos-titulo" className="text-heading text-ink">
          {title}
          {searching && entries.length > 0 && (
            <span className="ml-2 text-meta font-normal text-ink-3">
              {filteredEntries.length} de {entries.length}
            </span>
          )}
        </h2>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (pickMode ? exitPickMode() : setPickMode(true))}
            aria-pressed={pickMode}
            className="-mr-2"
          >
            {pickMode ? <X size={14} /> : <ListChecks size={14} />}
            {pickMode ? "Cancelar" : "Seleccionar"}
          </Button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="pb-2 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlass
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar movimientos"
                aria-label="Buscar movimientos por descripción, categoría o cuenta"
                className={`${inputClass} pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[4px] text-ink-3 transition-colors duration-150 cursor-pointer hover:bg-surface-hover hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="relative">
              <Button
                variant={showFilters || activeFilterCount > 0 ? "secondary" : "ghost"}
                size="field"
                icon
                onClick={() => setShowFilters((v) => !v)}
                aria-label={
                  activeFilterCount > 0 ? `Filtros (${activeFilterCount} activos)` : "Filtros"
                }
                aria-expanded={showFilters}
                aria-controls="filtros-movimientos"
              >
                <Funnel size={16} weight={activeFilterCount > 0 ? "fill" : "regular"} />
              </Button>
              {activeFilterCount > 0 && (
                <span
                  aria-hidden
                  className="money pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent"
                >
                  {activeFilterCount}
                </span>
              )}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                id="filtros-movimientos"
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-col gap-3 border-y border-line py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-20 shrink-0 text-label text-ink-2">Tipo</span>
                    <Segmented
                      ariaLabel="Tipo de movimiento"
                      value={filterType}
                      onChange={setFilterType}
                      options={[
                        { value: "ALL", label: "Todos" },
                        { value: "INCOME", label: "Ingresos", tone: "income" },
                        { value: "EXPENSE", label: "Gastos" },
                        { value: "TRANSFER", label: "Transferencias" },
                      ]}
                    />
                  </div>
                  {accounts.length > 0 && (
                    <div
                      role="group"
                      aria-label="Cuenta"
                      className="flex flex-col gap-2 sm:flex-row sm:gap-4"
                    >
                      <span className="w-20 shrink-0 pt-1.5 text-label text-ink-2">Cuenta</span>
                      <div className="flex flex-wrap gap-1.5">
                        {accounts.map((account) => (
                          <ToggleChip
                            key={account.id}
                            pressed={filterAccount === account.id}
                            onClick={() =>
                              setFilterAccount(filterAccount === account.id ? null : account.id)
                            }
                          >
                            {account.name}
                          </ToggleChip>
                        ))}
                      </div>
                    </div>
                  )}
                  {availableCategories.length > 0 && (
                    <div
                      role="group"
                      aria-label="Categoría"
                      className="flex flex-col gap-2 sm:flex-row sm:gap-4"
                    >
                      <span className="w-20 shrink-0 pt-1.5 text-label text-ink-2">Categoría</span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCategories.map((c) => (
                          <ToggleChip
                            key={c}
                            pressed={filterCategory === c}
                            onClick={() => setFilterCategory(filterCategory === c ? null : c)}
                          >
                            {c}
                          </ToggleChip>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="-ml-2 self-start"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="mt-2 border-t border-line py-10">
          <p className="text-heading text-ink">Todavía no hay movimientos</p>
          <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-ink-2">
            Registrá un ingreso (salario, freelance) o un gasto para empezar. Los pagos que se
            repiten todos los meses van en Fijos, no acá.
          </p>
          <div className="mt-5">
            {/* Sin variante primaria: la acción primaria de la pantalla ya
                está en el encabezado. */}
            <AddMovementButton variant="secondary" />
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="mt-2 border-t border-line py-10">
          <p className="text-heading text-ink">Sin resultados</p>
          <p className="mt-1.5 text-sm text-ink-2">
            Ningún movimiento coincide con la búsqueda o los filtros.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setQuery("");
              clearFilters();
            }}
          >
            Quitar búsqueda y filtros
          </Button>
        </div>
      ) : (
        <div className="pt-2">
          {groups.map((group) => {
            const label = dayLabel(group.key, group.items[0].date, todayKey);
            return (
              <div key={group.key} className="pt-2 first:pt-0 md:pt-4 md:first:pt-1">
                <h3 className="sticky top-14 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-ground py-2 md:top-0">
                  <span suppressHydrationWarning className="text-label text-ink-2">
                    {label}
                  </span>
                  <Money value={group.net} plus className="text-meta text-ink-3" />
                </h3>
                <ul aria-label={label}>
                  {group.items.map((entry) => {
                    const isNew = newIds.has(entry.id);

                    if (entry.kind === "transfer") {
                      const { transfer } = entry;
                      return (
                        <li
                          key={entry.id}
                          className={`border-b border-line last:border-b-0 ${isNew ? "row-arrived" : ""}`}
                        >
                          <button
                            type="button"
                            disabled={pickMode}
                            onClick={() => setOpenTransfer(transfer)}
                            className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition-colors duration-150 hover:bg-surface-hover/70 focus-visible:outline-offset-[-2px] disabled:cursor-default disabled:opacity-45 md:-mx-2 md:w-[calc(100%+1rem)] md:rounded-control md:px-2"
                          >
                            <span
                              aria-hidden
                              className="flex h-8 w-8 items-center justify-center rounded-control bg-surface-raised text-ink-3"
                            >
                              <ArrowsLeftRight size={15} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">
                                {transfer.description ?? "Transferencia"}
                              </span>
                              <span className="block truncate text-meta text-ink-3">
                                {accountName(transfer.from_account_id)} →{" "}
                                {accountName(transfer.to_account_id)} ·{" "}
                                {timeFormat.format(new Date(transfer.transfer_date))}
                              </span>
                            </span>
                            {/* Sin signo: no suma ni resta al patrimonio. */}
                            <span className="money whitespace-nowrap text-right text-sm font-medium text-ink-2">
                              {formatMoney(transfer.amount)}
                            </span>
                          </button>
                        </li>
                      );
                    }

                    const { transaction } = entry;
                    const income = transaction.type === "INCOME";
                    const isPicked = pickedIds.has(transaction.id);
                    const account = accountName(transaction.account_id);
                    return (
                      <li
                        key={entry.id}
                        className={`relative border-b border-line last:border-b-0 ${isNew ? "row-arrived" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            pickMode ? togglePicked(transaction.id) : edit(transaction)
                          }
                          aria-pressed={pickMode ? isPicked : undefined}
                          // El clip del comprobante es un botón hermano, no
                          // uno anidado (que sería HTML inválido): la fila
                          // le deja el espacio a la derecha.
                          className={`grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition-colors duration-150 hover:bg-surface-hover/70 focus-visible:outline-offset-[-2px] md:-mx-2 md:w-[calc(100%+1rem)] md:rounded-control md:px-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,9rem)_auto] lg:gap-4 ${
                            anyReceipt ? "pr-8 md:pr-9" : ""
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            {pickMode && (
                              <span
                                aria-hidden
                                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition-colors duration-150 ${
                                  isPicked
                                    ? "border-accent bg-accent text-on-accent"
                                    : "border-line-strong"
                                }`}
                              >
                                {isPicked && <Check size={12} weight="bold" />}
                              </span>
                            )}
                            {/* La flecha dice ingreso o gasto por su forma, no
                                por el color: el monto ya lleva el signo. */}
                            <span
                              aria-hidden
                              className="flex h-8 w-8 items-center justify-center rounded-control bg-surface-raised text-ink-3"
                            >
                              {income ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                            </span>
                          </span>

                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium text-ink">
                                {transaction.description ?? (income ? "Ingreso" : "Gasto")}
                              </span>
                              {isNew && (
                                <span className="shrink-0 text-micro font-medium text-accent">
                                  Nuevo
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-meta text-ink-3">
                              {account ?? (income ? "Ingreso" : "Gasto")} ·{" "}
                              {timeFormat.format(new Date(transaction.transaction_date))}
                              <span className="lg:hidden">
                                {" · "}
                                {transaction.category ?? "Sin categoría"}
                              </span>
                            </span>
                          </span>

                          <span
                            className={`hidden truncate text-label font-normal lg:block ${
                              transaction.category ? "text-ink-2" : "text-ink-3"
                            }`}
                          >
                            {transaction.category ?? "Sin categoría"}
                          </span>

                          <Money
                            value={income ? transaction.amount : -transaction.amount}
                            plus
                            className={`text-right text-sm font-medium ${
                              income ? "text-income" : "text-ink"
                            }`}
                          />
                        </button>

                        {transaction.receipt_url && (
                          <button
                            type="button"
                            disabled={pickMode}
                            onClick={() => setOpenReceipt(transaction.receipt_url)}
                            aria-label={`Ver el comprobante de ${
                              transaction.description ?? (income ? "este ingreso" : "este gasto")
                            }`}
                            className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-control text-ink-3 transition-colors duration-150 hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-45"
                          >
                            <Paperclip size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {pickMode && pickedIds.size > 0 && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 border-t border-line-strong bg-surface md:inset-x-auto md:bottom-6 md:right-8 md:rounded-surface md:border md:shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 md:pl-4 md:pr-2">
              <span className="money text-sm text-ink-2" aria-live="polite">
                {pickedIds.size} seleccionado{pickedIds.size === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={exitPickMode}>
                  Cancelar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmingBulkDelete(true)}>
                  <Trash size={14} />
                  Eliminar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmingBulkDelete}
        title={`¿Eliminar ${pickedIds.size} movimiento${pickedIds.size === 1 ? "" : "s"}?`}
        description="Esta acción no se puede deshacer."
        pending={isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmingBulkDelete(false)}
      />

      <TransferDetailDialog
        transfer={openTransfer}
        accounts={accounts}
        onClose={() => setOpenTransfer(null)}
      />

      <ReceiptViewer path={openReceipt} onClose={() => setOpenReceipt(null)} />
    </section>
  );
}
