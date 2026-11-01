import { it } from "node:test";
import assert from "node:assert/strict";
import { greeting, greetingForHour, monthHeadline } from "./greeting";
import type { MonthSummary } from "./insights";

function summary(partial: Partial<MonthSummary>): MonthSummary {
  const base = { income: 0, fixedExpenses: 0, variableExpenses: 0, ...partial };
  // Los fijos de estas pruebas se toman como ya pagados: lo que se verifica
  // es la frase, no el reparto entre pagado y pendiente.
  return {
    ...base,
    fixedPaid: base.fixedExpenses,
    fixedPending: 0,
    net: base.income - base.fixedExpenses - base.variableExpenses,
    projectedNet: base.income - base.fixedExpenses - base.variableExpenses,
  };
}

it("saluda según la hora", () => {
  assert.equal(greetingForHour(0), "Buenos días");
  assert.equal(greetingForHour(11), "Buenos días");
  assert.equal(greetingForHour(12), "Buenas tardes");
  assert.equal(greetingForHour(18), "Buenas tardes");
  assert.equal(greetingForHour(19), "Buenas noches");
  assert.equal(greetingForHour(23), "Buenas noches");
});

it("usa el nombre si lo hay, y funciona sin él", () => {
  assert.equal(greeting(9, "Camil"), "Buenos días, Camil");
  assert.equal(greeting(9), "Buenos días");
});

it("no concluye nada cuando no hay nada anotado", () => {
  assert.equal(monthHeadline(summary({}), 0), null);
});

it("dice cuánto vas arriba o abajo", () => {
  const arriba = monthHeadline(summary({ income: 500000, variableExpenses: 120000 }), 0);
  assert.match(arriba?.text ?? "", /arriba/);
  assert.match(arriba?.text ?? "", /380\.000/);

  const abajo = monthHeadline(summary({ income: 100000, variableExpenses: 150000 }), 0);
  assert.match(abajo?.text ?? "", /abajo/);
  assert.match(abajo?.text ?? "", /50\.000/, "el monto va en positivo, el signo lo da la palabra");
});

it("avisa aparte lo que falta pagar de fijos", () => {
  const con = monthHeadline(summary({ income: 500000, fixedExpenses: 200000 }), 80000);
  assert.match(con?.pending ?? "", /80\.000/);

  const sin = monthHeadline(summary({ income: 500000, fixedExpenses: 200000 }), 0);
  assert.equal(sin?.pending, null);
});

it("un mes con gastos y sin ingresos no dice que vas abajo, dice qué pasó", () => {
  const headline = monthHeadline(summary({ variableExpenses: 40000 }), 0);
  assert.match(headline?.text ?? "", /ningún ingreso/);
  assert.doesNotMatch(headline?.text ?? "", /abajo/);
});

it("empatar no es ni arriba ni abajo", () => {
  const headline = monthHeadline(summary({ income: 100000, variableExpenses: 100000 }), 0);
  assert.match(headline?.text ?? "", /justo/);
});
