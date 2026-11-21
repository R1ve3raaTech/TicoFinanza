import { strict as assert } from "node:assert";
import test from "node:test";
import { matchFixedPayments } from "./autoPayments";
import type { FixedExpense, Transaction } from "./types";

const MES = "2026-11";
const HOY = "2026-11-19";

function fijo(over: Partial<FixedExpense> = {}): FixedExpense {
  return {
    id: "f1",
    user_id: "u1",
    name: "Internet",
    amount: 23500,
    currency: "CRC",
    category: "Servicios",
    charge_day: 15,
    status: "PENDING",
    status_month: null,
    account_id: "a1",
    created_at: "2026-01-01",
    ...over,
  };
}

function mov(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    user_id: "u1",
    amount: 23500,
    currency: "CRC",
    description: "Internet",
    category: "Servicios",
    type: "EXPENSE",
    account_id: "a1",
    fixed_income_id: null,
    client_id: null,
    fixed_expense_id: null,
    receipt_url: null,
    transaction_date: "2026-11-15T10:00:00Z",
    created_at: "2026-11-15T10:00:00Z",
    ...over,
  };
}

test("empareja el movimiento del mismo monto, cuenta y día", () => {
  const r = matchFixedPayments([fijo()], [mov()], MES, HOY);
  assert.equal(r.length, 1);
  assert.equal(r[0].expense.id, "f1");
  assert.equal(r[0].transaction.id, "t1");
});

test("un monto distinto no se propone, ni por poco", () => {
  // Sin tolerancia a propósito: un recibo que varía mes a mes emparejaría
  // con cualquier cosa.
  assert.equal(matchFixedPayments([fijo()], [mov({ amount: 23400 })], MES, HOY).length, 0);
});

test("otra cuenta no cuenta, si el fijo declara una", () => {
  assert.equal(matchFixedPayments([fijo()], [mov({ account_id: "a2" })], MES, HOY).length, 0);
});

test("pero si el fijo no tiene cuenta, cualquiera sirve", () => {
  const r = matchFixedPayments([fijo({ account_id: null })], [mov({ account_id: "a9" })], MES, HOY);
  assert.equal(r.length, 1);
});

test("un ingreso del mismo monto no es el pago de un gasto fijo", () => {
  assert.equal(matchFixedPayments([fijo()], [mov({ type: "INCOME" })], MES, HOY).length, 0);
});

test("un movimiento ya atado a otro fijo no se vuelve a ofrecer", () => {
  assert.equal(matchFixedPayments([fijo()], [mov({ fixed_expense_id: "f9" })], MES, HOY).length, 0);
});

test("un fijo ya pagado este mes no se propone", () => {
  const pagado = fijo({ status: "PAID", status_month: MES });
  assert.equal(matchFixedPayments([pagado], [mov()], MES, HOY).length, 0);
});

test("pagado el mes pasado sí se vuelve a proponer: el ciclo se reinicia", () => {
  const viejo = fijo({ status: "PAID", status_month: "2026-10" });
  assert.equal(matchFixedPayments([viejo], [mov()], MES, HOY).length, 1);
});

test("no se propone nada antes de que se acerque el cobro", () => {
  // Cobra el 28 y hoy es 19: faltan nueve días.
  const r = matchFixedPayments([fijo({ charge_day: 28 })], [mov({ transaction_date: "2026-11-28T10:00:00Z" })], MES, HOY);
  assert.equal(r.length, 0);
});

test("un movimiento muy lejos del día de cobro no es ese pago", () => {
  // Cobra el 15; el movimiento es del 2.
  const r = matchFixedPayments([fijo()], [mov({ transaction_date: "2026-11-02T10:00:00Z" })], MES, HOY);
  assert.equal(r.length, 0);
});

test("un cobro atrasado unos días sigue emparejando", () => {
  const r = matchFixedPayments([fijo()], [mov({ transaction_date: "2026-11-19T10:00:00Z" })], MES, HOY);
  assert.equal(r.length, 1);
});

test("un mismo movimiento no paga dos fijos", () => {
  // Dos fijos iguales y un solo movimiento: se queda con el más cercano.
  const a = fijo({ id: "fa", charge_day: 15 });
  const b = fijo({ id: "fb", charge_day: 18 });
  const r = matchFixedPayments([a, b], [mov({ transaction_date: "2026-11-18T10:00:00Z" })], MES, HOY);
  assert.equal(r.length, 1);
  assert.equal(r[0].expense.id, "fa", "el primero de la lista se lo lleva");
});

test("el 31 se recorta al último día del mes", () => {
  // Noviembre tiene 30. Un fijo del 31 cobra el 30, así que el 19 todavía
  // no se propone nada.
  const r = matchFixedPayments([fijo({ charge_day: 31 })], [mov()], MES, HOY);
  assert.equal(r.length, 0);
});

/**
 * **El día del movimiento se lee en hora de Costa Rica, no cortando la
 * cadena.**
 *
 * `transaction_date` es `timestamptz` y baja en UTC, así que un pago hecho
 * de noche llega como el día siguiente. Acá eso corre la distancia al día
 * de cobro, y con dos candidatos del mismo monto elige el equivocado: el
 * "más cercano" deja de serlo.
 */
test("con dos pagos iguales, elige el del día de cobro aunque se haya hecho de noche", () => {
  const cobro15 = fijo({ charge_day: 15 });
  // 15 de noviembre, 8 p.m. en Costa Rica = 16 de noviembre 02:00 UTC.
  const esaNoche = mov({ id: "t-noche", transaction_date: "2026-11-16T02:00:00Z" });
  // Dos días después, de día: más lejos del cobro.
  const dosDiasDespues = mov({ id: "t-lejos", transaction_date: "2026-11-17T16:00:00Z" });

  const r = matchFixedPayments([cobro15], [dosDiasDespues, esaNoche], MES, HOY);

  assert.equal(r.length, 1);
  assert.equal(r[0].transaction.id, "t-noche", "el del propio día de cobro");
});

/**
 * El borde de la ventana: seis días después del cobro todavía entra. Hecho
 * de noche, cortando la cadena contaba como el séptimo y se descartaba.
 */
test("un pago en el último día de la ventana, de noche, sigue emparejando", () => {
  const cobro1 = fijo({ charge_day: 1 });
  // 7 de noviembre, 9 p.m. en Costa Rica = 8 de noviembre 03:00 UTC.
  const r = matchFixedPayments(
    [cobro1],
    [mov({ transaction_date: "2026-11-08T03:00:00Z" })],
    MES,
    HOY
  );
  assert.equal(r.length, 1, "seis días después del cobro, todavía entra");
});

/**
 * **El día de cobro se arma con los números, no con una fecha UTC.**
 *
 * Había una copia local de `chargeDayKey` que hacía
 * `dayKey(new Date(Date.UTC(año, mes, día)))`: medianoche UTC leída en
 * hora de Costa Rica son las 6 de la tarde del día ANTERIOR, así que todos
 * los días de cobro salían corridos un día hacia atrás. Con un cobro el
 * 1.º eso cruzaba al mes anterior.
 */
test("el día de cobro es el del gasto fijo, sin correrse un día", () => {
  // Cobro el 1.º; un pago el mismo día tiene que emparejar.
  const r = matchFixedPayments(
    [fijo({ charge_day: 1 })],
    [mov({ transaction_date: "2026-11-01T16:00:00Z" })],
    MES,
    HOY
  );
  assert.equal(r.length, 1, "el pago del propio día de cobro empareja");
});

test("un cobro del 31 en un mes de 30 se recorta, y sigue siendo de ese mes", () => {
  const r = matchFixedPayments(
    [fijo({ charge_day: 31 })],
    // Noviembre tiene 30: el cobro cae el 30 y el pago es ese mismo día.
    [mov({ transaction_date: "2026-11-30T16:00:00Z" })],
    MES,
    "2026-11-30"
  );
  assert.equal(r.length, 1);
});
