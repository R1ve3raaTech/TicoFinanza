import { it } from "node:test";
import assert from "node:assert/strict";
import { compareMonths, comparisonTone, cutoffDay, previousMonth } from "./comparison";
import type { Transaction } from "./types";

function gasto(
  date: string,
  amount: number,
  category = "Alimentación"
): Pick<Transaction, "amount" | "type" | "transaction_date" | "category"> {
  return { amount, type: "EXPENSE", transaction_date: `${date}T12:00:00.000Z`, category };
}

it("el mes anterior cruza bien el cambio de año", () => {
  assert.equal(previousMonth("2026-11"), "2026-10");
  assert.equal(previousMonth("2026-01"), "2025-12");
});

it("corta el día 31 al último día que exista en ese mes", () => {
  assert.equal(cutoffDay(31, "2026-11"), 30, "noviembre no tiene 31");
  assert.equal(cutoffDay(31, "2026-10"), 31);
  assert.equal(cutoffDay(30, "2026-02"), 28);
  assert.equal(cutoffDay(5, "2026-11"), 5);
});

it("compara el mismo pedazo de calendario, no mes entero contra mes a medias", () => {
  const movimientos = [
    // Noviembre, hasta el día 3.
    gasto("2026-11-01", 10_000),
    gasto("2026-11-03", 5_000),
    // Octubre: lo de antes del 3 cuenta, lo de después no.
    gasto("2026-10-02", 8_000),
    gasto("2026-10-03", 2_000),
    gasto("2026-10-25", 90_000),
  ];

  const c = compareMonths(movimientos, "2026-11", 3);
  assert.equal(c.current, 15_000);
  assert.equal(c.previous, 10_000, "los 90.000 del 25 de octubre no entran");
  assert.equal(c.difference, 5_000);
  assert.equal(c.percent, 50);
  assert.equal(comparisonTone(c), "más");
});

it("ignora los ingresos: compara gasto contra gasto", () => {
  const movimientos = [
    gasto("2026-11-01", 10_000),
    { amount: 500_000, type: "INCOME" as const, transaction_date: "2026-11-01T12:00:00.000Z", category: "Salario" },
  ];
  assert.equal(compareMonths(movimientos, "2026-11", 5).current, 10_000);
});

it("filtra por categoría cuando se pide", () => {
  const movimientos = [
    gasto("2026-11-01", 10_000, "Alimentación"),
    gasto("2026-11-02", 30_000, "Transporte"),
    gasto("2026-10-01", 5_000, "Alimentación"),
  ];
  const c = compareMonths(movimientos, "2026-11", 5, "Alimentación");
  assert.equal(c.current, 10_000);
  assert.equal(c.previous, 5_000);
});

it("sin gasto el mes pasado no inventa un porcentaje infinito", () => {
  const c = compareMonths([gasto("2026-11-01", 10_000)], "2026-11", 3);
  assert.equal(c.previous, 0);
  assert.equal(c.percent, null);
  assert.equal(c.difference, 10_000);
});

it("una diferencia de calderilla se lee como 'igual'", () => {
  const movimientos = [gasto("2026-11-01", 10_000), gasto("2026-10-01", 9_800)];
  assert.equal(comparisonTone(compareMonths(movimientos, "2026-11", 3)), "igual");
});

it("los dos meses en cero son iguales, no una caída", () => {
  assert.equal(comparisonTone(compareMonths([], "2026-11", 3)), "igual");
});
