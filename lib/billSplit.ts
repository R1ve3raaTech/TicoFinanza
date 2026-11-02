/**
 * Calculadora de cuenta: impuesto, servicio y división entre varios.
 *
 * El orden importa y es el de una factura tica: sobre el consumo se agrega
 * el 10 % de servicio, y el IVA del 13 % se calcula sobre la suma de los
 * dos, no solo sobre el consumo. Hacerlo al revés da unos cientos de
 * colones de menos y es el error clásico al dividir la cuenta a mano.
 */

export const IVA_RATE = 0.13;
export const SERVICE_RATE = 0.1;

export interface BillInput {
  /** El consumo, antes de impuesto y servicio. */
  base: number;
  service: boolean;
  tax: boolean;
  /** Entre cuántos se divide. 1 es "no dividir". */
  people: number;
}

export interface BillResult {
  base: number;
  service: number;
  tax: number;
  total: number;
  /** Lo que le toca a cada uno, redondeado a colones. */
  perPerson: number;
  /**
   * Lo que te queda a vos si cobrás a los demás: el total menos lo que te
   * van a devolver. Es el monto que de verdad sale de tu bolsillo, y por
   * eso es el que se registra como gasto.
   */
  yours: number;
  people: number;
}

/** Redondeo a colones: acá no circulan los céntimos. */
function colones(value: number): number {
  return Math.round(value);
}

export function splitBill({ base, service, tax, people }: BillInput): BillResult {
  const safeBase = Number.isFinite(base) && base > 0 ? base : 0;
  const safePeople = Number.isInteger(people) && people > 0 ? people : 1;

  const serviceAmount = service ? safeBase * SERVICE_RATE : 0;
  const taxable = safeBase + serviceAmount;
  const taxAmount = tax ? taxable * IVA_RATE : 0;
  const total = taxable + taxAmount;

  const perPerson = colones(total / safePeople);

  return {
    base: colones(safeBase),
    service: colones(serviceAmount),
    tax: colones(taxAmount),
    total: colones(total),
    perPerson,
    // Tu parte es el total menos lo que cobrás, no `perPerson`: así los
    // colones del redondeo quedan de tu lado y la suma cierra exacta.
    yours: colones(total) - perPerson * (safePeople - 1),
    people: safePeople,
  };
}

/** El texto que se manda por SINPE al pedir la plata. */
export function splitMessage(result: BillResult, what?: string): string {
  const amount = result.perPerson.toLocaleString("de-DE");
  const detail = what?.trim() ? ` de ${what.trim()}` : "";
  return `Te toca ₡${amount}${detail} (cuenta de ₡${result.total.toLocaleString(
    "de-DE"
  )} entre ${result.people}).`;
}
