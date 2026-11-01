import { it } from "node:test";
import assert from "node:assert/strict";
import { periodRange, resolvePeriod } from "./dateRange";

// Martes 4 de noviembre de 2026.
const HOY = "2026-11-04";

it("sin período en la URL no recorta nada: se ve todo el historial", () => {
  const range = resolvePeriod({}, HOY);
  assert.equal(range.fromISO, null, "este era el bug: recortaba al día 1 del mes");
  assert.equal(range.toISO, null);
  assert.equal(range.id, "todo");
  assert.equal(range.label, "todo tu historial");
  assert.equal(range.csvQuery, "", "el CSV también exporta todo");
});

it("los períodos son de calendario, no ventanas de N días", () => {
  assert.deepEqual(periodRange("hoy", HOY), { from: HOY, to: HOY });
  assert.deepEqual(
    periodRange("semana", HOY),
    { from: "2026-11-02", to: HOY },
    "la semana arranca el lunes, no siete días atrás"
  );
  assert.deepEqual(
    periodRange("mes", HOY),
    { from: "2026-11-01", to: "2026-11-30" },
    "del 1 al último día, no los últimos 30 días"
  );
  assert.deepEqual(periodRange("mes-pasado", HOY), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(periodRange("anio", HOY), { from: "2026-01-01", to: "2026-12-31" });
  assert.equal(periodRange("todo", HOY), null);
});

it("el mes pasado cruza bien el cambio de año y los meses cortos", () => {
  assert.deepEqual(periodRange("mes-pasado", "2026-01-15"), {
    from: "2025-12-01",
    to: "2025-12-31",
  });
  assert.deepEqual(periodRange("mes-pasado", "2028-03-10"), {
    from: "2028-02-01",
    to: "2028-02-29",
  });
});

it("un lunes la semana empieza ese mismo día", () => {
  assert.deepEqual(periodRange("semana", "2026-11-02"), {
    from: "2026-11-02",
    to: "2026-11-02",
  });
});

it("el mes incluye los días que faltan, no se corta en hoy", () => {
  const range = resolvePeriod({ periodo: "mes" }, HOY);
  assert.equal(range.label, "este mes");
  assert.equal(range.csvQuery, "from=2026-11-01&to=2026-11-30");
});

it("los límites son medianoche en Costa Rica, no en la zona del servidor", () => {
  const range = resolvePeriod({ periodo: "mes" }, HOY);
  // UTC−6: el mes arranca a las 06:00 UTC del día 1 y termina a las
  // 05:59:59.999 UTC del día siguiente al último.
  assert.equal(range.fromISO, "2026-11-01T06:00:00.000Z");
  assert.equal(range.toISO, "2026-12-01T05:59:59.999Z");

  const hoy = resolvePeriod({ periodo: "hoy" }, HOY);
  assert.equal(hoy.fromISO, "2026-11-04T06:00:00.000Z");
  assert.equal(hoy.toISO, "2026-11-05T05:59:59.999Z");
});

it("un rango escrito a mano manda sobre el período", () => {
  const range = resolvePeriod({ periodo: "mes", from: "2026-01-01", to: "2026-01-31" }, HOY);
  assert.equal(range.id, "personalizado");
  assert.ok(range.fromISO?.startsWith("2026-01-01"));
  assert.match(range.label, /ene/);
});

it("un período inventado cae en 'todo' en vez de romper la consulta", () => {
  const range = resolvePeriod({ periodo: "trimestre" }, HOY);
  assert.equal(range.id, "todo");
  assert.equal(range.fromISO, null);
});

it("con un solo extremo no inventa el otro ni se cree un rango", () => {
  const range = resolvePeriod({ from: "2026-10-01" }, HOY);
  assert.equal(range.id, "todo");
  assert.equal(range.fromISO, null);
});
