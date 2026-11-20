import type { RecentMovement } from "./quickEntry";
import type { TransactionType } from "./types";

/** Cuántas se ofrecen a la mano antes de abrir la lista completa. */
export const RECENT_CATEGORY_COUNT = 4;

/**
 * Las categorías que usaste más recientemente, de la más nueva a la más
 * vieja y sin repetir.
 *
 * **Por qué recientes y no todas:** el formulario mostraba las diez o
 * quince categorías desparramadas en chips, y había que leerlas todas para
 * encontrar la de siempre. En la práctica uno repite cuatro o cinco; las
 * demás son de una vez al mes. Con las recientes a la mano, anotar un
 * almuerzo es un toque, y el resto vive detrás de un botón.
 *
 * **Recientes y no "las que más usás"**: el orden por frecuencia se queda
 * pegado al pasado —una categoría que usaste mucho en marzo seguiría
 * primera en noviembre— y además se mueve poco, así que la posición de cada
 * chip cambiaría sin que se note por qué. Lo reciente sigue a lo que estás
 * haciendo ahora.
 *
 * `available` es la lista que el formulario puede ofrecer: una categoría
 * borrada después de haberla usado no tiene que volver por esta puerta.
 */
export function recentCategories(
  recent: RecentMovement[],
  type: TransactionType,
  available: string[],
  limit = RECENT_CATEGORY_COUNT
): string[] {
  const permitidas = new Set(available);
  const vistas = new Set<string>();
  const salida: string[] = [];

  for (const movement of recent) {
    if (movement.type !== type) continue;
    const category = movement.category;
    if (!category || vistas.has(category) || !permitidas.has(category)) continue;
    vistas.add(category);
    salida.push(category);
    if (salida.length === limit) break;
  }

  return salida;
}

/**
 * Los chips que se dibujan sin abrir nada: las recientes, más la elegida si
 * no estuviera entre ellas.
 *
 * Lo segundo importa al **editar** un movimiento viejo: su categoría puede
 * no ser ninguna de las cuatro últimas, y sin esto el formulario abriría
 * sin ningún chip marcado — como si no tuviera categoría.
 */
export function visibleCategories(recent: string[], selected: string, available: string[]): string[] {
  if (!selected || !available.includes(selected)) return recent;
  if (recent.includes(selected)) return recent;
  return [selected, ...recent];
}
