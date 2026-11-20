import { strict as assert } from "node:assert";
import test from "node:test";
import type { RecentMovement } from "./quickEntry";
import { recentCategories, visibleCategories } from "./recentCategories";

function mov(category: string | null, type: "EXPENSE" | "INCOME", date: string): RecentMovement {
  return {
    description: "x",
    category,
    account_id: "a1",
    transaction_date: date,
    amount: 1000,
    type,
  } as RecentMovement;
}

const DISPONIBLES = ["Alimentación", "Transporte", "Ocio", "Servicios", "Salud", "Ferretería"];

test("devuelve las últimas cuatro, sin repetir", () => {
  const recientes = [
    mov("Alimentación", "EXPENSE", "2026-11-19"),
    mov("Alimentación", "EXPENSE", "2026-11-18"),
    mov("Transporte", "EXPENSE", "2026-11-17"),
    mov("Ocio", "EXPENSE", "2026-11-16"),
    mov("Servicios", "EXPENSE", "2026-11-15"),
    mov("Salud", "EXPENSE", "2026-11-14"),
  ];
  assert.deepEqual(recentCategories(recientes, "EXPENSE", DISPONIBLES), [
    "Alimentación",
    "Transporte",
    "Ocio",
    "Servicios",
  ]);
});

test("no mezcla las de ingreso con las de gasto", () => {
  const recientes = [
    mov("Salario", "INCOME", "2026-11-19"),
    mov("Alimentación", "EXPENSE", "2026-11-18"),
  ];
  assert.deepEqual(recentCategories(recientes, "EXPENSE", DISPONIBLES), ["Alimentación"]);
  assert.deepEqual(recentCategories(recientes, "INCOME", ["Salario", "Freelance"]), ["Salario"]);
});

test("una categoría borrada no vuelve por esta puerta", () => {
  // Se usó y después se eliminó: ya no está entre las disponibles.
  const recientes = [mov("Mascotas", "EXPENSE", "2026-11-19"), mov("Ocio", "EXPENSE", "2026-11-18")];
  assert.deepEqual(recentCategories(recientes, "EXPENSE", DISPONIBLES), ["Ocio"]);
});

test("los movimientos sin categoría no ocupan lugar", () => {
  const recientes = [mov(null, "EXPENSE", "2026-11-19"), mov("Ocio", "EXPENSE", "2026-11-18")];
  assert.deepEqual(recentCategories(recientes, "EXPENSE", DISPONIBLES), ["Ocio"]);
});

test("sin historial no ofrece nada a la mano", () => {
  assert.deepEqual(recentCategories([], "EXPENSE", DISPONIBLES), []);
});

test("la categoría elegida se agrega si no está entre las recientes", () => {
  // El caso real: editar un movimiento viejo de una categoría que hace
  // meses no usás. Sin esto el formulario abriría sin nada marcado.
  assert.deepEqual(visibleCategories(["Ocio", "Salud"], "Ferretería", DISPONIBLES), [
    "Ferretería",
    "Ocio",
    "Salud",
  ]);
});

test("y no se duplica si ya estaba", () => {
  assert.deepEqual(visibleCategories(["Ocio", "Salud"], "Ocio", DISPONIBLES), ["Ocio", "Salud"]);
});

test("una elegida que ya no existe no se inventa como chip", () => {
  assert.deepEqual(visibleCategories(["Ocio"], "Borrada", DISPONIBLES), ["Ocio"]);
  assert.deepEqual(visibleCategories(["Ocio"], "", DISPONIBLES), ["Ocio"]);
});
