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

/** Las que trae la app para un tipo de movimiento. */
export function defaultCategories(type: "EXPENSE" | "INCOME"): string[] {
  return type === "INCOME" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
}

/**
 * Por qué no se puede agregar esta categoría, o null si se puede.
 *
 * El índice único de `user_categories` compara el texto tal cual, así que
 * sin esto "Ferretería" y "ferreteria" entran las dos y quedan dos chips
 * que dicen lo mismo en cada formulario. Peor todavía con una que ya trae
 * la app: las dos listas se concatenan al mostrarlas, así que agregar
 * "ocio" dejaba "Ocio" dos veces sin que la base se quejara.
 *
 * La comparación es sin tildes y sin mayúsculas: quien escribe "ferreteria"
 * a las apuradas se refiere a la que ya tiene.
 */
export function categoryClash(
  name: string,
  type: "EXPENSE" | "INCOME",
  existing: string[]
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Escribí un nombre para la categoría.";
  if (trimmed.length > 24) return "El nombre es muy largo: máximo 24 caracteres.";

  const key = fold(trimmed);
  if (defaultCategories(type).some((c) => fold(c) === key)) {
    return `"${trimmed}" ya viene con la app.`;
  }
  if (existing.some((c) => fold(c) === key)) {
    return `Ya tenés una categoría que se llama así.`;
  }
  return null;
}

/** Sin tildes, sin mayúsculas, sin espacios de sobra. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}
