import { strict as assert } from "node:assert";
import test from "node:test";
import { accountShare, totalBalance } from "./accounts";
import type { Account } from "./types";

function cuenta(name: string, balance: number): Account {
  return {
    id: name,
    user_id: "u1",
    name,
    type: "debito",
    initial_balance: 0,
    current_balance: balance,
    currency: "CRC",
    created_at: "2026-01-01",
  };
}

test("el reparto de cada cuenta suma 1 cuando todas están en positivo", () => {
  const cuentas = [cuenta("a", 300), cuenta("b", 100)];
  assert.equal(accountShare(cuentas[0], cuentas), 0.75);
  assert.equal(accountShare(cuentas[1], cuentas), 0.25);
});

test("una tarjeta en rojo no dibuja barra", () => {
  const cuentas = [cuenta("banco", 500), cuenta("tarjeta", -200)];
  assert.equal(accountShare(cuentas[1], cuentas), 0);
});

test("la deuda no infla a las demás por encima del 100 %", () => {
  // Contra el patrimonio neto (500 − 400 = 100), el banco daría 5 veces el
  // total. El reparto se mide contra lo que HAY, no contra el neto.
  const cuentas = [cuenta("banco", 500), cuenta("tarjeta", -400)];
  assert.equal(accountShare(cuentas[0], cuentas), 1);
  assert.equal(totalBalance(cuentas), 100);
});

test("sin plata en ninguna, nadie tiene barra", () => {
  const cuentas = [cuenta("a", 0), cuenta("b", 0)];
  assert.equal(accountShare(cuentas[0], cuentas), 0);
});
