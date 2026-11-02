"use client";

import { ArrowClockwise, CloudSlash, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { MAX_ATTEMPTS, pendingLabel } from "@/lib/offline";
import { useOfflineQueue } from "./useOfflineQueue";

const dayFormat = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Costa_Rica",
});

/**
 * Lo anotado sin señal, mientras espera para irse.
 *
 * Existe porque guardar en silencio es indistinguible de perder el dato:
 * si anotás un gasto y la lista no lo muestra ni el saldo se mueve, la
 * conclusión razonable es que la app lo botó. Ese fue exactamente el bug
 * del 2026-11-02 con el filtro de "Todo", y no vale la pena repetirlo.
 *
 * Va arriba de la lista y no mezclado en ella: todavía no es un movimiento
 * de la cuenta, y ponerlo entre los que sí lo son volvería imposible
 * comparar la lista con el banco.
 */
export function PendingMovements() {
  const { items, ready, flushing, flush, discard, retry } = useOfflineQueue();

  if (!ready || items.length === 0) return null;

  const blocked = items.filter((item) => item.attempts >= MAX_ATTEMPTS);

  return (
    <section
      aria-labelledby="pendientes-titulo"
      className="mt-5 rounded-surface border border-line bg-surface-raised/50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            id="pendientes-titulo"
            className="flex items-center gap-2 text-label text-ink"
          >
            <CloudSlash size={15} aria-hidden className="shrink-0 text-ink-3" />
            {pendingLabel(items.length)}
          </h2>
          <p className="mt-1 max-w-[58ch] text-meta leading-relaxed text-ink-3">
            Quedaron guardados en este teléfono y se mandan solos en cuanto vuelva la señal.
            Todavía no cuentan en el saldo ni en las cifras del mes.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void flush()} disabled={flushing}>
          <ArrowClockwise size={13} />
          {flushing ? "Enviando..." : "Enviar ahora"}
        </Button>
      </div>

      <ul className="mt-3 border-t border-line">
        {items.map((item) => {
          const stuckHere = item.attempts >= MAX_ATTEMPTS;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line py-2.5"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="money shrink-0 text-meta text-ink-3">
                  {dayFormat.format(new Date(item.input.transactionDate))}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">
                    {item.input.description || item.input.category || "Sin detalle"}
                  </span>
                  {stuckHere && (
                    <span className="block text-meta text-ink-2">
                      {item.lastError ?? "No se pudo enviar después de varios intentos."}
                    </span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <Money
                  value={
                    item.input.type === "INCOME" ? item.input.amount : -item.input.amount
                  }
                  plus
                  className="text-sm font-medium text-ink"
                />
                {stuckHere && (
                  <Button variant="ghost" size="sm" onClick={() => void retry(item.id)}>
                    Reintentar
                  </Button>
                )}
                <Button
                  variant="danger-ghost"
                  size="sm"
                  aria-label="Descartar este pendiente"
                  onClick={() => void discard(item.id)}
                >
                  <Trash size={13} />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>

      {blocked.length > 0 && (
        <p className="mt-3 max-w-[58ch] text-meta leading-relaxed text-ink-3">
          Lo que el servidor rechazó no se reintenta solo. Revisá el motivo, volvé a anotarlo
          como corresponde y descartá el pendiente.
        </p>
      )}
    </section>
  );
}
