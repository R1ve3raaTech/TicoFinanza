/**
 * El campo de monto, en una sola pieza.
 *
 * Antes cada diálogo tenía un `<input>` de texto con `inputMode="decimal"` y
 * nada más: se podían escribir letras (inputMode es una sugerencia al teclado
 * del teléfono, no una validación), y los miles había que ponerlos a mano.
 * Un monto largo sin separar —"1250000"— no se lee: hay que contar los ceros
 * de a tres con el dedo en la pantalla.
 *
 * Acá vive la regla: solo dígitos, y los miles se agrupan al escribir.
 *
 * **El separador de miles es el punto** y el decimal la coma ("1.250.000,50"),
 * que es como se escribe la plata en Costa Rica y, sobre todo, es lo que ya
 * muestra toda la app (`formatMoney` en lib/format.ts). Si el campo agrupara
 * con coma, lo que uno escribe y lo que la lista muestra dos líneas abajo
 * serían dos formatos distintos para el mismo monto.
 */

/** Separador de miles: el que usa `formatMoney` en toda la app. */
export const GROUP_SEPARATOR = ".";
/** Separador decimal. */
export const DECIMAL_SEPARATOR = ",";

const MAX_DECIMALS = 2;

/** Agrupa de a tres de derecha a izquierda: "1250000" → "1.250.000". */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/**
 * Lo escrito en el campo → el texto que queda en el campo.
 *
 * Tira todo lo que no sea un dígito o una coma, agrupa los miles y recorta a
 * dos decimales. Los puntos que venga escribiendo la persona se ignoran: los
 * pone esta función, así que aceptarlos además como dato significaría que
 * "1.2" valiera 12 un rato y 1,2 otro.
 *
 * Es la misma limpieza para lo que se teclea y para lo que se pega, que es
 * justo el caso por el que `inputMode` no alcanza: pegar "₡ 12 500 colones"
 * deja "12.500".
 */
export function typedAmount(raw: string, allowNegative = false): string {
  // El menos solo cuenta al principio y solo donde un monto puede ser
  // negativo: el saldo de una tarjeta de crédito. En un gasto o un ingreso el
  // signo lo da el tipo de movimiento, así que ahí un "-" escrito a mano
  // haría que el monto dijera lo contrario de lo que la persona eligió.
  const negative = allowNegative && raw.trimStart().startsWith("-");
  const sign = negative ? "-" : "";
  // El punto se descarta acá y no en el reemplazo general para dejar escrito
  // que es deliberado: es separador de miles, no un decimal a la inglesa.
  const clean = raw.replace(/[^\d,]/g, "");
  const [whole, ...rest] = clean.split(DECIMAL_SEPARATOR);
  const digits = whole.replace(/^0+(?=\d)/, "");
  const grouped = group(digits);

  // Sin coma escrita no hay parte decimal que mostrar. Con coma al final
  // ("12.500,") se deja tal cual: la persona está en mitad de escribir.
  if (rest.length === 0) return `${sign}${grouped}`;
  const decimals = rest.join("").slice(0, MAX_DECIMALS);
  return `${sign}${grouped || "0"}${DECIMAL_SEPARATOR}${decimals}`;
}

/**
 * Texto del campo → número.
 *
 * Acepta tanto "12.500" (puntos de miles) como "12,5". Un campo vacío da 0,
 * y lo que no se puede leer como número da NaN — quien llama decide qué
 * hacer con eso (todos los diálogos lo tratan como "monto inválido").
 */
export function parseAmount(value: string): number {
  const clean = value.replace(/\./g, "").replace(DECIMAL_SEPARATOR, ".");
  if (clean.trim() === "") return 0;
  return Number(clean);
}

/**
 * Monto guardado → texto del campo, para abrir un diálogo de edición con lo
 * que ya estaba ("185.000" y no "185000"). Lo lee `parseAmount` sin cambios.
 */
export function formatAmountInput(amount: number): string {
  const [whole, decimals] = String(amount).split(".");
  const grouped = group(whole.replace("-", ""));
  const sign = amount < 0 ? "-" : "";
  return decimals ? `${sign}${grouped}${DECIMAL_SEPARATOR}${decimals}` : `${sign}${grouped}`;
}

/** Cuántos dígitos hay en un texto (los separadores no cuentan). */
export function countDigits(text: string): number {
  return (text.match(/\d/g) ?? []).length;
}

/**
 * Dónde dejar el cursor después de reformatear.
 *
 * Al agrupar, el texto crece debajo del cursor: escribir "1234" lo vuelve
 * "1.234" y el cursor tiene que quedar después del 4, no corrido un lugar.
 * La cuenta se hace en dígitos —que son lo que la persona escribió— y no en
 * posiciones del texto, que incluyen puntos que nadie tecleó.
 *
 * Sin esto, editar en el medio de un monto manda el cursor al final en cada
 * tecla.
 */
export function caretAfterDigits(text: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) {
      seen += 1;
      if (seen === digits) return i + 1;
    }
  }
  return text.length;
}
