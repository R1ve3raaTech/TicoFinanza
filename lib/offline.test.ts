import { it } from "node:test";
import assert from "node:assert/strict";
import {
  isFrameworkNavigation,
  ownedBy,
  isNetworkFailure,
  isWrongSession,
  localId,
  MAX_ATTEMPTS,
  pendingLabel,
  pendingNet,
  sendOrder,
  sendable,
  stuck,
  WRONG_SESSION,
  type PendingMovement,
} from "./offline";

function item(partial: Partial<PendingMovement> & { id: string }): PendingMovement {
  return {
    userId: "u1",
    input: {
      amount: 4_200,
      description: "Soda",
      category: "Alimentación",
      type: "EXPENSE",
      transactionDate: "2026-11-01T18:00:00.000Z",
      accountId: "a1",
      receiptPath: null,
    },
    queuedAt: 1,
    status: "pending",
    attempts: 0,
    ...partial,
  };
}

it("se manda en el orden en que se anotó", () => {
  const order = sendOrder([
    item({ id: "c", queuedAt: 30 }),
    item({ id: "a", queuedAt: 10 }),
    item({ id: "b", queuedAt: 20 }),
  ]);
  assert.deepEqual(order.map((i) => i.id), ["a", "b", "c"]);
});

it("dos anotados en el mismo milisegundo tienen un orden estable", () => {
  const order = sendOrder([item({ id: "b", queuedAt: 5 }), item({ id: "a", queuedAt: 5 })]);
  assert.deepEqual(order.map((i) => i.id), ["a", "b"]);
});

it("no se vuelve a mandar lo que ya va en camino: si no, entraría dos veces", () => {
  const list = sendable([item({ id: "a" }), item({ id: "b", status: "sending" })]);
  assert.deepEqual(list.map((i) => i.id), ["a"]);
});

it("deja de reintentar solo después del tope y lo separa para mostrarlo", () => {
  const items = [
    item({ id: "a", attempts: MAX_ATTEMPTS - 1 }),
    item({ id: "b", attempts: MAX_ATTEMPTS, status: "failed" }),
  ];
  assert.deepEqual(sendable(items).map((i) => i.id), ["a"]);
  assert.deepEqual(stuck(items).map((i) => i.id), ["b"]);
});

it("un fallo de red se reintenta; un rechazo del servidor no", () => {
  assert.equal(isNetworkFailure(new TypeError("Failed to fetch")), true);
  assert.equal(isNetworkFailure(new Error("NetworkError when attempting to fetch")), true);
  assert.equal(isNetworkFailure(new Error("net::ERR_INTERNET_DISCONNECTED")), true);
  assert.equal(isNetworkFailure(new Error("El monto debe ser mayor a cero.")), false);
  assert.equal(isNetworkFailure(new Error("Esa cuenta no existe o no es tuya.")), false);
});

it("lo pendiente se suma con los gastos en negativo", () => {
  const net = pendingNet([
    item({ id: "a", input: { ...item({ id: "x" }).input, amount: 4_200, type: "EXPENSE" } }),
    item({ id: "b", input: { ...item({ id: "x" }).input, amount: 1_000, type: "EXPENSE" } }),
    item({ id: "c", input: { ...item({ id: "x" }).input, amount: 10_000, type: "INCOME" } }),
  ]);
  assert.equal(net, 4_800);
});

it("el rótulo no dice '1 movimientos'", () => {
  assert.equal(pendingLabel(1), "1 movimiento sin enviar");
  assert.equal(pendingLabel(3), "3 movimientos sin enviar");
});

it("los ids locales no se repiten", () => {
  const ids = new Set(Array.from({ length: 200 }, () => localId()));
  assert.equal(ids.size, 200);
});

it("un redirect de Next no es un movimiento fallido", () => {
  // La sesión vence a los 15 minutos y la acción redirige a /entrar; eso
  // llega al cliente como excepción. Marcar la cola como fallida por eso
  // dejaba movimientos sanos esperando un reintento a mano.
  assert.equal(isFrameworkNavigation({ digest: "NEXT_REDIRECT;replace;/entrar;307;" }), true);
  assert.equal(isFrameworkNavigation({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" }), true);
  assert.equal(isFrameworkNavigation(new Error("Failed to fetch")), false);
  assert.equal(isFrameworkNavigation(null), false);
  assert.equal(isFrameworkNavigation(undefined), false);
});

it("la cola de otra persona ni se lista ni se manda", () => {
  // IndexedDB es del origen, no de la sesión: en una compu compartida lo
  // que quedó sin enviar sigue ahí después de cerrar sesión. Sin filtrar,
  // el gasto de una persona entraría en la cuenta de la siguiente.
  const items = [item({ id: "a" }), item({ id: "b", userId: "u2" })];
  assert.deepEqual(ownedBy(items, "u1").map((i) => i.id), ["a"]);
  assert.deepEqual(ownedBy(items, "u2").map((i) => i.id), ["b"]);
});

it("sin sesión no se lista ni se manda nada", () => {
  assert.deepEqual(ownedBy([item({ id: "a" })], null), []);
});

it("el rechazo por sesión distinta se reconoce y no se confunde con otro error", () => {
  // Es lo que devuelve el servidor cuando la cookie ya es de otra cuenta.
  // La cola tiene que dejar el pendiente intacto, no quemarle un intento.
  assert.equal(isWrongSession(WRONG_SESSION), true);
  assert.equal(isWrongSession("No se pudo guardar el movimiento. Intentá de nuevo."), false);
  assert.equal(isWrongSession(null), false);
  assert.equal(isWrongSession(undefined), false);
});
