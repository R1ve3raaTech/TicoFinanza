function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function presetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toDateKey(from), to: toDateKey(to) };
}

export const DATE_RANGE_PRESETS = [
  { label: "1 día", days: 1 },
  { label: "3 días", days: 3 },
  { label: "Semana", days: 7 },
  { label: "15 días", days: 15 },
  { label: "Mes", days: 30 },
] as const;

/** Convierte "YYYY-MM-DD" al final de ese día en ISO, para usar con `lte`. */
export function endOfDayISO(dateKey: string): string {
  const d = new Date(`${dateKey}T23:59:59.999`);
  return d.toISOString();
}

/** Convierte "YYYY-MM-DD" al inicio de ese día en ISO, para usar con `gte`. */
export function startOfDayISO(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000`);
  return d.toISOString();
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface MovementsRange {
  /** Límite inferior para `gte`, o null si no hay (se ve todo). */
  fromISO: string | null;
  /** Límite superior para `lte`, o null. */
  toISO: string | null;
  /** Lo que dice el encabezado de la pantalla. */
  label: string;
  /** Query string para el CSV, para que exporte lo mismo que se ve. */
  csvQuery: string;
}

/**
 * El período de la lista de movimientos, a partir de la URL.
 *
 * **Sin rango en la URL se ve TODO, no el mes en curso.** Antes el filtro
 * marcaba "Todo" por defecto pero la consulta recortaba igual al día 1 del
 * mes: un movimiento con fecha del mes pasado se guardaba bien y no aparecía
 * en ningún lado, así que parecía que no se había guardado. Es la clase de
 * error que hace desconfiar de la app entera, y por eso el caso por defecto
 * ahora no filtra nada.
 */
export function movementsRange(params: { from?: string; to?: string }): MovementsRange {
  const from = params.from && DAY_PATTERN.test(params.from) ? params.from : null;
  const to = params.to && DAY_PATTERN.test(params.to) ? params.to : null;

  const csv = new URLSearchParams();
  if (from) csv.set("from", from);
  if (to) csv.set("to", to);

  return {
    fromISO: from ? startOfDayISO(from) : null,
    toISO: to ? endOfDayISO(to) : null,
    label: from && to ? `${dayLabel(from)} – ${dayLabel(to)}` : "todo tu historial",
    csvQuery: csv.toString(),
  };
}

const shortDay = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" });

/** "YYYY-MM-DD" a "3 sep". Mediodía, para que ningún huso lo corra de día. */
export function dayLabel(key: string): string {
  return shortDay.format(new Date(`${key}T12:00:00`));
}
