import { it } from "node:test";
import assert from "node:assert/strict";
import { breakdown, coverage, incomeByCategory, monthLabel, monthRangeISO, shiftMonth } from "./report";

it("el mes va completo, del primero al último día, en hora de Costa Rica", () => {
  const { fromISO, toISO } = monthRangeISO("2026-02");
  // 1.º de febrero a medianoche en CR son las 6 a.m. UTC.
  assert.equal(fromISO, "2026-02-01T06:00:00.000Z");
  // Febrero de 2026 tiene 28 días; el último instante son las 5:59:59.999
  // del 1.º de marzo en UTC.
  assert.equal(toISO, "2026-03-01T05:59:59.999Z");
});

it("el último día se calcula por mes: febrero bisiesto no se recorta a 28", () => {
  assert.equal(monthRangeISO("2028-02").toISO, "2028-03-01T05:59:59.999Z");
  assert.equal(monthRangeISO("2026-04").toISO, "2026-05-01T05:59:59.999Z");
});

it("navegar de mes cruza el año", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

it("la etiqueta del mes no se corre por el huso", () => {
  assert.equal(monthLabel("2026-11"), "noviembre de 2026");
  assert.equal(monthLabel("2026-01"), "enero de 2026");
});

it("el desglose ordena de mayor a menor y reparte el peso", () => {
  const rows = breakdown(
    new Map([
      ["Ocio", 25_000],
      ["Alimentación", 50_000],
      ["Transporte", 25_000],
    ])
  );
  assert.deepEqual(
    rows.map((r) => r.label),
    ["Alimentación", "Ocio", "Transporte"]
  );
  assert.deepEqual(
    rows.map((r) => r.share),
    [50, 25, 25]
  );
});

it("una categoría en cero no ocupa una línea del papel", () => {
  const rows = breakdown(new Map([["Ocio", 0], ["Salud", 10_000]]));
  assert.deepEqual(rows.map((r) => r.label), ["Salud"]);
  assert.equal(rows[0].share, 100);
});

it("sin nada gastado el desglose queda vacío y no divide entre cero", () => {
  assert.deepEqual(breakdown(new Map()), []);
  assert.deepEqual(breakdown(new Map([["Ocio", 0]])), []);
});

it("los ingresos se agrupan por categoría y los gastos no se cuelan", () => {
  const totals = incomeByCategory([
    { category: "Salario", amount: 600_000, type: "INCOME" },
    { category: "Salario", amount: 600_000, type: "INCOME" },
    { category: "Freelance", amount: 80_000, type: "INCOME" },
    { category: "Salario", amount: 999_999, type: "EXPENSE" },
    { category: null, amount: 5_000, type: "INCOME" },
  ]);
  assert.equal(totals.get("Salario"), 1_200_000);
  assert.equal(totals.get("Freelance"), 80_000);
  assert.equal(totals.get("Sin categoría"), 5_000);
  assert.equal(totals.size, 3);
});

it("un mes pasado está cerrado y llega hasta su último día", () => {
  assert.deepEqual(coverage("2026-10", "2026-11-03"), {
    closed: true,
    throughKey: "2026-10-31",
  });
});

it("el mes que corre llega hasta hoy, y el reporte tiene que decirlo", () => {
  assert.deepEqual(coverage("2026-11", "2026-11-03"), {
    closed: false,
    throughKey: "2026-11-03",
  });
});
