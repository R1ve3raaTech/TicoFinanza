import { it } from "node:test";
import assert from "node:assert/strict";
import {
  adjustmentDescription,
  reconcile,
  suggestedMode,
  UNIDENTIFIED_CATEGORY,
} from "./reconcile";
import { categoryClash } from "./categories";

it("si los dos saldos coinciden, no hay nada que registrar", () => {
  const r = reconcile(120_000, 120_000);
  assert.equal(r.kind, "cuadra");
  assert.equal(r.difference, 0);
  assert.equal(r.movement, null);
});

it("si el banco tiene menos, es un gasto que no se anotó", () => {
  // El caso de todos los días: se te olvidaron unos almuerzos.
  const r = reconcile(120_000, 113_000);
  assert.equal(r.kind, "falta");
  assert.equal(r.difference, -7_000);
  assert.deepEqual(r.movement, { type: "EXPENSE", amount: 7_000 });
});

it("si el banco tiene más, es un ingreso que no se anotó", () => {
  const r = reconcile(113_000, 120_000);
  assert.equal(r.kind, "sobra");
  assert.equal(r.difference, 7_000);
  assert.deepEqual(r.movement, { type: "INCOME", amount: 7_000 });
});

/**
 * **Sin tolerancia, a propósito.** Una tolerancia "razonable" (₡100, ₡500)
 * es justo por donde se cuela el goteo que esto viene a detectar: cien
 * colones por día son tres mil al mes que nunca aparecerían.
 */
it("un colón de diferencia ya es una diferencia", () => {
  const r = reconcile(120_000, 119_999);
  assert.equal(r.kind, "falta");
  assert.deepEqual(r.movement, { type: "EXPENSE", amount: 1 });
});

it("funciona con una tarjeta de crédito, que va en negativo", () => {
  // La app cree que debés 50.000 y el banco dice que debés 58.000.
  const r = reconcile(-50_000, -58_000);
  assert.equal(r.kind, "falta");
  assert.deepEqual(r.movement, { type: "EXPENSE", amount: 8_000 }, "gastaste 8.000 más");
});

it("y cuando una tarjeta debe menos de lo que la app cree", () => {
  const r = reconcile(-58_000, -50_000);
  assert.equal(r.kind, "sobra");
  assert.deepEqual(r.movement, { type: "INCOME", amount: 8_000 }, "abonaste y no lo anotaste");
});

/**
 * En una cuenta sin movimientos no hubo nada que olvidar: lo que está mal
 * es el número de arranque. Registrar un gasto ahí sería inventar uno.
 */
it("una cuenta sin movimientos corrige el punto de partida", () => {
  assert.equal(suggestedMode(0), "punto-de-partida");
});

it("una cuenta con movimientos registra la diferencia", () => {
  assert.equal(suggestedMode(1), "registrar");
  assert.equal(suggestedMode(240), "registrar");
});

it("el detalle del ajuste lleva la fecha, para reconocerlo después", () => {
  const texto = adjustmentDescription("2026-11-21");
  assert.match(texto, /2026-11-21/);
  assert.match(texto, /banco/i);
});

/**
 * Si alguien pudiera crear una categoría propia con este nombre, en el
 * desglose habría dos cosas distintas pintadas igual.
 */
it("nadie puede crear una categoría que se llame como la de los ajustes", () => {
  assert.ok(categoryClash(UNIDENTIFIED_CATEGORY, "EXPENSE", []));
  assert.ok(categoryClash("sin identificar", "EXPENSE", []), "sin mayúsculas tampoco");
  assert.ok(categoryClash("Sin Identificar", "INCOME", []), "ni en ingresos");
});
