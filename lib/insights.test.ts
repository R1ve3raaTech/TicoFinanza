import { it } from "node:test";
import assert from "node:assert/strict";
import { monthSummary, monthlyTotals } from "./insights";
import type { Transaction } from "./types";

function movement(type: Transaction["type"], amount: number) {
  return { type, amount };
}

it("el neto cuenta solo los fijos ya pagados, no los comprometidos", () => {
  // El caso que confundía: día 2 del mes, el salario todavía no entró, y
  // todos los fijos del mes ya estaban restando.
  const summary = monthSummary([movement("EXPENSE", 4_100)], {
    total: 11_000,
    paid: 0,
    pending: 11_000,
  });

  assert.equal(summary.net, -4_100, "solo lo que de verdad salió");
  assert.equal(summary.projectedNet, -15_100, "cómo cerraría el mes si no entra nada más");
  assert.equal(summary.fixedPending, 11_000);
  assert.equal(summary.fixedExpenses, 11_000, "la tarjeta de fijos sigue mostrando el total");
});

it("con todo pagado, el ejecutado y el proyectado coinciden", () => {
  const summary = monthSummary([movement("INCOME", 500_000), movement("EXPENSE", 30_000)], {
    total: 200_000,
    paid: 200_000,
    pending: 0,
  });

  assert.equal(summary.net, 270_000);
  assert.equal(summary.projectedNet, 270_000);
  assert.equal(summary.fixedPending, 0);
});

it("pagar un fijo mueve el neto ejecutado, no el proyectado", () => {
  const movements = [movement("INCOME", 300_000)];
  const antes = monthSummary(movements, { total: 100_000, paid: 0, pending: 100_000 });
  const despues = monthSummary(movements, { total: 100_000, paid: 100_000, pending: 0 });

  assert.equal(antes.net, 300_000);
  assert.equal(despues.net, 200_000, "al pagarlo, la plata ya salió");
  assert.equal(
    antes.projectedNet,
    despues.projectedNet,
    "el cierre del mes no cambia por el momento en que pagás"
  );
});

it("un mes sin nada anotado da todo en cero", () => {
  const summary = monthSummary([], { total: 0, paid: 0, pending: 0 });
  assert.equal(summary.income, 0);
  assert.equal(summary.net, 0);
  assert.equal(summary.projectedNet, 0);
});


/**
 * Los cubos del gráfico de seis meses, en hora de Costa Rica.
 *
 * Antes el mes de cada movimiento salía de `getMonth()`, o sea de la hora
 * del servidor — UTC en Vercel.
 */
it("un movimiento del último día del mes, de noche, cae en su propia barra", () => {
  // 31 de octubre, 8 p.m. en Costa Rica = 1 de noviembre 02:00 UTC.
  const totals = monthlyTotals(
    [{ transaction_date: "2026-11-01T02:00:00.000Z", type: "EXPENSE", amount: 9_000 }],
    6,
    "2026-11"
  );

  const octubre = totals.find((t) => t.monthKey === "2026-10");
  const noviembre = totals.find((t) => t.monthKey === "2026-11");
  assert.equal(octubre?.expense, 9_000);
  assert.equal(noviembre?.expense, 0);
});

it("los seis cubos salen del mes en curso, sin saltarse el cambio de año", () => {
  const keys = monthlyTotals([], 6, "2026-01").map((t) => t.monthKey);
  assert.deepEqual(keys, ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]);
});

it("lo que cae fuera de la ventana no se suma a ninguna barra", () => {
  const totals = monthlyTotals(
    [{ transaction_date: "2020-01-15T12:00:00.000Z", type: "INCOME", amount: 500 }],
    6,
    "2026-11"
  );
  assert.equal(
    totals.reduce((sum, t) => sum + t.income, 0),
    0
  );
});
