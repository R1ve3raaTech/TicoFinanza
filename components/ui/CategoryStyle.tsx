"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { choiceIndex, type CategoryChoice } from "@/lib/categoryStyle";

const CategoryStyleContext = createContext<Record<string, CategoryChoice>>({});

/**
 * Lo que el usuario eligió para sus categorías (ícono y color), disponible
 * en toda el área con sesión.
 *
 * Va por contexto y no por props porque la marca de categoría se dibuja en
 * sitios muy repartidos —cada fila de movimientos, cada gasto fijo, cada
 * tope, cada chip del formulario— y ninguno de esos componentes tiene por
 * qué recibir la tabla de categorías para pintar un cuadrito.
 *
 * Los datos ya los trae el layout de /dashboard para el diálogo de ajustes:
 * no hay consulta nueva.
 */
export function CategoryStyleProvider({
  categories,
  children,
}: {
  categories: CategoryChoice[];
  children: ReactNode;
}) {
  const index = useMemo(() => choiceIndex(categories), [categories]);
  return (
    <CategoryStyleContext.Provider value={index}>{children}</CategoryStyleContext.Provider>
  );
}

/** Fuera del provider devuelve {}: todo cae al color e ícono automáticos. */
export function useCategoryChoices(): Record<string, CategoryChoice> {
  return useContext(CategoryStyleContext);
}
