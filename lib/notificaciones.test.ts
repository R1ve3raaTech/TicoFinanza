import { it } from "node:test";
import assert from "node:assert/strict";
import {
  lectorDisponible,
  ordenarApps,
  volcadoDeTexto,
  type AppVista,
  type NotificacionCapturada,
} from "./notificaciones";

function app(over: Partial<AppVista> = {}): AppVista {
  return {
    pkg: "com.ejemplo.app",
    nombre: "Ejemplo",
    vistas: 1,
    ultima: 0,
    capturando: false,
    ...over,
  };
}

function aviso(over: Partial<NotificacionCapturada> = {}): NotificacionCapturada {
  return {
    pkg: "com.banco.app",
    app: "Banco",
    titulo: "Compra aprobada",
    texto: "Comercio: SODA LA U\nMonto: CRC 3.500,00",
    // 20 de noviembre de 2026, 2:30 p.m. en Costa Rica.
    cuando: Date.UTC(2026, 10, 20, 20, 30),
    ...over,
  };
}

it("fuera del APK el lector no está disponible", () => {
  // En la web no hay plugin nativo: todo el tablero se esconde en vez de
  // ofrecer botones que no hacen nada.
  assert.equal(lectorDisponible(), false);
});

it("las apps que ya se capturan van primero", () => {
  const lista = ordenarApps([
    app({ pkg: "a", nombre: "Mucho", vistas: 50 }),
    app({ pkg: "b", nombre: "Banco", vistas: 2, capturando: true }),
  ]);
  assert.deepEqual(
    lista.map((a) => a.pkg),
    ["b", "a"],
    "las marcadas son las que uno vuelve a mirar"
  );
});

it("entre las no marcadas, la que más notificó va arriba", () => {
  // Es lo que hace que una app de banco salte a la vista entre veinte.
  const lista = ordenarApps([
    app({ pkg: "poco", vistas: 1 }),
    app({ pkg: "mucho", vistas: 30 }),
  ]);
  assert.deepEqual(
    lista.map((a) => a.pkg),
    ["mucho", "poco"]
  );
});

it("con los mismos avisos, por nombre y respetando las tildes", () => {
  const lista = ordenarApps([
    app({ pkg: "z", nombre: "Ñandú", vistas: 3 }),
    app({ pkg: "a", nombre: "Alfa", vistas: 3 }),
  ]);
  assert.deepEqual(
    lista.map((a) => a.nombre),
    ["Alfa", "Ñandú"]
  );
});

it("ordenar no toca la lista que recibe", () => {
  const original = [app({ pkg: "a", vistas: 1 }), app({ pkg: "b", vistas: 9 })];
  ordenarApps(original);
  assert.equal(original[0].pkg, "a", "la lista del estado de React no se muta");
});

it("el volcado dice cuántos hay y los delimita", () => {
  const texto = volcadoDeTexto([aviso(), aviso({ titulo: "Otra" })]);
  assert.match(texto, /2 notificaciones capturadas/);
  assert.match(texto, /--- 1 ---/);
  assert.match(texto, /--- 2 ---/);
});

it("el volcado lleva app, paquete, título y texto", () => {
  const texto = volcadoDeTexto([aviso()]);
  assert.match(texto, /app: Banco \(com\.banco\.app\)/);
  assert.match(texto, /titulo: Compra aprobada/);
  assert.match(texto, /SODA LA U/);
  assert.match(texto, /1 notificación capturada/, "en singular");
});

/**
 * **La hora se escribe en hora de Costa Rica.** El `cuando` que manda
 * Android son milisegundos, y leerlos con el huso del dispositivo daría una
 * hora distinta en cada teléfono — justo el dato que hay que comparar
 * contra el movimiento que la compra generó.
 */
it("la hora del volcado es la de Costa Rica, no la del aparato", () => {
  const texto = volcadoDeTexto([aviso()]);
  assert.match(texto, /cuando: .*14:30|cuando: .*2:30/);
  assert.doesNotMatch(texto, /20:30/, "esa es la hora UTC");
});

it("un aviso sin fecha válida no rompe el volcado", () => {
  const texto = volcadoDeTexto([aviso({ cuando: Number.NaN })]);
  assert.match(texto, /cuando: sin fecha/);
});

it("sin nada capturado lo dice, en vez de devolver una cadena vacía", () => {
  // Una cadena vacía copiada al portapapeles es indistinguible de que el
  // botón no funcionó.
  assert.equal(volcadoDeTexto([]), "No hay notificaciones capturadas.");
});
