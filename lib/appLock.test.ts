import { strict as assert } from "node:assert";
import test from "node:test";
import {
  cleanPinInput,
  isValidPin,
  lockEnabled,
  parseLockWhen,
  shouldAskOnReturn,
  weakensLock,
} from "./appLock";
import { isAppUserAgent } from "./appMode";

const APK =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 TicoFinanzaApp/1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";

test("reconoce el APK por su marca en el identificador", () => {
  assert.equal(isAppUserAgent(APK), true);
});

test("Chrome en el mismo teléfono NO es el APK", () => {
  // Es el caso que importa: el APK carga el mismo sitio desde el mismo
  // dispositivo, así que lo único que los separa es la marca.
  assert.equal(isAppUserAgent(CHROME_ANDROID), false);
});

test("sin identificador no se asume que es el APK", () => {
  // Falla hacia la web: en la web lo peor que pasa es que siga el cierre
  // por inactividad. Al revés, se perdería el cerrojo.
  assert.equal(isAppUserAgent(null), false);
  assert.equal(isAppUserAgent(undefined), false);
  assert.equal(isAppUserAgent(""), false);
});

test("un valor de cerrojo desconocido cae en el de por defecto, no en apagado", () => {
  assert.equal(parseLockWhen(undefined), "1min");
  assert.equal(parseLockWhen(null), "1min");
  assert.equal(parseLockWhen("loquesea"), "1min");
  assert.equal(parseLockWhen("5min"), "5min");
  assert.equal(parseLockWhen("nunca"), "nunca");
  // "inicio" existió y se quitó: una fila vieja con ese valor no puede
  // dejar el cerrojo en un estado que la app ya no sabe dibujar.
  assert.equal(parseLockWhen("inicio"), "1min");
});

test('solo "nunca" apaga el cerrojo', () => {
  assert.equal(lockEnabled("nunca"), false);
  for (const when of ["siempre", "1min", "5min"] as const) {
    assert.equal(lockEnabled(when), true, when);
  }
});

test('"siempre" pide aunque hayas salido un segundo', () => {
  assert.equal(shouldAskOnReturn("siempre", 1_000), true);
});

test('"1min" pide recién pasado el minuto', () => {
  assert.equal(shouldAskOnReturn("1min", 59_000), false);
  assert.equal(shouldAskOnReturn("1min", 60_000), true);
});

test('"5min" aguanta cuatro minutos y pide a los cinco', () => {
  assert.equal(shouldAskOnReturn("5min", 4 * 60_000), false);
  assert.equal(shouldAskOnReturn("5min", 5 * 60_000), true);
});

test('con el cerrojo apagado no pide ni al volver', () => {
  assert.equal(shouldAskOnReturn("nunca", 60 * 60_000), false);
});

test("el PIN son exactamente cinco dígitos", () => {
  assert.equal(isValidPin("12345"), true);
  assert.equal(isValidPin("1234"), false);
  assert.equal(isValidPin("123456"), false);
  assert.equal(isValidPin("1234a"), false);
  assert.equal(isValidPin(""), false);
  // Nada de espacios ni signos que pasen por "dígito".
  assert.equal(isValidPin("12 34"), false);
  assert.equal(isValidPin("+1234"), false);
});

test("lo tecleado y lo pegado se limpian igual", () => {
  assert.equal(cleanPinInput("12a3b4"), "1234");
  assert.equal(cleanPinInput("123456789"), "12345");
  assert.equal(cleanPinInput("  1 2 3  "), "123");
  assert.equal(cleanPinInput("abc"), "");
});

test("aflojar el cerrojo se reconoce; apretarlo no cuenta", () => {
  // Apagarlo es lo más flojo que hay.
  assert.equal(weakensLock("siempre", "nunca"), true);
  assert.equal(weakensLock("1min", "nunca"), true);
  assert.equal(weakensLock("5min", "nunca"), true);
  assert.equal(weakensLock("siempre", "5min"), true);
  assert.equal(weakensLock("1min", "5min"), true);
  // Ponerse más estricto es gratis.
  assert.equal(weakensLock("nunca", "siempre"), false);
  assert.equal(weakensLock("5min", "1min"), false);
  assert.equal(weakensLock("1min", "siempre"), false);
  // Dejarlo igual no es un cambio.
  assert.equal(weakensLock("1min", "1min"), false);
});
