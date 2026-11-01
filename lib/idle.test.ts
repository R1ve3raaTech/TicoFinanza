import { it } from "node:test";
import assert from "node:assert/strict";
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  idlePhase,
  mostRecentActivity,
  secondsUntilLogout,
} from "./idle";

it("avisa un minuto antes y cierra a los quince", () => {
  assert.equal(idlePhase(0), "activa");
  assert.equal(idlePhase(IDLE_TIMEOUT_MS - IDLE_WARNING_MS - 1), "activa");
  assert.equal(idlePhase(IDLE_TIMEOUT_MS - IDLE_WARNING_MS), "por-vencer");
  assert.equal(idlePhase(IDLE_TIMEOUT_MS - 1), "por-vencer");
  assert.equal(idlePhase(IDLE_TIMEOUT_MS), "vencida");
});

it("una compu que durmió dos horas aparece vencida apenas despierta", () => {
  assert.equal(idlePhase(2 * 60 * 60_000), "vencida");
  assert.equal(secondsUntilLogout(2 * 60 * 60_000), 0, "nunca cuenta en negativo");
});

it("la cuenta regresiva va de 60 a 0", () => {
  assert.equal(secondsUntilLogout(IDLE_TIMEOUT_MS - 60_000), 60);
  assert.equal(secondsUntilLogout(IDLE_TIMEOUT_MS - 1_000), 1);
  assert.equal(secondsUntilLogout(IDLE_TIMEOUT_MS), 0);
});

it("se queda con la actividad más reciente entre pestañas", () => {
  const now = 1_000_000;
  assert.equal(mostRecentActivity(100, "500", now), 500, "la otra pestaña es más nueva");
  assert.equal(mostRecentActivity(900, "500", now), 900, "esta pestaña es más nueva");
  assert.equal(mostRecentActivity(900, null, now), 900, "sin nada guardado");
  assert.equal(mostRecentActivity(900, "no-es-un-numero", now), 900);
});

it("descarta una marca en el futuro, que dejaría la sesión abierta para siempre", () => {
  const now = 1_000_000;
  assert.equal(mostRecentActivity(900, String(now + 60_000), now), 900);
});
