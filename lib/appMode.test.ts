import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { APP_UA_MARKER, isAppUserAgent } from "./appMode";

const ROOT = join(import.meta.dirname, "..");

/**
 * El envoltorio de Android y la web tienen que estar de acuerdo en una sola
 * cosa: la marca que viaja en el identificador del navegador.
 *
 * Si se cambia en `capacitor.config.ts` y no acá (o al revés), **el APK
 * pasa a comportarse como la web sin que nada falle**: mostraría la
 * portada en vez de la bienvenida, perdería el cerrojo con huella y
 * volvería el cierre de sesión por inactividad. No hay error, no hay
 * pantalla roja: solo una app que de pronto es otra.
 *
 * Por eso se comprueba contra el archivo de configuración de verdad, y no
 * contra una copia del texto.
 */
test("el APK y la web usan la misma marca en el identificador", () => {
  const config = readFileSync(join(ROOT, "capacitor.config.ts"), "utf8");
  const declarada = /appendUserAgent:\s*"([^"]+)"/.exec(config)?.[1];

  assert.ok(declarada, "capacitor.config.ts tiene que declarar appendUserAgent");
  assert.ok(
    declarada.includes(APP_UA_MARKER),
    `capacitor.config.ts manda "${declarada}", que no contiene "${APP_UA_MARKER}" ` +
      "(lib/appMode.ts). El APK se comportaría como la web."
  );

  // Y de punta a punta: un identificador real de Android con esa marca
  // pegada al final tiene que reconocerse.
  const real =
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) " +
    `Chrome/120 Mobile Safari/537.36 ${declarada}`;
  assert.equal(isAppUserAgent(real), true);
});

/**
 * El APK carga el sitio en vivo. Si apuntara a otro lado —a `localhost` de
 * una prueba, por ejemplo— la app instalada abriría en blanco.
 */
test("el APK apunta al dominio de producción, por HTTPS", () => {
  const config = readFileSync(join(ROOT, "capacitor.config.ts"), "utf8");
  const url = /url:\s*"([^"]+)"/.exec(config)?.[1];

  assert.equal(url, "https://www.ticofinanza.com");
});
