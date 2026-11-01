import { daysInMonth } from "./fixedExpenses";

/**
 * Períodos de calendario, no ventanas móviles.
 *
 * Antes eran "últimos 1/3/7/15/30 días", que no es como nadie piensa su
 * plata: uno pregunta "¿cuánto llevo este mes?", no "¿cuánto gasté en los
 * últimos 30 días". Con el mes corrido, el 2 de noviembre el período
 * arrancaba el 3 de octubre y mezclaba dos meses.
 */
export type PeriodId = "todo" | "hoy" | "semana" | "mes" | "mes-pasado" | "anio";

export const PERIODS: { id: PeriodId; label: string; short: string }[] = [
  { id: "todo", label: "Todo", short: "Todo" },
  { id: "hoy", label: "Hoy", short: "Hoy" },
  { id: "semana", label: "Esta semana", short: "Semana" },
  { id: "mes", label: "Este mes", short: "Mes" },
  { id: "mes-pasado", label: "Mes pasado", short: "Mes pasado" },
  { id: "anio", label: "Este año", short: "Año" },
];

function isPeriodId(value: string | undefined): value is PeriodId {
  return PERIODS.some((p) => p.id === value);
}

function parts(key: string): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y, m, d];
}

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Lunes de la semana de `todayKey`. Acá la semana empieza el lunes. */
function mondayOf(todayKey: string): string {
  const [y, m, d] = parts(todayKey);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(y, m - 1, d - weekday));
  return monday.toISOString().slice(0, 10);
}

/**
 * El rango de un período, en claves de día. `null` para "todo".
 *
 * Los períodos de mes y año van completos (del 1 al último día), no hasta
 * hoy: un movimiento con fecha futura dentro del mes es válido —una
 * transferencia programada, un pago que ya se sabe— y recortar en hoy lo
 * escondería.
 */
export function periodRange(id: PeriodId, todayKey: string): { from: string; to: string } | null {
  const [year, month] = parts(todayKey);

  switch (id) {
    case "todo":
      return null;
    case "hoy":
      return { from: todayKey, to: todayKey };
    case "semana":
      return { from: mondayOf(todayKey), to: todayKey };
    case "mes":
      return { from: key(year, month, 1), to: key(year, month, daysInMonth(year, month)) };
    case "mes-pasado": {
      const prev = new Date(Date.UTC(year, month - 2, 1));
      const py = prev.getUTCFullYear();
      const pm = prev.getUTCMonth() + 1;
      return { from: key(py, pm, 1), to: key(py, pm, daysInMonth(py, pm)) };
    }
    case "anio":
      return { from: key(year, 1, 1), to: key(year, 12, 31) };
  }
}

/**
 * Costa Rica está en UTC−6 todo el año: no hay horario de verano desde 1992,
 * así que el desfase se puede escribir fijo sin que se desajuste en marzo.
 *
 * Va explícito y no implícito: sin el offset, `new Date("2026-11-01T00:00")`
 * se interpreta en la zona del servidor, que en Vercel es UTC. Los límites
 * del período quedaban corridos seis horas — "este mes" arrancaba a las 6 de
 * la tarde del 31 del mes anterior y se perdía las últimas seis horas del 30.
 */
const CR_OFFSET = "-06:00";

/** Convierte "YYYY-MM-DD" al final de ese día en Costa Rica, para `lte`. */
export function endOfDayISO(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59.999${CR_OFFSET}`).toISOString();
}

/** Convierte "YYYY-MM-DD" al inicio de ese día en Costa Rica, para `gte`. */
export function startOfDayISO(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000${CR_OFFSET}`).toISOString();
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface ResolvedPeriod {
  /** Qué chip queda marcado. */
  id: PeriodId | "personalizado";
  /** Límite inferior para `gte`, o null si no hay (se ve todo). */
  fromISO: string | null;
  /** Límite superior para `lte`, o null. */
  toISO: string | null;
  /** Lo que dice el encabezado de la pantalla. */
  label: string;
  /** Query string para el CSV, para que exporte exactamente lo que se ve. */
  csvQuery: string;
}

/**
 * El período de la lista de movimientos, a partir de la URL.
 *
 * Se resuelve **en el servidor**, en hora de Costa Rica: el navegador solo
 * manda `?periodo=hoy`. Si "hoy" lo calculara el cliente, la versión
 * anterior (que usaba `toISOString()`, o sea UTC) mandaba al futuro a
 * cualquiera que abriera la app después de las 6 de la tarde.
 *
 * **Sin período en la URL se ve TODO, no el mes en curso.** Antes el filtro
 * marcaba "Todo" por defecto pero la consulta recortaba igual al día 1 del
 * mes: un movimiento del mes pasado se guardaba bien y no aparecía en ningún
 * lado, así que parecía que no se había guardado.
 */
export function resolvePeriod(
  params: { periodo?: string; from?: string; to?: string },
  todayKey: string
): ResolvedPeriod {
  const from = params.from && DAY_PATTERN.test(params.from) ? params.from : null;
  const to = params.to && DAY_PATTERN.test(params.to) ? params.to : null;

  // Un rango escrito a mano manda sobre el período: es lo último que tocó
  // la persona.
  if (from && to) return build("personalizado", from, to, `${dayLabel(from)} – ${dayLabel(to)}`);

  const id: PeriodId = isPeriodId(params.periodo) ? params.periodo : "todo";
  const range = periodRange(id, todayKey);
  if (!range) return build("todo", null, null, "todo tu historial");

  const labels: Record<Exclude<PeriodId, "todo">, string> = {
    hoy: "hoy",
    semana: "esta semana",
    mes: "este mes",
    "mes-pasado": "el mes pasado",
    anio: "este año",
  };
  return build(id, range.from, range.to, labels[id as Exclude<PeriodId, "todo">]);
}

function build(
  id: ResolvedPeriod["id"],
  from: string | null,
  to: string | null,
  label: string
): ResolvedPeriod {
  const csv = new URLSearchParams();
  if (from) csv.set("from", from);
  if (to) csv.set("to", to);
  return {
    id,
    fromISO: from ? startOfDayISO(from) : null,
    toISO: to ? endOfDayISO(to) : null,
    label,
    csvQuery: csv.toString(),
  };
}

const shortDay = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" });

/** "YYYY-MM-DD" a "3 sep". Mediodía, para que ningún huso lo corra de día. */
export function dayLabel(key: string): string {
  return shortDay.format(new Date(`${key}T12:00:00`));
}
