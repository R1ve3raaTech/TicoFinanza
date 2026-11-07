import { it } from "node:test";
import assert from "node:assert/strict";
import { categoryClash } from "./categories";

it("una categoría propia nueva se puede agregar", () => {
  assert.equal(categoryClash("Ferretería", "EXPENSE", []), null);
});

it("no deja repetir una que ya trae la app, ni con otra escritura", () => {
  assert.ok(categoryClash("Ocio", "EXPENSE", []));
  assert.ok(categoryClash("ocio", "EXPENSE", []));
  assert.ok(categoryClash("Educacion", "EXPENSE", []));
  assert.ok(categoryClash("Salario", "INCOME", []));
  // La misma palabra en el otro tipo sí se puede: "Salario" no es de gasto.
  assert.equal(categoryClash("Salario", "EXPENSE", []), null);
});

it("no deja repetir una propia escrita distinto", () => {
  assert.ok(categoryClash("ferreteria", "EXPENSE", ["Ferretería"]));
  assert.ok(categoryClash("  FERRETERÍA ", "EXPENSE", ["Ferretería"]));
  assert.equal(categoryClash("Veterinaria", "EXPENSE", ["Ferretería"]), null);
});

it("pide un nombre y le pone un techo al largo", () => {
  assert.ok(categoryClash("   ", "EXPENSE", []));
  assert.ok(categoryClash("a".repeat(25), "EXPENSE", []));
  assert.equal(categoryClash("a".repeat(24), "EXPENSE", []), null);
});
