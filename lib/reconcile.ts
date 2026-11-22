/**
 * Conciliar una cuenta contra el banco.
 *
 * ### El agujero que esto tapa
 *
 * El saldo de una cuenta lo calcula la base sumando lo que la persona
 * anotó. Si se le olvidó anotar un almuerzo, el saldo de la app queda por
 * encima del real y **nada lo dice**: no hay error, no hay aviso, el número
 * simplemente miente un poco más cada semana.
 *
 * Antes la única salida era editar la cuenta y escribir el saldo de hoy, y
 * eso **reescribía el punto de partida en silencio**. O sea que la
 * diferencia no se corregía: se borraba. Quien la usaba justamente para
 * saber a dónde se le va la plata perdía el único dato que contestaba esa
 * pregunta — *cuánto se me está escapando sin registrar*.
 *
 * ### La idea
 *
 * La diferencia **se registra como un movimiento**, no se esconde. Si el
 * banco tiene menos de lo que dice la app, eso es plata que salió y no se
 * anotó: entra como gasto en la categoría "Sin identificar". Si tiene más,
 * entró plata sin registrar y es un ingreso.
 *
 * Así pasan tres cosas de una: el saldo queda igual al del banco, la plata
 * cuenta en los totales del mes (porque de verdad se movió), y el desglose
 * por categoría muestra cuánto se escapa — que es el dato que faltaba.
 *
 * ### La excepción, que importa
 *
 * Hay un caso donde registrar un movimiento **sería mentir**: cuando el que
 * estaba mal era el punto de partida. Una cuenta recién creada a la que se
 * le puso 0 sin pensar no tiene gastos sin registrar; tiene mal el número
 * de arranque. Por eso hay dos salidas y la app propone una según si la
 * cuenta ya tiene movimientos o no.
 */

/**
 * La categoría donde cae lo que no se identificó.
 *
 * **No es una categoría que se pueda elegir en un formulario**: nadie
 * debería anotar un gasto a mano diciendo que no sabe qué es. Aparece sola
 * al conciliar. Pero sí está reservada en `categoryClash`, porque si
 * alguien creara una propia con este nombre habría dos cosas distintas
 * pintadas igual en el desglose.
 */
export const UNIDENTIFIED_CATEGORY = "Sin identificar";

export type ReconcileKind = "cuadra" | "falta" | "sobra";

/** Qué hacer con la diferencia. */
export type ReconcileMode = "registrar" | "punto-de-partida";

export interface Reconciliation {
  /** Banco − app. Negativo es que en el banco hay menos. */
  difference: number;
  kind: ReconcileKind;
  /** Lo que se registraría, si se registra. */
  movement: { type: "INCOME" | "EXPENSE"; amount: number } | null;
}

/**
 * Compara los dos saldos y dice qué significa la diferencia.
 *
 * **Sin tolerancia**: un colón de diferencia es un colón que no está. Una
 * tolerancia "razonable" es justo por donde se cuela el goteo que esto
 * viene a detectar.
 */
export function reconcile(appBalance: number, bankBalance: number): Reconciliation {
  const difference = bankBalance - appBalance;

  if (difference === 0) {
    return { difference: 0, kind: "cuadra", movement: null };
  }

  // En el banco hay menos: salió plata que nadie anotó.
  if (difference < 0) {
    return {
      difference,
      kind: "falta",
      movement: { type: "EXPENSE", amount: Math.abs(difference) },
    };
  }

  // En el banco hay más: entró plata que nadie anotó.
  return {
    difference,
    kind: "sobra",
    movement: { type: "INCOME", amount: difference },
  };
}

/**
 * Qué conviene hacer con la diferencia, según la cuenta.
 *
 * Sin movimientos todavía no hubo nada que olvidar: lo que está mal es el
 * número de arranque. Con movimientos, lo más probable es que falte anotar
 * algo, y ahí registrarlo es lo único que deja rastro.
 *
 * Es una propuesta, no una regla: la persona puede elegir la otra.
 */
export function suggestedMode(movementCount: number): ReconcileMode {
  return movementCount === 0 ? "punto-de-partida" : "registrar";
}

/**
 * El detalle del movimiento de ajuste.
 *
 * Lleva la fecha escrita porque en la lista de movimientos, dentro de dos
 * meses, "Sin identificar" a secas no se distingue de otro: con la fecha se
 * sabe de qué conciliación salió.
 */
export function adjustmentDescription(dayKey: string): string {
  return `Ajuste contra el banco (${dayKey})`;
}
