import { it } from "node:test";
import assert from "node:assert/strict";
import { shouldShowWelcome } from "./onboarding";

it("a una cuenta recién registrada sí le sale", () => {
  // `handle_new_user` no crea la fila de ajustes, así que quien se acaba de
  // registrar no tiene ninguna. Este era el fallo: no le salía a nadie.
  assert.equal(shouldShowWelcome(null), true);
  assert.equal(shouldShowWelcome(undefined), true);
});

it("a quien todavía no la vio también", () => {
  assert.equal(shouldShowWelcome({ onboarding_seen: false }), true);
});

it("a quien ya la vio, no", () => {
  assert.equal(shouldShowWelcome({ onboarding_seen: true }), false);
});

it("sin la columna (migración sin correr) no se muestra", () => {
  // Trabarle la pantalla diez segundos a todo el mundo en cada carga sería
  // mucho peor que no mostrarla.
  assert.equal(shouldShowWelcome({}), false);
  assert.equal(shouldShowWelcome({ onboarding_seen: undefined }), false);
});

it("un null en la columna cuenta como que no la vio", () => {
  assert.equal(shouldShowWelcome({ onboarding_seen: null }), false);
});
