import { it } from "node:test";
import assert from "node:assert/strict";
import { expectedIncomes, incomeStatus, incomeTotals } from "./fixedIncomes";
import type { FixedIncome } from "./types";

function income(partial: Partial<FixedIncome> & { id: string }): FixedIncome {
  return {
    user_id: "u1",
    name: "Salario",
    amount: 500_000,
    currency: "CRC",
    category: "Salario",
    pay_day: 15,
    second_pay_day: null,
    account_id: "a1",
    status: "PENDING",
    status_month: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

it("confirmado vale solo para su mes: al cambiar de mes vuelve a pendiente", () => {
  const confirmado = income({ id: "a", status: "CONFIRMED", status_month: "2026-11" });
  assert.equal(incomeStatus(confirmado, "2026-11"), "CONFIRMED");
  assert.equal(incomeStatus(confirmado, "2026-12"), "PENDING");
});

it("una quincena produce dos depósitos esperados en el mes", () => {
  const rows = expectedIncomes([income({ id: "a", pay_day: 15, second_pay_day: 30 })], "2026-11-10");
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.dueKey),
    ["2026-11-15", "2026-11-30"]
  );
});

it("el día 31 se recorta al último día del mes", () => {
  const rows = expectedIncomes([income({ id: "a", pay_day: 31 })], "2026-11-10");
  assert.equal(rows[0].dueKey, "2026-11-30", "noviembre no tiene 31");
});

it("solo se puede confirmar cuando la fecha ya llegó", () => {
  const futuro = expectedIncomes([income({ id: "a", pay_day: 25 })], "2026-11-10")[0];
  assert.equal(futuro.confirmable, false, "todavía no entró");
  assert.equal(futuro.late, false);

  const hoy = expectedIncomes([income({ id: "a", pay_day: 10 })], "2026-11-10")[0];
  assert.equal(hoy.confirmable, true);
  assert.equal(hoy.late, false, "hoy no es tarde");

  const pasado = expectedIncomes([income({ id: "a", pay_day: 5 })], "2026-11-10")[0];
  assert.equal(pasado.confirmable, true);
  assert.equal(pasado.late, true, "pasó la fecha y no se confirmó");
});

it("un ingreso ya confirmado no se puede volver a confirmar", () => {
  const rows = expectedIncomes(
    [income({ id: "a", pay_day: 5, status: "CONFIRMED", status_month: "2026-11" })],
    "2026-11-10"
  );
  assert.equal(rows[0].confirmable, false);
  assert.equal(rows[0].late, false);
});

it("ordena por cercanía al depósito", () => {
  const rows = expectedIncomes(
    [
      income({ id: "b", name: "Renta", pay_day: 28 }),
      income({ id: "a", name: "Salario", pay_day: 15 }),
    ],
    "2026-11-10"
  );
  assert.deepEqual(
    rows.map((r) => r.name),
    ["Salario", "Renta"]
  );
});

it("los totales cuentan la quincena dos veces", () => {
  const totals = incomeTotals(
    [
      income({ id: "a", amount: 300_000, pay_day: 15, second_pay_day: 30 }),
      income({ id: "b", amount: 50_000, status: "CONFIRMED", status_month: "2026-11" }),
    ],
    "2026-11"
  );

  assert.equal(totals.pending, 600_000, "dos quincenas de 300.000");
  assert.equal(totals.confirmed, 50_000);
  assert.equal(totals.expected, 650_000);
});
