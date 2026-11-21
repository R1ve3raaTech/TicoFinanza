import { strict as assert } from "node:assert";
import test from "node:test";
import { audienceOf } from "./idToken";

/** Arma un token con la forma de uno real: tres partes en base64url. */
function token(carga: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "RS256" })}.${b64(carga)}.firma-falsa`;
}

const CLIENTE = "991333400299-abc.apps.googleusercontent.com";

test("lee el público al que va dirigido el token", () => {
  assert.equal(audienceOf(token({ aud: CLIENTE, sub: "123" })), CLIENTE);
});

test("un token dirigido a otro cliente se distingue", () => {
  const otro = "000000000000-xyz.apps.googleusercontent.com";
  assert.notEqual(audienceOf(token({ aud: otro })), CLIENTE);
});

/**
 * Google usa base64url. Si se decodificara como base64 a secas, una carga
 * con `-` o `_` se rompería — y el `aud` saldría nulo, que la ruta trata
 * como "no sé", dejando pasar el token a Supabase. No es un agujero, pero
 * sí perdería el motivo del error justo cuando hace falta.
 */
test("decodifica base64url, no base64 a secas", () => {
  // Esta carga obliga a que aparezcan `-` y `_` en el base64url.
  const carga = { aud: CLIENTE, nombre: "ÁÉÍÓÚ ñ ¿?¡! >>> ???" };
  const t = token(carga);
  assert.ok(/[-_]/.test(t.split(".")[1]), "la prueba necesita una carga con - o _");
  assert.equal(audienceOf(t), CLIENTE);
});

test("un token con forma rara no explota, devuelve null", () => {
  for (const malo of ["", "abc", "a.b", "a.b.c.d", "a.@@@.c", "a..c"]) {
    assert.equal(audienceOf(malo), null, `con "${malo}"`);
  }
});

test("sin aud, o con un aud que no es texto, devuelve null", () => {
  assert.equal(audienceOf(token({ sub: "123" })), null);
  assert.equal(audienceOf(token({ aud: 42 })), null);
  assert.equal(audienceOf(token({ aud: "" })), null);
  // Google puede mandar `aud` como lista. No se interpreta a propósito: con
  // una lista, decidir cuál cuenta es justo el tipo de criterio que no hay
  // que inventar del lado que no verifica firmas. Queda en null y manda
  // Supabase.
  assert.equal(audienceOf(token({ aud: [CLIENTE] })), null);
});
