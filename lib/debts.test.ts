import { it } from "node:test";
import assert from "node:assert/strict";
import { debtRows, debtTotals, debtUrgency, settlementType } from "./debts";
import type { Debt } from "./types";

function debt(partial: Partial<Debt> & { id: string }): Debt {
  return {
    user_id: "u1",
    type: "me_deben",
    person_name: "Alguien",
    amount: 10000,
    currency: "CRC",
    due_date: null,
    status: "pendiente",
    notes: null,
    settled_transaction_id: null,
    settled_at: null,
    created_at: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

const TODAY = "2026-11-10";

it("marca vencida la pendiente con fecha pasada y pronto la de menos de 5 días", () => {
  assert.equal(debtUrgency(debt({ id: "a", due_date: "2026-11-08" }), TODAY), "vencida");
  assert.equal(debtUrgency(debt({ id: "b", due_date: "2026-11-10" }), TODAY), "pronto");
  assert.equal(debtUrgency(debt({ id: "c", due_date: "2026-11-14" }), TODAY), "pronto");
  assert.equal(
    debtUrgency(debt({ id: "d", due_date: "2026-11-15" }), TODAY),
    "ninguna",
    "a 5 días todavía no urge"
  );
  assert.equal(debtUrgency(debt({ id: "e", due_date: null }), TODAY), "ninguna");
});

it("una deuda saldada nunca urge, aunque su fecha ya pasó", () => {
  const saldada = debt({
    id: "a",
    due_date: "2026-01-01",
    status: "pagado",
    settled_at: "2026-02-01T00:00:00.000Z",
  });
  assert.equal(debtUrgency(saldada, TODAY), "ninguna");
});

it("ordena pendientes primero, lo más urgente arriba y las sin fecha al final", () => {
  const rows = debtRows(
    [
      debt({ id: "sin-fecha", person_name: "Sin fecha" }),
      debt({ id: "lejana", person_name: "Lejana", due_date: "2026-12-20" }),
      debt({
        id: "saldada",
        person_name: "Saldada",
        status: "pagado",
        settled_at: "2026-11-09T00:00:00.000Z",
      }),
      debt({ id: "vencida", person_name: "Vencida", due_date: "2026-11-01" }),
    ],
    TODAY
  );

  assert.deepEqual(
    rows.map((row) => row.id),
    ["vencida", "lejana", "sin-fecha", "saldada"]
  );
  assert.equal(rows[0].dueInDays, -9);
  assert.equal(rows[2].dueInDays, null, "sin fecha no se le inventa un plazo");
});

it("suma solo lo pendiente y da el neto a favor", () => {
  const totals = debtTotals(
    [
      debt({ id: "a", type: "me_deben", amount: 30000, due_date: "2026-11-01" }),
      debt({ id: "b", type: "me_deben", amount: 20000 }),
      debt({ id: "c", type: "debo", amount: 12000 }),
      debt({ id: "d", type: "me_deben", amount: 500000, status: "pagado" }),
    ],
    TODAY
  );

  assert.equal(totals.owedToMe, 50000);
  assert.equal(totals.owedByMe, 12000);
  assert.equal(totals.net, 38000);
  assert.equal(totals.pendingCount, 3, "la saldada no cuenta como pendiente");
  assert.equal(totals.overdueCount, 1);
});

it("el neto queda en contra cuando se debe más de lo que te deben", () => {
  const totals = debtTotals(
    [
      debt({ id: "a", type: "me_deben", amount: 5000 }),
      debt({ id: "b", type: "debo", amount: 25000 }),
    ],
    TODAY
  );
  assert.equal(totals.net, -20000);
});

it("saldar lo que te deben entra como ingreso y lo que debés sale como gasto", () => {
  assert.equal(settlementType("me_deben"), "INCOME");
  assert.equal(settlementType("debo"), "EXPENSE");
});
