import { it } from "node:test";
import assert from "node:assert/strict";
import { budgetProgress, budgetStatus, budgetTotals } from "./budgets";
import { expenseByCategory } from "./insights";
import type { Budget } from "./types";

function budget(category: string, limit: number): Budget {
  return {
    id: category,
    user_id: "u1",
    category_name: category,
    monthly_limit: limit,
    month_year: "2026-10",
    created_at: "2026-10-01T00:00:00.000Z",
  };
}

it("corta el estado en 70 %, 90 % y 100 %", () => {
  assert.equal(budgetStatus(0), "ok");
  assert.equal(budgetStatus(0.699), "ok");
  assert.equal(budgetStatus(0.7), "warn");
  assert.equal(budgetStatus(0.899), "warn");
  assert.equal(budgetStatus(0.9), "close");
  assert.equal(budgetStatus(1), "close", "justo en el tope todavía no es pasarse");
  assert.equal(budgetStatus(1.01), "over");
});

it("cruza topes contra gasto y ordena por lo más comprometido", () => {
  const progress = budgetProgress(
    [budget("Vivienda", 200000), budget("Ocio", 50000), budget("Salud", 40000)],
    new Map([
      ["Vivienda", 100000],
      ["Ocio", 60000],
      ["Salud", 38000],
    ])
  );

  assert.deepEqual(
    progress.map((p) => p.category),
    ["Ocio", "Salud", "Vivienda"]
  );

  const [ocio, salud, vivienda] = progress;
  assert.equal(ocio.status, "over");
  assert.equal(ocio.remaining, 0, "pasado el tope no queda nada disponible");
  assert.equal(salud.status, "close");
  assert.equal(vivienda.status, "ok");
  assert.equal(vivienda.remaining, 100000);
  assert.equal(vivienda.ratio, 0.5);
});

it("una categoría con tope y sin gasto queda en cero, no se cae", () => {
  const [item] = budgetProgress([budget("Educación", 30000)], new Map());
  assert.equal(item.spent, 0);
  assert.equal(item.ratio, 0);
  assert.equal(item.status, "ok");
});

it("suma los totales y cuenta cuántas categorías se pasaron", () => {
  const totals = budgetTotals(
    budgetProgress(
      [budget("Vivienda", 200000), budget("Ocio", 50000)],
      new Map([
        ["Vivienda", 100000],
        ["Ocio", 60000],
      ])
    )
  );
  assert.deepEqual(totals, { limit: 250000, spent: 160000, over: 1 });
});

it("el gasto por categoría junta lo variable y lo fijo", () => {
  const spent = expenseByCategory(
    [
      { category: "Servicios", amount: 12000, type: "EXPENSE" },
      { category: "Servicios", amount: 8000, type: "EXPENSE" },
      // Un ingreso en una categoría de gasto no debería sumar nunca.
      { category: "Servicios", amount: 500000, type: "INCOME" },
      { category: null, amount: 3000, type: "EXPENSE" },
    ],
    [
      { category: "Servicios", amount: 22500 },
      { category: "Vivienda", amount: 185000 },
    ]
  );

  assert.equal(spent.get("Servicios"), 42500);
  assert.equal(spent.get("Vivienda"), 185000);
  assert.equal(spent.get("Sin categoría"), 3000);
});
