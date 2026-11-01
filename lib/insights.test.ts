import { it } from "node:test";
import assert from "node:assert/strict";
import { monthSummary } from "./insights";
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
