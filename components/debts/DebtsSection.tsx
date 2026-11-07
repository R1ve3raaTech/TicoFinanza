"use client";

import { useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Plus,
  Warning,
} from "@phosphor-icons/react";
import { reopenDebt } from "@/app/dashboard/plan/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { debtRows, debtTotals, type DebtRow } from "@/lib/debts";
import type { Account, Debt, DebtType } from "@/lib/types";
import { DebtDialog } from "./DebtDialog";
import { SettleDebtDialog } from "./SettleDebtDialog";

const dateFormat = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * La línea de contexto de cada fila. El plazo va siempre escrito, no solo
 * pintado de rojo: el color no se lee en escala de grises ni con daltonismo.
 */
function dueText(row: DebtRow): string {
  if (row.status === "pagado") {
    const when = row.settled_at ?? row.created_at;
    return `Saldada el ${dateFormat.format(new Date(when))}`;
  }
  if (row.dueInDays === null) return "Sin fecha acordada";
  if (row.dueInDays < 0) {
    const days = -row.dueInDays;
    return `Venció hace ${days} ${days === 1 ? "día" : "días"}`;
  }
  if (row.dueInDays === 0) return "Vence hoy";
  if (row.dueInDays === 1) return "Vence mañana";
  if (row.dueInDays < 7) return `Vence en ${row.dueInDays} días`;
  return `Vence el ${dateFormat.format(new Date(`${row.due_date}T12:00:00Z`))}`;
}

function DebtItem({
  row,
  onEdit,
  onSettle,
  onReopen,
  pending,
}: {
  row: DebtRow;
  onEdit: () => void;
  onSettle: () => void;
  onReopen: () => void;
  pending: boolean;
}) {
  const income = row.type === "me_deben";
  const settled = row.status === "pagado";
  const tone =
    row.urgency === "vencida" ? "text-expense" : row.urgency === "pronto" ? "text-warn" : "text-ink-3";

  return (
    <li className="relative border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onEdit}
        // La acción (saldar o reabrir) es un botón hermano, no anidado: la
        // fila le reserva el espacio a la derecha. `md:pr-24` va repetido a
        // propósito: Tailwind ordena por variante antes que por propiedad,
        // así que sin él `md:px-2` le gana al `sm:pr-24` y el monto termina
        // debajo del botón.
        className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 pr-9 text-left transition-colors duration-150 hover:bg-surface-hover/70 focus-visible:outline-offset-[-2px] sm:pr-24 md:-mx-2 md:w-[calc(100%+1rem)] md:rounded-control md:px-2 md:pr-24"
      >
        {/* La flecha dice la dirección por su forma, no por el color. */}
        <span
          aria-hidden
          className={`flex h-8 w-8 items-center justify-center rounded-control bg-surface-raised ${
            settled ? "text-ink-3/60" : "text-ink-3"
          }`}
        >
          {income ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
        </span>

        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={`truncate text-sm font-medium ${settled ? "text-ink-2 line-through" : "text-ink"}`}
            >
              {row.person_name}
            </span>
            {!settled && row.urgency !== "ninguna" && (
              <span aria-hidden className={`shrink-0 ${tone}`}>
                {row.urgency === "vencida" ? <Warning size={13} /> : <Clock size={13} />}
              </span>
            )}
          </span>
          <span className={`block truncate text-meta ${settled ? "text-ink-3" : tone}`}>
            {income ? "Te debe" : "Le debés"} · {dueText(row)}
            {row.notes && <span className="text-ink-3"> · {row.notes}</span>}
          </span>
        </span>

        <Money
          value={income ? row.amount : -row.amount}
          plus
          className={`text-right text-sm font-medium ${settled ? "text-ink-3" : "text-ink"}`}
        />
      </button>

      {settled ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReopen}
          disabled={pending}
          aria-label={`Reabrir la deuda de ${row.person_name}`}
          className="absolute right-0 top-1/2 -translate-y-1/2 px-2"
        >
          <ArrowCounterClockwise size={14} />
          <span className="hidden sm:inline">Reabrir</span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettle}
          disabled={pending}
          aria-label={`Marcar como saldada la deuda de ${row.person_name}`}
          className="absolute right-0 top-1/2 -translate-y-1/2 px-2"
        >
          <Check size={14} weight="bold" />
          <span className="hidden sm:inline">Saldar</span>
        </Button>
      )}
    </li>
  );
}

/**
 * Deudas y préstamos entre personas: lo que te deben y lo que debés.
 *
 * No son movimientos: prestar no es un gasto (la plata sigue siendo tuya,
 * solo que no la tenés encima) y que te deban no es un ingreso hasta que te
 * pagan. Por eso viven en su propia tabla y no tocan el superávit del mes
 * hasta que se saldan — y ahí el movimiento se registra aparte, si se quiere.
 */
export function DebtsSection({
  debts,
  accounts,
  todayKey,
}: {
  debts: Debt[];
  accounts: Account[];
  todayKey: string;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<Debt | null>(null);
  const [presetType, setPresetType] = useState<DebtType>("me_deben");
  const [debtOpen, setDebtOpen] = useState(false);
  const [settling, setSettling] = useState<Debt | null>(null);
  const [session, setSession] = useState(0);
  const [pending, startTransition] = useTransition();

  function openDebt(debt: Debt | null, type: DebtType = "me_deben") {
    setEditing(debt);
    setPresetType(type);
    setSession((s) => s + 1);
    setDebtOpen(true);
  }

  function openSettle(debt: Debt) {
    setSession((s) => s + 1);
    setSettling(debt);
  }

  function reopen(debt: Debt) {
    startTransition(async () => {
      const result = await reopenDebt(debt.id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(
          debt.settled_transaction_id
            ? "Deuda reabierta y movimiento deshecho"
            : "Deuda reabierta"
        );
      }
    });
  }

  const rows = debtRows(debts, todayKey);
  const pendingRows = rows.filter((row) => row.status === "pendiente");
  const settledRows = rows.filter((row) => row.status === "pagado");
  const totals = debtTotals(debts, todayKey);

  return (
    <section aria-labelledby="deudas-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="deudas-titulo" className="text-heading text-ink">
          Deudas y préstamos
          {totals.overdueCount > 0 && (
            <span className="ml-2 text-meta font-normal text-expense">
              {totals.overdueCount} vencida{totals.overdueCount === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => openDebt(null)} className="-mr-2">
          <Plus size={14} weight="bold" />
          Nueva
        </Button>
      </div>

      {debts.length === 0 ? (
        <div className="border-t border-line py-8">
          <p className="max-w-[54ch] text-sm leading-relaxed text-ink-2">
            Anotá lo que te deben y lo que debés, con la fecha en la que quedaron. No cuenta como
            ingreso ni como gasto hasta que se salda — prestar plata no es gastarla.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openDebt(null, "me_deben")}>
              <Plus size={15} weight="bold" />
              Me deben
            </Button>
            <Button variant="ghost" onClick={() => openDebt(null, "debo")}>
              <Plus size={15} weight="bold" />
              Debo
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Te deben, debés y el neto viven en el encabezado de la pestaña
              (SectionLead en PlanView). */}
          {pendingRows.length > 0 && (
            <ul className="pt-1">
              {pendingRows.map((row) => (
                <DebtItem
                  key={row.id}
                  row={row}
                  pending={pending}
                  onEdit={() => openDebt(row, row.type)}
                  onSettle={() => openSettle(row)}
                  onReopen={() => reopen(row)}
                />
              ))}
            </ul>
          )}

          {pendingRows.length === 0 && (
            <p className="border-b border-line py-6 text-sm text-ink-2">
              No queda nada pendiente. Todo lo anotado está saldado.
            </p>
          )}

          {settledRows.length > 0 && (
            <div className="pt-6">
              <h3 className="text-label text-ink-2">Saldadas</h3>
              <ul className="mt-2 border-t border-line">
                {settledRows.map((row) => (
                  <DebtItem
                    key={row.id}
                    row={row}
                    pending={pending}
                    onEdit={() => openDebt(row, row.type)}
                    onSettle={() => openSettle(row)}
                    onReopen={() => reopen(row)}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <DebtDialog
        key={`deuda-${session}`}
        open={debtOpen}
        onClose={() => setDebtOpen(false)}
        debt={editing}
        presetType={presetType}
      />
      <SettleDebtDialog
        key={`saldar-${session}`}
        open={Boolean(settling)}
        onClose={() => setSettling(null)}
        debt={settling}
        accounts={accounts}
      />
    </section>
  );
}
