import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { APP_UA_MARKER, isAppUserAgent, isAppRequest } from "./appMode";

const ROOT = join(import.meta.dirname, "..");

/**
 * El envoltorio de Android y la web tienen que estar de acuerdo en una sola
 * cosa: la marca que viaja en el identificador del navegador.
 *
 * Si se cambia en `capacitor.config.ts` y no acá (o al revés), **el APK
 * pasa a comportarse como la web sin que nada falle**: mostraría la
 * portada en vez de la bienvenida, perdería el cerrojo con PIN y
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

/**
 * **Por qué la cookie existe, y por qué no reemplaza a la marca.**
 *
 * El WebView agrega la marca al identificador, pero los pedidos que nacen
 * dentro del Service Worker salen con el de fábrica: ese contexto tiene
 * sus propios ajustes y Android no deja copiarle el del WebView. Como las
 * pantallas de adentro pasan por el Service Worker, el servidor las veía
 * llegar como si fueran la web.
 *
 * La cookie arregla eso, pero llega tarde para el primer pedido —la pone
 * el navegador después del primer dibujo—, así que las dos señales se
 * miran juntas y alcanza con cualquiera.
 */
test("alcanza con cualquiera de las dos señales", () => {
  const web = "Mozilla/5.0 (Linux; Android 14) Chrome/131 Mobile Safari/537.36";
  const app = `${web} TicoFinanzaApp/1`;

  assert.equal(isAppRequest(app, undefined), true, "solo la marca: el primer pedido");
  assert.equal(isAppRequest(web, "1"), true, "solo la cookie: lo que pasa por el Service Worker");
  assert.equal(isAppRequest(app, "1"), true, "las dos");
  assert.equal(isAppRequest(web, undefined), false, "ninguna: es la web");
});

test("una cookie con cualquier otro valor no cuenta", () => {
  const web = "Mozilla/5.0 (Linux; Android 14) Chrome/131 Mobile Safari/537.36";
  for (const valor of ["0", "", "true", "si", "11"]) {
    assert.equal(isAppRequest(web, valor), false, `con "${valor}"`);
  }
});
