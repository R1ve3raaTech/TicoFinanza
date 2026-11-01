import { it } from "node:test";
import assert from "node:assert/strict";
import { movementsRange } from "./dateRange";

it("sin rango en la URL no recorta nada: se ve todo el historial", () => {
  const range = movementsRange({});
  assert.equal(range.fromISO, null, "este era el bug: recortaba al día 1 del mes");
  assert.equal(range.toISO, null);
  assert.equal(range.label, "todo tu historial");
  assert.equal(range.csvQuery, "", "el CSV también exporta todo");
});

it("con rango, filtra del inicio del primer día al final del último", () => {
  const range = movementsRange({ from: "2026-10-01", to: "2026-10-31" });
  assert.ok(range.fromISO?.startsWith("2026-10-01"));
  assert.ok(range.toISO);
  assert.match(range.label, /oct/);
  assert.equal(range.csvQuery, "from=2026-10-01&to=2026-10-31");
});

it("una fecha mal formada se ignora en vez de romper la consulta", () => {
  const range = movementsRange({ from: "ayer", to: "2026-10-31" });
  assert.equal(range.fromISO, null);
  assert.ok(range.toISO, "el extremo válido sí se aplica");
  assert.equal(range.csvQuery, "to=2026-10-31");
});

it("con un solo extremo no inventa el otro", () => {
  const soloDesde = movementsRange({ from: "2026-10-01" });
  assert.ok(soloDesde.fromISO);
  assert.equal(soloDesde.toISO, null);
  assert.equal(soloDesde.label, "todo tu historial", "no es un rango cerrado");
});
