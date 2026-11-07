import { it } from "node:test";
import assert from "node:assert/strict";
import {
  caretAfterDigits,
  countDigits,
  formatAmountInput,
  parseAmount,
  typedAmount,
} from "./amount";

it("agrupa los miles mientras se escribe", () => {
  assert.equal(typedAmount("4532"), "4.532");
  assert.equal(typedAmount("1250000"), "1.250.000");
});

it("no agrupa hasta que hay cuatro dígitos", () => {
  assert.equal(typedAmount("4"), "4");
  assert.equal(typedAmount("453"), "453");
});

it("no deja escribir letras ni símbolos", () => {
  assert.equal(typedAmount("12a5b00"), "12.500");
  assert.equal(typedAmount("abc"), "");
  assert.equal(typedAmount("₡ 12 500 colones"), "12.500");
});

it("ignora los puntos que escriba la persona: los pone la app", () => {
  assert.equal(typedAmount("12.500"), "12.500");
  assert.equal(typedAmount("1.2"), "12");
});

it("la coma abre los decimales y se recorta a dos", () => {
  assert.equal(typedAmount("4532,21"), "4.532,21");
  assert.equal(typedAmount("4532,2199"), "4.532,21");
  assert.equal(typedAmount("4532,"), "4.532,");
  assert.equal(typedAmount(",5"), "0,5");
});

it("saca los ceros de adelante", () => {
  assert.equal(typedAmount("007"), "7");
  // Un cero solo sí se queda: es lo que se ve mientras se borra el campo.
  assert.equal(typedAmount("0"), "0");
});

it("el campo vacío queda vacío, no en cero", () => {
  assert.equal(typedAmount(""), "");
});

it("lee los dos formatos que puede tener el campo", () => {
  assert.equal(parseAmount("12.500"), 12_500);
  assert.equal(parseAmount("12,5"), 12.5);
  assert.equal(parseAmount("1.250.000,50"), 1_250_000.5);
  assert.equal(parseAmount(""), 0);
});

it("lo que escribe la persona vuelve a salir igual al leerlo y formatearlo", () => {
  for (const raw of ["4532", "1250000", "7", "4532,21"]) {
    const typed = typedAmount(raw);
    assert.equal(formatAmountInput(parseAmount(typed)), typed);
  }
});

it("un monto guardado abre el campo con sus puntos de miles", () => {
  assert.equal(formatAmountInput(185_000), "185.000");
  assert.equal(formatAmountInput(9_100.5), "9.100,5");
  assert.equal(formatAmountInput(0), "0");
});

it("el cursor queda después del dígito que se escribió, no corrido por el punto", () => {
  // "1234" + agrupar = "1.234": cuatro dígitos escritos, cursor al final.
  assert.equal(caretAfterDigits("1.234", 4), 5);
  // Editando en el medio: dos dígitos a la izquierda del cursor.
  assert.equal(caretAfterDigits("1.234", 2), 3);
  assert.equal(caretAfterDigits("1.234", 0), 0);
});

it("cuenta dígitos y no separadores", () => {
  assert.equal(countDigits("1.250.000,50"), 9);
  assert.equal(countDigits(""), 0);
});
