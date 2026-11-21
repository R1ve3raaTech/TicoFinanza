import { strict as assert } from "node:assert";
import test from "node:test";
import { biometricResultFor } from "./native";

/**
 * Acá se decide quién entra.
 *
 * `"no-disponible"` no es un estado de error cualquiera: es el único valor
 * con el que `AppLockGate` **abre la app sola** cuando tampoco hay PIN
 * puesto. Esa puerta existe a propósito —trabar a alguien afuera de sus
 * propios datos sería peor que el riesgo— pero justamente por eso no puede
 * significar nada más que "este teléfono no tiene huella registrada".
 *
 * Todo lo demás —cancelar, fallar, un bloqueo temporal, un plugin que no
 * carga— tiene que dejar el cerrojo puesto.
 */

test("sin huella registrada: respuesta definitiva, el PIN es el único camino", () => {
  for (const code of ["biometryNotEnrolled", "passcodeNotSet", "noDeviceCredential"]) {
    assert.equal(biometricResultFor(code), "no-disponible", `con "${code}"`);
  }
});

/**
 * **`biometryNotAvailable` parece definitivo por el nombre y no lo es.**
 *
 * Leyendo el Android del plugin, en ese código caen tres situaciones:
 * `ERROR_HW_NOT_PRESENT` (no hay sensor, permanente),
 * `ERROR_HW_UNAVAILABLE` ("el sensor existe pero ahora no está disponible",
 * temporal) y `BIOMETRIC_STATUS_UNKNOWN` ("no se pudo determinar"), que cae
 * ahí por el `default` del mapa.
 *
 * Abrir la app de alguien sin PIN ante un "ahora no" o un "no sé" es
 * justamente lo que no hay que hacer. El caso legítimo que cubría —un
 * teléfono sin sensor— se resuelve con `biometryType`, que sale de las
 * capacidades del hardware y no del estado del momento.
 */
test("un sensor ocupado o un estado desconocido NO abren la app", () => {
  assert.equal(biometricResultFor("biometryNotAvailable"), "cancelado");
});

/**
 * **Esta es la prueba que más importa de este archivo.**
 *
 * `biometryLockout` lo tira Android tras varios intentos fallidos. Estuvo
 * tratado como "no hay huella", y eso era un agujero real: sin PIN puesto,
 * fallar la huella cinco veces **abría la app**. O sea que el ataque del
 * que el cerrojo protege —alguien con tu teléfono en la mano— era también
 * la forma de saltárselo.
 */
test("el bloqueo por intentos fallidos NO abre la app", () => {
  const r = biometricResultFor("biometryLockout");
  assert.notEqual(r, "no-disponible", "sin PIN, esto dejaría entrar a cualquiera");
  assert.equal(r, "cancelado");
});

test("cancelar deja reintentar, sin tratarse como si no hubiera huella", () => {
  for (const code of ["userCancel", "appCancel", "systemCancel", "userFallback"]) {
    assert.equal(biometricResultFor(code), "cancelado", `con "${code}"`);
  }
});

/** El dedo no coincidió: se vuelve a probar, no es que falte huella. */
test("una huella que no coincide deja reintentar", () => {
  assert.equal(biometricResultFor("authenticationFailed"), "cancelado");
});

/**
 * Un código que no conocemos no puede caer del lado que abre: eso saltaría
 * el cerrojo por un error que ni siquiera entendemos. Ante la duda, cerrado.
 */
test("un código desconocido se queda del lado cerrado", () => {
  for (const code of ["loQueSea", "", undefined, null, 42, {}]) {
    assert.equal(biometricResultFor(code), "cancelado", `con ${JSON.stringify(code)}`);
  }
});

/**
 * Red de seguridad sobre la lista entera: si alguien agrega un código nuevo
 * a `SIN_HUELLA`, esta prueba lo obliga a pasar por acá y a justificarlo.
 * Son los únicos tres que pueden abrir la app sin PIN.
 *
 * Y valen para **las dos puertas**: el error de `authenticate()` y el
 * `code` con que `checkBiometry()` explica un `isAvailable: false`. Las dos
 * pasan por esta misma función justamente para que no puedan divergir —
 * cerrar una sola fue el bug de la vuelta anterior.
 */
test("solo tres códigos en toda la app pueden abrir el cerrojo sin PIN", () => {
  const abren = [
    "biometryNotAvailable",
    "biometryNotEnrolled",
    "passcodeNotSet",
    "noDeviceCredential",
    "biometryLockout",
    "authenticationFailed",
    "userCancel",
    "appCancel",
    "systemCancel",
    "userFallback",
    "invalidContext",
    "notInteractive",
    "none",
  ].filter((c) => biometricResultFor(c) === "no-disponible");

  assert.deepEqual(abren.sort(), [
    "biometryNotEnrolled",
    "noDeviceCredential",
    "passcodeNotSet",
  ]);
});
