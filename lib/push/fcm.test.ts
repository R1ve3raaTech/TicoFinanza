import { strict as assert } from "node:assert";
import { createPrivateKey, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { normalizarClave } from "./fcm";

/**
 * **Estas pruebas existen por un error real en producción.**
 *
 * La clave privada de la cuenta de servicio quedó mal pegada en Vercel y
 * el envío falló con "DECODER routines::unsupported" — un mensaje que no
 * se parece en nada a la causa. Peor: la excepción subía hasta la
 * pantalla, así que el botón de prueba terminaba en la pantalla de error
 * de la app sin decir nada útil, y el aviso del navegador, que no tiene
 * nada que ver, tampoco salía.
 *
 * La comprobación de verdad es que OpenSSL la acepte, así que cada caso
 * genera una clave real, la rompe de una de las formas en que se rompe al
 * copiarla, y exige que después de normalizar siga siendo utilizable.
 */

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

/** La barra y la ene como dos caracteres: así viaja un salto en un .env. */
const BARRA_N = String.fromCharCode(92) + "n";

/** ¿OpenSSL la acepta? Es lo único que de verdad importa. */
function usable(clave: string): boolean {
  try {
    createPrivateKey(clave);
    return true;
  } catch {
    return false;
  }
}

test("una clave bien pegada pasa intacta", () => {
  assert.equal(usable(normalizarClave(PEM)), true);
});

/**
 * **El caso que falló de verdad.** En un archivo .env la clave va entre
 * comillas; en la interfaz de Vercel el valor es el texto tal cual, así
 * que las comillas quedan adentro y el PEM deja de serlo.
 */
test("con las comillas del .env pegadas al valor", () => {
  assert.equal(usable('"' + PEM + '"'), false, "sin normalizar no sirve");
  assert.equal(usable(normalizarClave('"' + PEM + '"')), true);
  assert.equal(usable(normalizarClave("'" + PEM + "'")), true);
});

/** Como viaja en un .env, y como queda al copiar el campo del JSON. */
test("con los saltos de línea escritos como texto", () => {
  const escapada = PEM.split("\n").join(BARRA_N);
  assert.equal(usable(normalizarClave(escapada)), true);
});

/** Lo que deja un editor que desarma el pegado. */
test("con todo en una sola línea", () => {
  const unaLinea = PEM.split("\n").join(" ").replace(/\s+/g, " ").trim();
  assert.equal(usable(unaLinea), false, "sin normalizar no sirve");
  assert.equal(usable(normalizarClave(unaLinea)), true);
});

test("con comillas y saltos escritos a la vez, que es lo más fácil de hacer", () => {
  const rota = '"' + PEM.split("\n").join(BARRA_N) + '"';
  assert.equal(usable(rota), false, "sin normalizar no sirve");
  assert.equal(usable(normalizarClave(rota)), true);
});

test("con espacios de más alrededor", () => {
  assert.equal(usable(normalizarClave("\n  " + PEM + "  \n")), true);
});

/** Lo que no es una clave no se convierte en una: se deja pasar y falla. */
test("un valor que no es una clave no se inventa", () => {
  assert.equal(usable(normalizarClave("cualquier cosa")), false);
  assert.equal(usable(normalizarClave("")), false);
});
