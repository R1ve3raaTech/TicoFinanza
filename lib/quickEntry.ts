import type { Transaction, TransactionType } from "./types";

/**
 * "Lo de siempre": los movimientos que repetís, listos para anotar de un
 * toque.
 *
 * Lo más rápido no es escribir rápido, es no escribir. El almuerzo, el bus y
 * el café son el mismo monto y la misma categoría semana tras semana, y hoy
 * hay que teclearlos enteros cada vez.
 *
 * Sale de los movimientos recientes que la pantalla **ya trae** para adivinar
 * la categoría (`lib/smartMatch.ts`): no hay consulta nueva.
 */

export interface QuickEntry {
  /** La descripción tal como se escribió la última vez. */
  description: string;
  amount: number;
  category: string | null;
  accountId: string | null;
  /** Cuántas veces aparece. Es lo que ordena la lista. */
  times: number;
}

/** Entrada mínima: lo que hace falta para rellenar el formulario. */
export type RecentMovement = Pick<
  Transaction,
  "description" | "category" | "account_id" | "transaction_date" | "amount" | "type"
>;

/** Sin tildes, sin mayúsculas y sin espacios de sobra. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const MIN_TIMES = 2;

/**
 * Los más repetidos de un tipo, del más repetido al menos.
 *
 * **Hacen falta al menos dos apariciones.** Con una sola, la fila serían los
 * últimos movimientos y no los habituales: ofrecería repetir el regalo de
 * cumpleaños que se compra una vez al año.
 *
 * **Manda el monto más reciente**, no el más repetido ni un promedio: si el
 * almuerzo subió de ₡3.000 a ₡3.500, lo que vale es el precio de ahora. El
 * promedio daría un número que nunca se pagó.
 *
 * Los que no tienen descripción quedan fuera: un botón que diga "Gasto
 * ₡2.500" no le dice a nadie qué era.
 */
export function frequentEntries(
  recent: RecentMovement[],
  type: TransactionType,
  limit = 3
): QuickEntry[] {
  const groups = new Map<string, QuickEntry & { lastAt: number }>();

  for (const movement of recent) {
    if (movement.type !== type) continue;
    const description = movement.description?.trim();
    if (!description) continue;

    const key = fold(description);
    const at = new Date(movement.transaction_date).getTime();
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        description,
        amount: movement.amount,
        category: movement.category,
        accountId: movement.account_id,
        times: 1,
        lastAt: at,
      });
      continue;
    }

    existing.times += 1;
    // El más nuevo manda en monto, categoría y cuenta. La lista puede venir
    // en cualquier orden, así que se compara la fecha en vez de confiar en
    // que el primero sea el último.
    if (at > existing.lastAt) {
      existing.lastAt = at;
      existing.description = description;
      existing.amount = movement.amount;
      existing.category = movement.category;
      existing.accountId = movement.account_id;
    }
  }

  return [...groups.values()]
    .filter((entry) => entry.times >= MIN_TIMES && entry.amount > 0)
    .sort((a, b) => b.times - a.times || b.lastAt - a.lastAt)
    .slice(0, limit)
    .map((entry) => ({
      description: entry.description,
      amount: entry.amount,
      category: entry.category,
      accountId: entry.accountId,
      times: entry.times,
    }));
}
