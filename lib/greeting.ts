import { formatMoney } from "./format";
import type { MonthSummary } from "./insights";

/**
 * El saludo y la frase de arriba del resumen.
 *
 * Existen porque la pantalla abría con cuatro cifras y nada que las
 * interpretara: hay que saber restar ingresos menos gastos para contestar la
 * única pregunta que uno trae al abrir la app, que es "¿cómo vengo?". Esto
 * la contesta en una línea, con los números de la persona.
 */

/** Franja del día en hora de Costa Rica (la hora la resuelve el servidor). */
export function greetingForHour(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function greeting(hour: number, firstName?: string): string {
  const base = greetingForHour(hour);
  return firstName ? `${base}, ${firstName}` : base;
}

export interface MonthHeadline {
  /** Cómo viene el mes, en una oración. */
  text: string;
  /** Lo que todavía falta pagar de fijos, si queda algo. */
  pending: string | null;
}

/**
 * Cómo viene el mes, escrito. `null` cuando no hay nada anotado: en una
 * cuenta vacía la frase sería "estás justo", que suena a conclusión cuando
 * en realidad no hay datos.
 */
export function monthHeadline(
  summary: MonthSummary,
  pendingFixed: number
): MonthHeadline | null {
  const movedAnything =
    summary.income > 0 || summary.fixedExpenses > 0 || summary.variableExpenses > 0;
  if (!movedAnything) return null;

  const pending =
    pendingFixed > 0 ? `Te faltan ${formatMoney(pendingFixed)} de gastos fijos por pagar.` : null;

  if (summary.income === 0) {
    return {
      text: `Llevás ${formatMoney(summary.fixedExpenses + summary.variableExpenses)} de gastos y ningún ingreso anotado.`,
      pending,
    };
  }
  if (summary.net > 0) {
    return { text: `Vas ${formatMoney(summary.net)} arriba este mes.`, pending };
  }
  if (summary.net < 0) {
    return {
      text: `Vas ${formatMoney(Math.abs(summary.net))} abajo: estás gastando más de lo que entra.`,
      pending,
    };
  }
  return { text: "Estás justo: lo que entró es exactamente lo que salió.", pending };
}
