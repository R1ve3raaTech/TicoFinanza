import { it } from "node:test";
import assert from "node:assert/strict";
import { normalize, suggestFor } from "./smartMatch";
import type { Transaction } from "./types";

const CATEGORIES = [
  "Vivienda",
  "Servicios",
  "Salud",
  "Transporte",
  "Educación",
  "Ocio",
  "Trabajo",
  "Alimentación",
  "Otro",
];

function past(
  description: string,
  category: string,
  accountId: string,
  date: string
): Pick<Transaction, "description" | "category" | "account_id" | "transaction_date"> {
  return { description, category, account_id: accountId, transaction_date: date };
}

it("normaliza tildes y mayúsculas", () => {
  assert.equal(normalize("Palí  ESCAZÚ"), "pali escazu");
});

it("reconoce comercios ticos sin historial", () => {
  assert.equal(suggestFor("Uber al trabajo", CATEGORIES).category, "Transporte");
  assert.equal(suggestFor("Maxi Palí", CATEGORIES).category, "Alimentación");
  assert.equal(suggestFor("Recibo del ICE", CATEGORIES).category, "Servicios");
  assert.equal(suggestFor("Farmacia Fischel", CATEGORIES).category, "Salud");
  assert.equal(suggestFor("Claude", CATEGORIES).category, "Trabajo");
  assert.equal(suggestFor("Netflix", CATEGORIES).source, "comercio");
});

it("tu historial manda sobre la lista de comercios", () => {
  // "Uber" saldría Transporte por la lista, pero si vos lo registrás como
  // Trabajo es porque lo usás para ir a reuniones.
  const history = [past("Uber", "Trabajo", "a1", "2026-10-20T10:00:00.000Z")];
  const suggestion = suggestFor("Uber", CATEGORIES, history);

  assert.equal(suggestion.category, "Trabajo");
  assert.equal(suggestion.accountId, "a1", "también recuerda con qué cuenta pagaste");
  assert.equal(suggestion.source, "historial");
});

it("del historial toma el más reciente", () => {
  const history = [
    past("Auto Mercado", "Vivienda", "a1", "2026-09-01T10:00:00.000Z"),
    past("Auto Mercado", "Alimentación", "a2", "2026-10-28T10:00:00.000Z"),
  ];
  const suggestion = suggestFor("Auto Mercado Escazú", CATEGORIES, history);
  assert.equal(suggestion.category, "Alimentación");
  assert.equal(suggestion.accountId, "a2");
});

it("ignora una categoría del historial que ya no existe", () => {
  const history = [past("Gimnasio", "Deporte", "a1", "2026-10-20T10:00:00.000Z")];
  assert.equal(suggestFor("Gimnasio", CATEGORIES, history).category, null);
});

it("no adivina con dos o tres letras sueltas", () => {
  assert.equal(suggestFor("a", CATEGORIES).category, null);
  assert.equal(suggestFor("", CATEGORIES).category, null);
  assert.equal(suggestFor("   ", CATEGORIES).source, null);
});

it("no sugiere una categoría que el usuario no tiene disponible", () => {
  const sinAlimentacion = CATEGORIES.filter((c) => c !== "Alimentación");
  assert.equal(suggestFor("Palí", sinAlimentacion).category, null);
});
