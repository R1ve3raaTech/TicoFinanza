import { it } from "node:test";
import assert from "node:assert/strict";
import {
  chargeDayKey,
  daysBetween,
  effectiveStatus,
  fixedTotals,
  upcomingPayments,
} from "./fixedExpenses";
import type { FixedExpense } from "./types";

function expense(partial: Partial<FixedExpense> & { id: string; charge_day: number }): FixedExpense {
  return {
    user_id: "u1",
    name: partial.name ?? partial.id,
    amount: partial.amount ?? 1000,
    currency: "CRC",
    category: partial.category ?? null,
    status: partial.status ?? "PENDING",
    status_month: partial.status_month ?? null,
    account_id: partial.account_id ?? null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

it("recorta el día de cobro al último día del mes en vez de desbordarlo", () => {
  assert.equal(chargeDayKey(2026, 2, 31), "2026-02-28");
  assert.equal(chargeDayKey(2028, 2, 31), "2028-02-29"); // bisiesto
  assert.equal(chargeDayKey(2026, 4, 31), "2026-04-30");
  assert.equal(chargeDayKey(2026, 10, 5), "2026-10-05");
});

it("un gasto pagado vuelve a estar pendiente al cambiar de mes", () => {
  const paid = expense({ id: "f1", charge_day: 1, status: "PAID", status_month: "2026-10" });
  assert.equal(effectiveStatus(paid, "2026-10"), "PAID");
  assert.equal(effectiveStatus(paid, "2026-11"), "PENDING");
  // Un estado pagado sin mes no vale para ninguno.
  assert.equal(effectiveStatus({ status: "PAID", status_month: null }, "2026-10"), "PENDING");
});

it("ordena los cobros del más cercano al más lejano y marca los urgentes", () => {
  const today = "2026-10-02";
  const payments = upcomingPayments(
    [
      expense({ id: "lejos", charge_day: 25 }),
      expense({ id: "urgente", charge_day: 5 }),
      expense({ id: "vencido", charge_day: 1 }),
      expense({ id: "pagado", charge_day: 3, status: "PAID", status_month: "2026-10" }),
    ],
    today
  );

  assert.deepEqual(
    payments.map((p) => p.id),
    ["vencido", "urgente", "lejos", "pagado"]
  );

  const [vencido, urgente, lejos, pagado] = payments;
  assert.equal(vencido.dueInDays, -1);
  assert.equal(vencido.overdue, true);
  assert.equal(vencido.urgent, true);

  assert.equal(urgente.dueInDays, 3);
  assert.equal(urgente.urgent, true, "menos de 5 días se resalta");

  assert.equal(lejos.dueInDays, 23);
  assert.equal(lejos.urgent, false);

  // Lo pagado en el mes apunta al cobro del mes siguiente y nunca es urgente.
  assert.equal(pagado.dueKey, "2026-11-03");
  assert.equal(pagado.urgent, false);
});

it("suma los totales del mes separando pagado de pendiente", () => {
  const totals = fixedTotals(
    [
      expense({ id: "a", charge_day: 1, amount: 185000, status: "PAID", status_month: "2026-10" }),
      expense({ id: "b", charge_day: 5, amount: 24500 }),
      // Pagado el mes pasado: cuenta como pendiente este mes.
      expense({ id: "c", charge_day: 8, amount: 22500, status: "PAID", status_month: "2026-09" }),
    ],
    "2026-10"
  );
  assert.deepEqual(totals, { total: 232000, paid: 185000, pending: 47000 });
});

it("cuenta los días entre fechas sin que el huso corra el resultado", () => {
  assert.equal(daysBetween("2026-10-02", "2026-10-05"), 3);
  assert.equal(daysBetween("2026-10-05", "2026-10-02"), -3);
  assert.equal(daysBetween("2026-10-31", "2026-11-01"), 1);
  // Cambio de hora en el hemisferio norte: marzo tiene un día de 23 horas.
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
});
