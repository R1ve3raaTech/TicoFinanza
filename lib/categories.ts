/**
 * Etiquetas por defecto. El usuario puede agregar las suyas desde Ajustes →
 * Categorías (tabla `user_categories`), y las dos listas se combinan en cada
 * formulario: estas no se guardan en la base, así que cambiarlas acá cambia
 * lo que ve todo el mundo sin migración.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  // "Alimentación" faltaba y el súper terminaba cayendo en Vivienda, que
  // mezcla el alquiler con las compras de la semana en el mismo pedazo de
  // la dona.
  "Alimentación",
  "Vivienda",
  "Servicios",
  "Salud",
  "Transporte",
  "Educación",
  "Ocio",
  "Trabajo",
  "Otro",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Salario",
  "Freelance",
  "Otros",
];

/** Categorías de gasto disponibles: las de la app más las del usuario. */
export function expenseCategories(custom: { name: string; type: string }[] = []): string[] {
  return [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...custom.filter((c) => c.type === "EXPENSE").map((c) => c.name),
  ];
}

export function incomeCategories(custom: { name: string; type: string }[] = []): string[] {
  return [
    ...DEFAULT_INCOME_CATEGORIES,
    ...custom.filter((c) => c.type === "INCOME").map((c) => c.name),
  ];
}
