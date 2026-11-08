import { it } from "node:test";
import assert from "node:assert/strict";
import { frequentEntries, type RecentMovement } from "./quickEntry";

function mov(
  description: string | null,
  amount: number,
  date: string,
  extra: Partial<RecentMovement> = {}
): RecentMovement {
  return {
    description,
    amount,
    category: "Alimentación",
    account_id: "a1",
    type: "EXPENSE",
    transaction_date: `${date}T12:00:00.000Z`,
    ...extra,
  };
}

it("ofrece lo que se repite, del más repetido al menos", () => {
  const entries = frequentEntries(
    [
      mov("Almuerzo", 3_500, "2026-11-07"),
      mov("Almuerzo", 3_500, "2026-11-06"),
      mov("Almuerzo", 3_500, "2026-11-05"),
      mov("Bus", 700, "2026-11-07"),
      mov("Bus", 700, "2026-11-06"),
    ],
    "EXPENSE"
  );
  assert.deepEqual(
    entries.map((e) => [e.description, e.times]),
    [
      ["Almuerzo", 3],
      ["Bus", 2],
    ]
  );
});

it("una sola vez no es un hábito: no se ofrece", () => {
  const entries = frequentEntries([mov("Regalo de cumpleaños", 25_000, "2026-11-07")], "EXPENSE");
  assert.equal(entries.length, 0);
});

it("manda el monto más reciente, no el más repetido", () => {
  // El almuerzo subió: lo que vale es lo que cuesta hoy.
  const entries = frequentEntries(
    [
      mov("Almuerzo", 3_000, "2026-10-01"),
      mov("Almuerzo", 3_000, "2026-10-02"),
      mov("Almuerzo", 3_500, "2026-11-07"),
    ],
    "EXPENSE"
  );
  assert.equal(entries[0].amount, 3_500);
});

it("no depende del orden en que venga la lista", () => {
  const desordenado = frequentEntries(
    [
      mov("Almuerzo", 3_500, "2026-11-07"),
      mov("Almuerzo", 3_000, "2026-10-01"),
    ],
    "EXPENSE"
  );
  const alReves = frequentEntries(
    [
      mov("Almuerzo", 3_000, "2026-10-01"),
      mov("Almuerzo", 3_500, "2026-11-07"),
    ],
    "EXPENSE"
  );
  assert.equal(desordenado[0].amount, 3_500);
  assert.equal(alReves[0].amount, 3_500);
});

it("junta la misma descripción escrita distinto", () => {
  const entries = frequentEntries(
    [mov("Almuerzo", 3_500, "2026-11-07"), mov("  almuerzo ", 3_500, "2026-11-06")],
    "EXPENSE"
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].times, 2);
});

it("no mezcla gastos con ingresos", () => {
  const recent = [
    mov("Almuerzo", 3_500, "2026-11-07"),
    mov("Almuerzo", 3_500, "2026-11-06"),
    mov("Freelance", 180_000, "2026-11-05", { type: "INCOME" }),
    mov("Freelance", 180_000, "2026-11-04", { type: "INCOME" }),
  ];
  assert.deepEqual(
    frequentEntries(recent, "EXPENSE").map((e) => e.description),
    ["Almuerzo"]
  );
  assert.deepEqual(
    frequentEntries(recent, "INCOME").map((e) => e.description),
    ["Freelance"]
  );
});

it("sin descripción no hay botón que se entienda", () => {
  const entries = frequentEntries(
    [mov(null, 2_500, "2026-11-07"), mov("   ", 2_500, "2026-11-06")],
    "EXPENSE"
  );
  assert.equal(entries.length, 0);
});

it("se queda con la categoría y la cuenta de la última vez", () => {
  const entries = frequentEntries(
    [
      mov("Súper", 40_000, "2026-10-01", { category: "Otro", account_id: "a2" }),
      mov("Súper", 38_000, "2026-11-07", { category: "Alimentación", account_id: "a1" }),
    ],
    "EXPENSE"
  );
  assert.equal(entries[0].category, "Alimentación");
  assert.equal(entries[0].accountId, "a1");
});

it("respeta el tope que se le pide", () => {
  const recent = ["Uno", "Dos", "Tres", "Cuatro"].flatMap((d) => [
    mov(d, 1_000, "2026-11-07"),
    mov(d, 1_000, "2026-11-06"),
  ]);
  assert.equal(frequentEntries(recent, "EXPENSE").length, 3);
  assert.equal(frequentEntries(recent, "EXPENSE", 2).length, 2);
});
