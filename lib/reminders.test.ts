import { it } from "node:test";
import assert from "node:assert/strict";
import { dueReminders } from "./reminders";
import {
  isAllowedReceiptType,
  ownsReceiptPath,
  receiptPath,
  validateReceiptFile,
} from "./receipts";
import type { FixedExpense } from "./types";

function expense(partial: Partial<FixedExpense> & { id: string }): FixedExpense {
  return {
    user_id: "u1",
    name: "Gasto",
    amount: 10000,
    currency: "CRC",
    category: "Servicios",
    charge_day: 15,
    status: "PENDING",
    status_month: null,
    account_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

it("avisa el cobro de mañana y el de pasado mañana, y nada más", () => {
  const reminders = dueReminders(
    [
      expense({ id: "hoy", name: "Hoy", charge_day: 10 }),
      expense({ id: "manana", name: "Mañana", charge_day: 11 }),
      expense({ id: "pasado", name: "Pasado", charge_day: 12 }),
      expense({ id: "lejano", name: "Lejano", charge_day: 20 }),
    ],
    "2026-11-10"
  );

  assert.deepEqual(
    reminders.map((r) => r.fixedExpenseId),
    ["manana", "pasado"]
  );
  assert.equal(reminders[0].title, "Mañana se cobra");
  assert.equal(reminders[1].title, "Pasado mañana se cobra");
  assert.match(reminders[0].body, /^Mañana · ₡10\.000$/);
});

it("no avisa un gasto ya marcado como pagado este mes", () => {
  const reminders = dueReminders(
    [expense({ id: "a", charge_day: 11, status: "PAID", status_month: "2026-11" })],
    "2026-11-10"
  );
  assert.deepEqual(reminders, []);
});

it("vuelve a avisar si el pagado es de un mes anterior", () => {
  const reminders = dueReminders(
    [expense({ id: "a", charge_day: 11, status: "PAID", status_month: "2026-10" })],
    "2026-11-10"
  );
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].dueKey, "2026-11-11");
});

it("la clave del aviso es el día del cobro, recortado al último del mes", () => {
  // Cobro el 31 en un noviembre de 30 días: vence el 30, no el 1 de
  // diciembre, así que el aviso de mañana sale el 29.
  const reminders = dueReminders([expense({ id: "a", charge_day: 31 })], "2026-11-29");
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].dueKey, "2026-11-30");
  assert.equal(reminders[0].dueInDays, 1);
});

it("la ruta del comprobante arranca con el id del usuario", () => {
  const path = receiptPath("user-1", "image/jpeg", "abc");
  assert.equal(path, "user-1/abc.jpg");
  assert.ok(ownsReceiptPath(path, "user-1"));
  assert.equal(ownsReceiptPath(path, "user-2"), false);
  assert.equal(ownsReceiptPath("../user-1/abc.jpg", "user-1"), false);
  assert.equal(ownsReceiptPath("", "user-1"), false);
});

it("solo acepta imágenes y PDF, y hasta 5 MB", () => {
  assert.ok(isAllowedReceiptType("image/png"));
  assert.equal(isAllowedReceiptType("video/mp4"), false);
  assert.equal(validateReceiptFile({ type: "image/png", size: 1000 }), null);
  assert.match(validateReceiptFile({ type: "video/mp4", size: 10 }) ?? "", /imagen/);
  assert.match(
    validateReceiptFile({ type: "image/png", size: 6 * 1024 * 1024 }) ?? "",
    /5 MB/
  );
});
