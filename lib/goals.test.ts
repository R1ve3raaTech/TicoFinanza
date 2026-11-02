import { it } from "node:test";
import assert from "node:assert/strict";
import { annualMonthly, goalProgress, nextCycleDate, proration } from "./goals";
import type { SavingsGoal } from "./types";

function goal(partial: Partial<SavingsGoal> & { id: string }): SavingsGoal {
  return {
    user_id: "u1",
    name: "Marchamo",
    target_amount: 120_000,
    current_amount: 0,
    target_date: "2026-12-31",
    color: "celeste",
    recurrence: "anual",
    cycles_completed: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

it("el prorrateo divide el objetivo entre doce meses", () => {
  const rate = proration(goal({ id: "a" }), "2026-01-01");
  assert.equal(rate?.perMonth, 10_000);
});

it("mide contra el ritmo: a once meses del cobro debería llevar once cuotas", () => {
  // Hoy 1.º de febrero, el marchamo vence el 31 de diciembre: faltan 10
  // meses enteros, así que ya pasaron 2 del ciclo.
  const rate = proration(goal({ id: "a", current_amount: 5_000 }), "2026-02-01");
  assert.equal(rate?.monthsElapsed, 2);
  assert.equal(rate?.expected, 20_000);
  assert.equal(rate?.behind, 15_000);
});

it("quien va adelantado no debe nada", () => {
  const rate = proration(goal({ id: "a", current_amount: 90_000 }), "2026-02-01");
  assert.equal(rate?.behind, 0);
});

it("lo esperado nunca pasa del objetivo, aunque la cuota se redondee hacia arriba", () => {
  // 100.000 / 12 = 8.333,33 → la cuota sube a 8.334 y doce cuotas darían
  // 100.008. En el mes del cobro lo esperado tiene que ser el objetivo.
  const rate = proration(
    goal({ id: "a", target_amount: 100_000 }),
    "2026-12-31"
  );
  assert.equal(rate?.monthsElapsed, 12);
  assert.equal(rate?.expected, 100_000);
});

it("pasada la fecha el ciclo no sigue contando meses", () => {
  const rate = proration(goal({ id: "a" }), "2027-06-15");
  assert.equal(rate?.monthsElapsed, 12);
});

it("una meta de una sola vez no se prorratea", () => {
  assert.equal(proration(goal({ id: "a", recurrence: "una-vez" }), "2026-02-01"), null);
});

it("una meta anual sin fecha tampoco: no hay ciclo contra el que medir", () => {
  assert.equal(proration(goal({ id: "a", target_date: null }), "2026-02-01"), null);
});

it("el ciclo siguiente es un año después", () => {
  assert.equal(nextCycleDate("2026-12-31", "2026-12-15"), "2027-12-31");
});

it("si el año siguiente ya pasó, salta hasta el primero que viene", () => {
  // Alguien que completa el ciclo con dos años de atraso no debería quedar
  // con una meta nueva ya vencida: el cobro que sigue es el de este año.
  assert.equal(nextCycleDate("2024-12-31", "2026-11-01"), "2026-12-31");
  assert.equal(nextCycleDate("2024-03-31", "2026-11-01"), "2027-03-31");
});

it("un 29 de febrero cae al 28 cuando el año no es bisiesto", () => {
  assert.equal(nextCycleDate("2028-02-29", "2028-03-01"), "2029-02-28");
});

it("el prorrateo mensual suma solo las metas anuales", () => {
  const goals = [
    goal({ id: "a", target_amount: 120_000 }),
    goal({ id: "b", target_amount: 60_000, target_date: "2027-03-31" }),
    goal({ id: "c", target_amount: 999_999, recurrence: "una-vez" }),
  ];
  assert.equal(annualMonthly(goals, "2026-11-01"), 15_000);
});

it("el avance de una meta anual se mide igual que el de cualquier otra", () => {
  const progress = goalProgress(goal({ id: "a", current_amount: 60_000 }), "2026-11-01");
  assert.equal(progress.ratio, 0.5);
  assert.equal(progress.remaining, 60_000);
});
