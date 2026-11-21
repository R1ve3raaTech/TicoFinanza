import { strict as assert } from "node:assert";
import test from "node:test";
import { hasNativeBridge, type PosibleGlobal } from "./nativeBridge";

/**
 * Estas pruebas existen por un bug concreto: adentro del APK, la detección
 * daba `false` y el botón de Google se iba por el camino de la web, así que
 * el login terminaba en Brave y la app se quedaba sin sesión. Justo lo
 * contrario de para lo que se escribió.
 *
 * La causa es sutil y vale la pena dejarla clavada: esta app carga el sitio
 * **en vivo** (`server.url`), así que la página es nuestro HTML de Next y no
 * trae el `capacitor.js` que una app empacada sí tendría. `window.Capacitor`
 * no existe hasta que algún `import()` lo crea. Lo que Android inyecta
 * siempre, desde el lado nativo, es `androidBridge`.
 */

test("el APK se reconoce por androidBridge, que es lo que Android inyecta", () => {
  assert.equal(hasNativeBridge({ androidBridge: {} } as PosibleGlobal), true);
});

test("sin window.Capacitor cargado todavía, igual se reconoce", () => {
  // Este es exactamente el estado de la primera carga dentro del APK: el
  // puente nativo está, el JS de Capacitor no se cargó aún. La versión
  // vieja devolvía false acá y mandaba a la persona al navegador.
  const antesDeImportarCore: PosibleGlobal = { androidBridge: {} };
  assert.equal(hasNativeBridge(antesDeImportarCore), true);
});

test("también se acepta el camino de @capacitor/core, una vez cargado", () => {
  assert.equal(
    hasNativeBridge({ Capacitor: { isNativePlatform: () => true } } as PosibleGlobal),
    true
  );
});

test("un navegador de escritorio no es el APK", () => {
  assert.equal(hasNativeBridge({} as PosibleGlobal), false);
  assert.equal(hasNativeBridge(undefined), false);
  assert.equal(
    hasNativeBridge({ Capacitor: { isNativePlatform: () => false } } as PosibleGlobal),
    false
  );
  // Capacitor cargado en la web: existe el objeto pero no el puente.
  assert.equal(hasNativeBridge({ Capacitor: {} } as PosibleGlobal), false);
});
