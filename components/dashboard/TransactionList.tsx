"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Funnel, ListChecks, MagnifyingGlass, Trash, X } from "@phosphor-icons/react";
import { deleteTransactions } from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { ToggleChip } from "@/components/ui/ToggleChip";
import type { Transaction, UserCategory } from "@/lib/types";
import { BankLogo } from "./BankLogo";
import { AddCashButton } from "./CashEntry";
import { SyncGmailButton } from "./SyncGmailButton";
import { TransactionDetailModal } from "./TransactionDetailModal";

const HIGHLIGHT_MS = 2600;
// Todas las fechas en hora de Costa Rica, fija: si no, el servidor (UTC) y el
// navegador agrupan el mismo movimiento en días distintos y React tira un
// error de hidratación.
const TZ = "America/Costa_Rica";
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("es-CR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("es-CR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const dayYearFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: TZ,
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
  items: Transaction[];
  net: number;
}

/**
 * Libro de movimientos: filas separadas por líneas finas y agrupadas por día
 * (con el neto del día), en vez de una tarjeta por transacción. Monto siempre
 * alineado a la derecha y con signo escrito; en escritorio la categoría pasa
 * a su propia columna.
 */
export function TransactionList({
  title,
  transactions,
  customCategories = [],
}: {
  title: string;
  transactions: Transaction[];
  customCategories?: UserCategory[];
}) {
  const toast = useToast();
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string> | null>(null);
  const [todayKey] = useState(() => dayKeyFormat.format(new Date()));

  const [pickMode, setPickMode] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterBank, setFilterBank] = useState<string | null>(null);

  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((t) => t.category).filter((c): c is string => Boolean(c)))
      ).sort(),
    [transactions]
  );
  const availableBanks = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.bank_name))).sort(),
    [transactions]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const activeFilterCount = (filterCategory ? 1 : 0) + (filterBank ? 1 : 0);
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterBank && t.bank_name !== filterBank) return false;
      if (normalizedQuery) {
        const haystack = `${t.description ?? ""} ${t.bank_name} ${t.category ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [transactions, filterCategory, filterBank, normalizedQuery]);

  // Las transacciones ya vienen de más nueva a más vieja, así que alcanza con
  // cortar cada vez que cambia el día.
  const groups = useMemo(() => {
    const list: DayGroup[] = [];
    for (const t of filteredTransactions) {
      const key = dayKeyFormat.format(new Date(t.transaction_date));
      let group = list[list.length - 1];
      if (!group || group.key !== key) {
        group = { key, items: [], net: 0 };
        list.push(group);
      }
      group.items.push(t);
      group.net += t.type === "INCOME" ? t.amount : -t.amount;
    }
    return list;
  }, [filteredTransactions]);

  function clearFilters() {
    setFilterCategory(null);
    setFilterBank(null);
  }

  // Solo se resaltan transacciones que aparecen DESPUÉS del primer render
  // (ej. tras leer correos o anotar efectivo) — en la carga inicial nada se
  // marca como "nuevo".
  useEffect(() => {
    const currentIds = new Set(transactions.map((t) => t.id));
    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }
    const freshlyAdded = transactions
      .filter((t) => !seenIds.current!.has(t.id))
      .map((t) => t.id);
    seenIds.current = currentIds;
    if (freshlyAdded.length === 0) return;

    setNewIds(new Set(freshlyAdded));
    const timer = setTimeout(() => setNewIds(new Set()), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [transactions]);

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

  function handleRowClick(t: Transaction) {
    if (pickMode) togglePicked(t.id);
    else setSelected(t);
  }

  function handleBulkDelete() {
    const ids = Array.from(pickedIds);
    startTransition(async () => {
      const result = await deleteTransactions(ids);
      if (result.error) {
        toast.error(result.error);
        setConfirmingBulkDelete(false);
      } else {
        toast.success(
          `${ids.length} movimiento${ids.length === 1 ? "" : "s"} eliminado${ids.length === 1 ? "" : "s"}`
        );
        exitPickMode();
      }
    });
  }

  const searching = normalizedQuery !== "" || activeFilterCount > 0;

  return (
    <section aria-labelledby="movimientos-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="movimientos-titulo" className="text-heading text-ink">
          {title}
          {searching && transactions.length > 0 && (
            <span className="ml-2 text-meta font-normal text-ink-3">
              {filteredTransactions.length} de {transactions.length}
            </span>
          )}
        </h2>
        {transactions.length > 0 && (
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

      {transactions.length > 0 && (
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
                aria-label="Buscar movimientos por descripción, banco o categoría"
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
                  {availableCategories.length > 0 && (
                    <div role="group" aria-label="Categoría" className="flex flex-col gap-2 sm:flex-row sm:gap-4">
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
                  <div role="group" aria-label="Banco" className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                    <span className="w-20 shrink-0 pt-1.5 text-label text-ink-2">Banco</span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableBanks.map((b) => (
                        <ToggleChip
                          key={b}
                          pressed={filterBank === b}
                          onClick={() => setFilterBank(filterBank === b ? null : b)}
                        >
                          {b}
                        </ToggleChip>
                      ))}
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="-ml-2 self-start">
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {transactions.length === 0 ? (
        // El estado vacío decía solo "esperá a que lleguen", pero alguien que
        // recién conecta el correo ya tiene movimientos viejos esperando en la
        // bandeja. Las dos acciones van acá mismo, donde se está mirando.
        <div className="mt-2 border-t border-line py-10">
          <p className="text-heading text-ink">Todavía no hay movimientos</p>
          <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-ink-2">
            Los correos nuevos de tus bancos van a aparecer acá solos. Si acabás de entrar, leé
            los que ya tenés en la bandeja para arrancar con algo.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* Sin variante primaria: la acción primaria de la pantalla ya
                está en el encabezado. */}
            <SyncGmailButton variant="secondary" />
            <AddCashButton variant="ghost" />
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
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
            const label = dayLabel(group.key, group.items[0].transaction_date, todayKey);
            return (
              <div key={group.key} className="pt-2 first:pt-0 md:pt-4 md:first:pt-1">
                <h3 className="sticky top-14 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-ground py-2 md:top-0">
                  <span suppressHydrationWarning className="text-label text-ink-2">
                    {label}
                  </span>
                  <Money value={group.net} plus className="text-meta text-ink-3" />
                </h3>
                <ul aria-label={label}>
                  {group.items.map((t) => {
                    const income = t.type === "INCOME";
                    const isNew = newIds.has(t.id);
                    const isPicked = pickedIds.has(t.id);
                    return (
                      <li
                        key={t.id}
                        className={`border-b border-line last:border-b-0 ${isNew ? "row-arrived" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleRowClick(t)}
                          aria-pressed={pickMode ? isPicked : undefined}
                          className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition-colors duration-150 hover:bg-surface-hover/70 focus-visible:outline-offset-[-2px] md:-mx-2 md:w-[calc(100%+1rem)] md:rounded-control md:px-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,9rem)_auto] lg:gap-4"
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
                            <BankLogo bank={t.bank_name} size={32} />
                          </span>

                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium text-ink">
                                {t.description ?? (income ? "Ingreso" : "Gasto")}
                              </span>
                              {isNew && (
                                <span className="shrink-0 text-micro font-medium text-accent">
                                  Nuevo
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-meta text-ink-3">
                              {t.bank_name} · {timeFormat.format(new Date(t.transaction_date))}
                              <span className="lg:hidden">
                                {" · "}
                                {t.category ?? "Sin categoría"}
                              </span>
                            </span>
                          </span>

                          <span
                            className={`hidden truncate text-label font-normal lg:block ${
                              t.category ? "text-ink-2" : "text-ink-3"
                            }`}
                          >
                            {t.category ?? "Sin categoría"}
                          </span>

                          <Money
                            value={income ? t.amount : -t.amount}
                            plus
                            className={`text-right text-sm font-medium ${income ? "text-income" : "text-ink"}`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <TransactionDetailModal
        transaction={selected}
        customCategories={customCategories}
        onClose={() => setSelected(null)}
      />

      <AnimatePresence>
        {pickMode && pickedIds.size > 0 && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-line-strong bg-surface md:inset-x-auto md:bottom-6 md:right-8 md:rounded-surface md:border md:shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]"
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
    </section>
  );
}
