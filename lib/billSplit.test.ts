import { it } from "node:test";
import assert from "node:assert/strict";
import { splitBill, splitMessage } from "./billSplit";
import { conversionLabel, isValidRate, usdToCrc } from "./usd";

it("el IVA se calcula sobre el consumo MÁS el servicio, no solo sobre el consumo", () => {
  // 10.000 + 10 % servicio = 11.000; 13 % de 11.000 = 1.430 → 12.430.
  // Calculando el IVA solo sobre los 10.000 darían 12.300: 130 de menos.
  const r = splitBill({ base: 10_000, service: true, tax: true, people: 1 });
  assert.equal(r.service, 1_000);
  assert.equal(r.tax, 1_430);
  assert.equal(r.total, 12_430);
});

it("cada recargo se puede apagar por separado", () => {
  assert.equal(splitBill({ base: 10_000, service: false, tax: true, people: 1 }).total, 11_300);
  assert.equal(splitBill({ base: 10_000, service: true, tax: false, people: 1 }).total, 11_000);
  assert.equal(splitBill({ base: 10_000, service: false, tax: false, people: 1 }).total, 10_000);
});

it("divide entre varios y la suma cierra exacta", () => {
  const r = splitBill({ base: 10_000, service: true, tax: true, people: 3 });
  assert.equal(r.total, 12_430);
  assert.equal(r.perPerson, 4_143, "12.430 / 3 = 4.143,33 → 4.143");
  // Los colones del redondeo quedan de tu lado, no se pierden.
  assert.equal(r.yours + r.perPerson * 2, r.total);
  assert.equal(r.yours, 4_144);
});

it("sin dividir, todo es tuyo", () => {
  const r = splitBill({ base: 8_000, service: false, tax: false, people: 1 });
  assert.equal(r.yours, 8_000);
  assert.equal(r.perPerson, 8_000);
});

it("una cantidad de personas inválida se trata como uno solo", () => {
  assert.equal(splitBill({ base: 5_000, service: false, tax: false, people: 0 }).people, 1);
  assert.equal(splitBill({ base: 5_000, service: false, tax: false, people: -3 }).people, 1);
});

it("el mensaje de cobro trae el monto y el contexto", () => {
  const r = splitBill({ base: 10_000, service: true, tax: true, people: 3 });
  const msg = splitMessage(r, "la cena");
  assert.match(msg, /4\.143/);
  assert.match(msg, /la cena/);
  assert.match(msg, /entre 3/);
});

it("convierte dólares a colones enteros", () => {
  assert.equal(usdToCrc(12.9, 510), 6_579);
  assert.equal(usdToCrc(0, 510), 0);
});

it("rechaza tipos de cambio que son errores de tecleo", () => {
  assert.equal(isValidRate(510), true);
  assert.equal(isValidRate(5), false, "nadie cambia a 5 colones por dólar");
  assert.equal(isValidRate(51_000), false, "se le fue un cero");
  assert.equal(usdToCrc(10, 5), 0, "con una tasa inválida no inventa un monto");
});

it("muestra de dónde salió el monto convertido", () => {
  assert.match(conversionLabel(12.9, 510), /USD 12,90/);
  assert.match(conversionLabel(12.9, 510), /510/);
});
