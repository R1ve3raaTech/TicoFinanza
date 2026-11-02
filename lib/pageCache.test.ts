import { it } from "node:test";
import assert from "node:assert/strict";
import { isFreshRender, markIsFresh } from "./pageCache";

const HORA = 60 * 60 * 1000;
const AHORA = Date.UTC(2026, 10, 2, 12, 0, 0);

it("una marca recién escrita vale", () => {
  assert.equal(markIsFresh({ userId: "u1", at: AHORA }, AHORA), true);
  assert.equal(markIsFresh({ userId: "u1", at: AHORA - 11 * HORA }, AHORA), true);
});

it("pasadas doce horas deja de valer", () => {
  // Quien cierra el navegador sin salir no pasa por ningún borrado. Sin
  // esto, su marca autorizaría a leer el caché para siempre.
  assert.equal(markIsFresh({ userId: "u1", at: AHORA - 12 * HORA }, AHORA), true);
  assert.equal(markIsFresh({ userId: "u1", at: AHORA - 12 * HORA - 1 }, AHORA), false);
  assert.equal(markIsFresh({ userId: "u1", at: AHORA - 48 * HORA }, AHORA), false);
});

it("una marca con fecha futura no vale: es un reloj desajustado", () => {
  assert.equal(markIsFresh({ userId: "u1", at: AHORA + HORA }, AHORA), false);
});

it("sin marca, o con una de forma inesperada, falla cerrado", () => {
  assert.equal(markIsFresh(null, AHORA), false);
  // Así se guardaba antes: texto suelto, sin fecha.
  assert.equal(markIsFresh("u1" as never, AHORA), false);
  assert.equal(markIsFresh({ userId: "u1", at: Number.NaN }, AHORA), false);
  // Un id vacío no es una persona: armaría un nombre de caché sin dueño.
  assert.equal(markIsFresh({ userId: "", at: AHORA } as never, AHORA), false);
});

it("una pantalla recién hecha por el servidor cuenta como prueba de sesión", () => {
  assert.equal(isFreshRender(AHORA, AHORA), true);
  assert.equal(isFreshRender(AHORA - 30_000, AHORA), true, "una conexión lenta sigue valiendo");
  assert.equal(isFreshRender(AHORA - 2 * 60_000, AHORA), true);
});

it("una pantalla del caché NO renueva el permiso de leer el caché", () => {
  // Sin esto, abrir la app sin señal refrescaría la marca con una
  // pantalla guardada y el vencimiento de doce horas no vencería nunca:
  // el permiso se renovaría leyendo aquello mismo que autoriza.
  assert.equal(isFreshRender(AHORA - 3 * 60_000, AHORA), false);
  assert.equal(isFreshRender(AHORA - 5 * HORA, AHORA), false);
});

it("un reloj adelantado tampoco prueba nada", () => {
  assert.equal(isFreshRender(AHORA + 5 * HORA, AHORA), false);
  assert.equal(isFreshRender(Number.NaN, AHORA), false);
});
