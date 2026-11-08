/**
 * A qué color y a qué ícono corresponde cada categoría.
 *
 * Las listas de adentro (fijos, movimientos, topes) eran filas de texto gris
 * una debajo de otra: para encontrar "el recibo del agua" había que leer
 * nombre por nombre. Con una marca de color por categoría la vista la
 * encuentra sin leer.
 *
 * El color es **identidad, no dato**: nunca va solo, siempre con el ícono y
 * el nombre escrito al lado (ver el comentario de los tokens `--cat-*` en
 * app/globals.css, que explica por qué estos tonos no sirven como paleta de
 * gráfico).
 *
 * Esto es presentación pura y no toca la base: la categoría se sigue
 * guardando como el texto que es. Agregar una categoría propia desde Ajustes
 * no necesita elegir color — se le asigna uno solo, estable, a partir del
 * nombre.
 */

export type CategoryTone =
  | "naranja"
  | "indigo"
  | "celeste"
  | "cian"
  | "azul"
  | "violeta"
  | "fucsia"
  | "pizarra"
  | "piedra"
  | "verde";

/** El verde queda fuera de la rueda: es de las categorías de ingreso. */
const WHEEL: CategoryTone[] = [
  "naranja",
  "indigo",
  "celeste",
  "cian",
  "azul",
  "violeta",
  "fucsia",
  "pizarra",
];

/**
 * Las que trae la app. Los tonos están repartidos para que dos categorías
 * que suelen ir seguidas en una lista no queden del mismo color.
 */
const KNOWN: Record<string, CategoryTone> = {
  // Gasto
  alimentacion: "naranja",
  vivienda: "indigo",
  servicios: "celeste",
  salud: "cian",
  transporte: "azul",
  educacion: "violeta",
  ocio: "fucsia",
  trabajo: "pizarra",
  otro: "piedra",
  // Ingreso: acá el verde sí corresponde.
  salario: "verde",
  freelance: "verde",
  otros: "piedra",
};

/** Sin tildes, sin mayúsculas y sin espacios de sobra. */
export function normalizeCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Tono de una categoría escrita por el usuario.
 *
 * Es un hash del nombre y no el orden en la lista: si fuera por orden,
 * borrar una categoría le cambiaría el color a todas las de abajo y el
 * historial dejaría de reconocerse.
 */
function hashTone(name: string): CategoryTone {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100_000;
  }
  return WHEEL[hash % WHEEL.length];
}

export function categoryTone(category: string | null | undefined): CategoryTone {
  if (!category || !category.trim()) return "piedra";
  const key = normalizeCategory(category);
  return KNOWN[key] ?? hashTone(key);
}

/** Lo que el usuario eligió para una categoría suya, si eligió algo. */
export interface CategoryChoice {
  name: string;
  icon: string | null;
  color: string | null;
}

const TONES: CategoryTone[] = [...WHEEL, "piedra", "verde"];

export function isCategoryTone(value: string | null | undefined): value is CategoryTone {
  return typeof value === "string" && (TONES as string[]).includes(value);
}

/** Los diez tonos, en el orden en que se muestran en el selector. */
export const CATEGORY_TONES: CategoryTone[] = TONES;

/**
 * Índice por nombre normalizado de lo que el usuario eligió.
 *
 * La clave es el nombre y no el id porque las listas de la app (movimientos,
 * fijos, topes) guardan la categoría como texto: un movimiento no apunta a
 * la fila de `user_categories`, trae el nombre escrito.
 */
export function choiceIndex(categories: CategoryChoice[]): Record<string, CategoryChoice> {
  const index: Record<string, CategoryChoice> = {};
  for (const category of categories) {
    if (!category.icon && !category.color) continue;
    index[normalizeCategory(category.name)] = category;
  }
  return index;
}

/**
 * El tono final de una categoría: el elegido si hay uno válido, y si no el
 * automático. Un valor guardado que ya no exista en la paleta (porque se
 * renombró un tono) cae al automático en vez de quedarse sin color.
 */
export function resolvedTone(
  category: string | null | undefined,
  choices: Record<string, CategoryChoice> = {}
): CategoryTone {
  const chosen = category ? choices[normalizeCategory(category)]?.color : null;
  return isCategoryTone(chosen) ? chosen : categoryTone(category);
}

/** El ícono elegido, o null para que decida la app. */
export function resolvedIcon(
  category: string | null | undefined,
  choices: Record<string, CategoryChoice> = {}
): string | null {
  if (!category) return null;
  return choices[normalizeCategory(category)]?.icon ?? null;
}
