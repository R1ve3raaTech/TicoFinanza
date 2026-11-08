import { it } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_TONES,
  categoryTone,
  choiceIndex,
  isCategoryTone,
  normalizeCategory,
  resolvedIcon,
  resolvedTone,
} from "./categoryStyle";

it("cada categoría de la app tiene su tono", () => {
  assert.equal(categoryTone("Alimentación"), "naranja");
  assert.equal(categoryTone("Vivienda"), "indigo");
  assert.equal(categoryTone("Transporte"), "azul");
});

it("no se cuelga de las tildes ni de las mayúsculas", () => {
  assert.equal(categoryTone("alimentacion"), "naranja");
  assert.equal(categoryTone("ALIMENTACIÓN"), "naranja");
  assert.equal(categoryTone("  Alimentación "), "naranja");
  assert.equal(normalizeCategory("Educación"), "educacion");
});

it("el verde es solo de las categorías de ingreso", () => {
  assert.equal(categoryTone("Salario"), "verde");
  const gastos = ["Alimentación", "Vivienda", "Servicios", "Salud", "Transporte", "Educación", "Ocio", "Trabajo", "Otro"];
  for (const c of gastos) {
    assert.notEqual(categoryTone(c), "verde", `${c} no puede ir en verde`);
  }
});

it("una categoría propia recibe un tono estable, nunca el verde", () => {
  const first = categoryTone("Mascotas");
  assert.equal(categoryTone("Mascotas"), first);
  assert.equal(categoryTone("mascotas"), first);
  assert.notEqual(first, "verde");
});

it("sin categoría queda neutra", () => {
  assert.equal(categoryTone(null), "piedra");
  assert.equal(categoryTone(""), "piedra");
  assert.equal(categoryTone("   "), "piedra");
});

it("categorías propias distintas no caen todas en el mismo tono", () => {
  const tones = new Set(
    ["Mascotas", "Regalos", "Gimnasio", "Viajes", "Impuestos", "Ahorro"].map((c) => categoryTone(c))
  );
  assert.ok(tones.size >= 3, `solo ${tones.size} tonos distintos`);
});

it("lo elegido por el usuario manda sobre lo automático", () => {
  const choices = choiceIndex([{ name: "Ferretería", icon: "handyman", color: "verde" }]);
  assert.equal(resolvedTone("Ferretería", choices), "verde");
  assert.equal(resolvedIcon("Ferretería", choices), "handyman");
});

it("sin elección, sigue decidiendo la app", () => {
  const choices = choiceIndex([{ name: "Ferretería", icon: null, color: null }]);
  assert.equal(resolvedTone("Ferretería", choices), categoryTone("Ferretería"));
  assert.equal(resolvedIcon("Ferretería", choices), null);
  assert.equal(resolvedTone("Alimentación", {}), "naranja");
});

it("un color guardado que ya no existe no deja la marca sin color", () => {
  const choices = choiceIndex([{ name: "Ferretería", icon: null, color: "turquesa" }]);
  assert.equal(resolvedTone("Ferretería", choices), categoryTone("Ferretería"));
});

it("la elección se encuentra aunque se escriba con otra grafía", () => {
  const choices = choiceIndex([{ name: "Ferretería", icon: "handyman", color: "azul" }]);
  assert.equal(resolvedTone("ferreteria", choices), "azul");
  assert.equal(resolvedTone("  FERRETERÍA ", choices), "azul");
});

it("los diez tonos son tonos válidos y no hay de más", () => {
  assert.equal(CATEGORY_TONES.length, 10);
  for (const tone of CATEGORY_TONES) assert.ok(isCategoryTone(tone));
  assert.equal(isCategoryTone("turquesa"), false);
  assert.equal(isCategoryTone(null), false);
});
