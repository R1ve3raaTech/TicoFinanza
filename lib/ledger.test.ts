import { it } from "node:test";
import assert from "node:assert/strict";
import { totalBalance } from "./accounts";
import { goalProgress, goalsTotal } from "./goals";
import { buildLedger, ledgerNet } from "./ledger";
import type { Account, SavingsGoal, Transaction, Transfer } from "./types";

function transaction(
  id: string,
  amount: number,
  type: Transaction["type"],
  date: string
): Transaction {
  return {
    id,
    user_id: "u1",
    amount,
    currency: "CRC",
    description: null,
    category: null,
    type,
    account_id: "a1",
    receipt_url: null,
    fixed_expense_id: null,
    fixed_income_id: null,
    transaction_date: date,
    created_at: date,
  };
}

function transfer(id: string, amount: number, date: string): Transfer {
  return {
    id,
    user_id: "u1",
    from_account_id: "a1",
    to_account_id: "a2",
    amount,
    description: null,
    transfer_date: date,
    created_at: date,
  };
}

function account(id: string, balance: number): Account {
  return {
    id,
    user_id: "u1",
    name: id,
    type: "efectivo",
    initial_balance: 0,
    current_balance: balance,
    currency: "CRC",
    created_at: "2026-10-01T00:00:00.000Z",
  };
}

it("mezcla movimientos y transferencias en una sola lista, de nueva a vieja", () => {
  const entries = buildLedger(
    [
      transaction("t1", 1000, "EXPENSE", "2026-10-05T10:00:00.000Z"),
      transaction("t2", 2000, "INCOME", "2026-10-01T10:00:00.000Z"),
    ],
    [transfer("tr1", 5000, "2026-10-03T10:00:00.000Z")]
  );

  assert.deepEqual(
    entries.map((e) => e.id),
    ["t1", "tr1", "t2"]
  );
  assert.equal(entries[1].kind, "transfer");
});

it("una transferencia no suma ni resta al neto", () => {
  const soloTransferencias = buildLedger([], [transfer("tr1", 50000, "2026-10-03T10:00:00.000Z")]);
  assert.equal(ledgerNet(soloTransferencias), 0);

  const mezcla = buildLedger(
    [
      transaction("t1", 1000, "EXPENSE", "2026-10-05T10:00:00.000Z"),
      transaction("t2", 2500, "INCOME", "2026-10-05T11:00:00.000Z"),
    ],
    [transfer("tr1", 90000, "2026-10-05T12:00:00.000Z")]
  );
  assert.equal(ledgerNet(mezcla), 1500);
});

it("el patrimonio suma las cuentas, y una tarjeta con deuda resta", () => {
  assert.equal(totalBalance([account("a1", 120000), account("a2", -45000)]), 75000);
  assert.equal(totalBalance([]), 0);
});

function goal(partial: Partial<SavingsGoal>): SavingsGoal {
  return {
    id: "g1",
    user_id: "u1",
    name: "Marchamo",
    target_amount: 120000,
    current_amount: 0,
    target_date: null,
    color: "celeste",
    recurrence: "una-vez",
    cycles_completed: 0,
    created_at: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

it("calcula el avance de una meta y cuánto apartar por mes", () => {
  const progress = goalProgress(
    goal({ current_amount: 30000, target_date: "2026-12-31" }),
    "2026-10-31"
  );

  assert.equal(progress.ratio, 0.25);
  assert.equal(progress.remaining, 90000);
  assert.equal(progress.complete, false);
  assert.equal(progress.daysLeft, 61);
  // 90.000 en 61 días (dos meses y poco): el ritmo redondea hacia arriba
  // para que alcance.
  assert.equal(progress.monthlyPace, 44853);
});

it("una meta completa no pide más ritmo ni pasa del 100 %", () => {
  const progress = goalProgress(
    goal({ current_amount: 150000, target_date: "2026-12-31" }),
    "2026-10-31"
  );
  assert.equal(progress.ratio, 1);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.complete, true);
  assert.equal(progress.monthlyPace, null);
});

it("sin fecha objetivo no hay ritmo ni días restantes", () => {
  const progress = goalProgress(goal({ current_amount: 10000 }), "2026-10-31");
  assert.equal(progress.daysLeft, null);
  assert.equal(progress.monthlyPace, null);
});

it("suma lo apartado y el objetivo de todas las metas", () => {
  assert.deepEqual(
    goalsTotal([
      goal({ id: "g1", current_amount: 30000, target_amount: 120000 }),
      goal({ id: "g2", current_amount: 5000, target_amount: 50000 }),
    ]),
    { saved: 35000, target: 170000 }
  );
});
