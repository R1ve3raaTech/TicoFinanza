import { strict as assert } from "node:assert";
import test from "node:test";
import { dueToday, fallsOn, frequencyLabel, weekdayOf, type RecurringMovement } from "./recurring";

// 2026-11-19 es jueves; 2026-11-21, sábado; 2026-11-23, lunes.
const JUEVES = "2026-11-19";
const SABADO = "2026-11-21";

function rec(over: Partial<RecurringMovement> = {}): RecurringMovement {
  return {
    id: "r1",
    user_id: "u1",
    description: "Almuerzo",
    amount: 3500,
    category: "Alimentación",
    account_id: "a1",
    type: "EXPENSE",
    frequency: "habiles",
    weekday: null,
    last_confirmed_date: null,
    active: true,
    created_at: "2026-01-01",
    ...over,
  };
}

test("el día de la semana se lee a mediodía, no a medianoche", () => {
  // A medianoche UTC, un huso al oeste corre la fecha al día anterior y el
  // jueves se vuelve miércoles.
  assert.equal(weekdayOf(JUEVES), 4);
  assert.equal(weekdayOf(SABADO), 6);
});

test("días hábiles no cae el fin de semana", () => {
  assert.equal(fallsOn(rec(), JUEVES), true);
  assert.equal(fallsOn(rec(), SABADO), false);
});

test("todos los días cae siempre", () => {
  assert.equal(fallsOn(rec({ frequency: "diario" }), SABADO), true);
});

test("la semanal solo cae en su día", () => {
  assert.equal(fallsOn(rec({ frequency: "semanal", weekday: 4 }), JUEVES), true);
  assert.equal(fallsOn(rec({ frequency: "semanal", weekday: 1 }), JUEVES), false);
});

test("se propone lo de hoy", () => {
  assert.equal(dueToday([rec()], JUEVES).length, 1);
});

test("una pausada no se propone", () => {
  assert.equal(dueToday([rec({ active: false })], JUEVES).length, 0);
});

test("confirmada hoy no se vuelve a proponer hoy", () => {
  assert.equal(dueToday([rec({ last_confirmed_date: JUEVES })], JUEVES).length, 0);
});

test("confirmada ayer sí se propone hoy", () => {
  assert.equal(dueToday([rec({ last_confirmed_date: "2026-11-18" })], JUEVES).length, 1);
});

test("una fecha guardada en el futuro no la hace proponerse en bucle", () => {
  // Reloj desajustado: se trata como ya confirmada. Fallar hacia "no
  // molestar" es mejor que proponer todos los días para siempre.
  assert.equal(dueToday([rec({ last_confirmed_date: "2026-12-01" })], JUEVES).length, 0);
});

test("nunca propone días pasados, solo el de hoy", () => {
  // Confirmada hace una semana: igual se propone UNA vez, la de hoy.
  const r = dueToday([rec({ last_confirmed_date: "2026-11-12" })], JUEVES);
  assert.equal(r.length, 1);
});

test("la frecuencia se lee en palabras", () => {
  assert.equal(frequencyLabel(rec()), "Días hábiles");
  assert.equal(frequencyLabel(rec({ frequency: "diario" })), "Todos los días");
  assert.equal(frequencyLabel(rec({ frequency: "semanal", weekday: 1 })), "Cada lunes");
});
