import { strict as assert } from "node:assert";
import test from "node:test";
import { biometricResultFor } from "./native";

/**
 * Lo que se decide acá es a quién se le ofrece el PIN y a quién un botón de
 * "probar otra vez". Confundirlos tiene consecuencias feas en los dos
 * sentidos: a quien no tiene huella registrada se le quedaría ofreciendo un
 * botón que nunca va a funcionar, y a quien solo canceló se le mostraría el
 * PIN como si su huella no sirviera.
 */

test("sin huella registrada o sin hardware, el único camino es el PIN", () => {
  for (const code of ["biometryNotAvailable", "biometryNotEnrolled", "passcodeNotSet", "noDeviceCredential"]) {
    assert.equal(biometricResultFor(code), "no-disponible", `con "${code}"`);
  }
});

/**
 * Android bloquea la huella tras varios intentos fallidos. Es temporal,
 * pero durante ese rato insistir no sirve: va al PIN.
 */
test("el bloqueo por intentos fallidos también manda al PIN", () => {
  assert.equal(biometricResultFor("biometryLockout"), "no-disponible");
});

test("cancelar deja reintentar, no se trata como si no hubiera huella", () => {
  for (const code of ["userCancel", "appCancel", "systemCancel", "userFallback"]) {
    assert.equal(biometricResultFor(code), "cancelado", `con "${code}"`);
  }
});

/** El dedo no coincidió: se vuelve a probar, no es que falte huella. */
test("una huella que no coincide deja reintentar", () => {
  assert.equal(biometricResultFor("authenticationFailed"), "cancelado");
});

/**
 * Un código que no conocemos NO puede caer en "no-disponible": eso saltaría
 * la huella y mostraría el PIN directo, debilitando el cerrojo por un error
 * que ni siquiera entendemos. Ante la duda, se queda cerrado.
 */
test("un código desconocido se queda del lado cerrado", () => {
  for (const code of ["loQueSea", "", undefined, null, 42, {}]) {
    assert.equal(biometricResultFor(code), "cancelado", `con ${JSON.stringify(code)}`);
  }
});
