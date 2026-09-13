import "server-only";

/**
 * Tipo de cambio en tiempo real hacia colones, para convertir cualquier
 * transacción que llegue en otra moneda (dólares, córdobas, euros, lo que
 * sea) al único saldo que la app maneja. Usa open.er-api.com: gratis, sin
 * API key, sin límite de uso documentado, ~170 monedas — se actualiza una
 * vez al día del lado de ellos, que alcanza de sobra para gasto personal
 * (nadie necesita el tipo de cambio al segundo para saber cuánto costó el
 * almuerzo de ayer).
 *
 * Se pide "USD" como base y se cachea la respuesta completa (todas las
 * monedas de una sola vez) en vez de una request por moneda — así una
 * sincronización de Gmail con varias compras en distintas monedas hace como
 * mucho una sola llamada externa por hora.
 *
 * REGLA DE ORO: esta función nunca inventa un tipo de cambio. Si la API no
 * responde, responde algo sin sentido, o el usuario dejaría el saldo
 * mal por completo — es mejor que la sincronización pierda esa transacción
 * puntual (y la reintente sola en la próxima corrida, ver lib/google/sync.ts)
 * que insertarla con un monto equivocado que nadie va a notar. Antes había un
 * diccionario de respaldo fijo (FALLBACK_USD_PER_UNIT) para justamente este
 * caso — tenía sus valores en la convención inversa a la que usa el resto de
 * la función, así que cuando la API fallaba el monto convertido salía ~1000
 * veces mal, en silencio. Se eliminó por completo en vez de arreglarle la
 * convención: un "respaldo" que puede fallar de esa forma es peor que no
 * tener respaldo.
 */
const BASE_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_SECONDS = 60 * 60;
/** Si la API no contesta en este tiempo, se la da por caída — mejor fallar
 *  rápido y controlado que colgar la sincronización entera. */
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Bandas de sanity check, no tasas para convertir. Ningún monto se calcula
 * con estos números — solo sirven para rechazar una respuesta disparatada de
 * la API (un 0, un NaN, o una tasa que claramente no es la real) antes de
 * usarla. Deliberadamente generosas: no son "la tasa correcta de hoy", son
 * "cualquier cosa fuera de este rango no puede ser una tasa real" para evitar
 * que esto necesite mantenimiento por la variación normal del tipo de
 * cambio. CRC ronda 480-650 por dólar desde hace años; NIO viene
 * devaluándose lento desde ~30.
 */
const SANITY_BANDS: Record<string, readonly [number, number]> = {
  CRC: [200, 1500],
  NIO: [10, 150],
};

/** Se lanza en vez de devolver un monto cuando no hay una tasa confiable.
 *  El llamador (parseEmail -> syncGmailForUser) la deja propagar como un
 *  fallo real de esa transacción puntual, no como "no era un correo
 *  bancario" — así queda visible en los errores de la sincronización y se
 *  reintenta sola la próxima vez, en vez de perderse en silencio. */
export class ExchangeRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeRateError";
  }
}

interface RatesResponse {
  result: string;
  rates: Record<string, number>;
}

function isUsableRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** ¿Esta tasa (unidades de `currency` por 1 USD) tiene pinta de ser real? */
function isSaneRate(currency: string, value: number): boolean {
  const band = SANITY_BANDS[currency];
  if (!band) return true; // sin banda propia, alcanza con ser un número positivo finito
  const [min, max] = band;
  return value >= min && value <= max;
}

async function fetchUsdRates(): Promise<Record<string, number>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(BASE_URL, {
      next: { revalidate: CACHE_SECONDS },
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : (err as Error).message;
    throw new ExchangeRateError(`No se pudo contactar open.er-api.com (${reason})`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ExchangeRateError(`open.er-api.com respondió ${response.status}`);
  }

  let data: RatesResponse;
  try {
    data = (await response.json()) as RatesResponse;
  } catch {
    throw new ExchangeRateError("open.er-api.com devolvió una respuesta que no es JSON válido");
  }

  if (data.result !== "success" || !data.rates || typeof data.rates !== "object") {
    throw new ExchangeRateError("open.er-api.com devolvió una respuesta sin tasas usables");
  }

  if (!isUsableRate(data.rates.CRC)) {
    throw new ExchangeRateError(`open.er-api.com devolvió una tasa de CRC inválida: ${data.rates.CRC}`);
  }
  if (!isSaneRate("CRC", data.rates.CRC)) {
    const [min, max] = SANITY_BANDS.CRC;
    throw new ExchangeRateError(
      `La tasa CRC/USD que devolvió open.er-api.com (${data.rates.CRC}) está fuera del rango esperado (${min}-${max}) — se descarta en vez de convertir con un número que no tiene sentido`
    );
  }

  return data.rates;
}

/**
 * Convierte un monto de `fromCurrency` a colones. Si ya viene en colones,
 * devuelve el monto tal cual (sin llamar a la API — ni acá ni en el
 * llamador hay una segunda conversión posible). El código de moneda no es
 * case-sensitive y acepta variantes comunes ("NIC" además de "NIO", el
 * código real ISO 4217 del córdoba).
 *
 * Tira ExchangeRateError (nunca devuelve un monto inventado) si la API no
 * responde, responde algo sin forma, o la tasa de la moneda pedida no tiene
 * sentido.
 */
export async function convertToCRC(amount: number, fromCurrency: string): Promise<number> {
  const currency = normalizeCurrencyCode(fromCurrency);
  if (currency === "CRC") return amount;

  const usdRates = await fetchUsdRates();

  const currencyPerUsd = usdRates[currency];
  if (!isUsableRate(currencyPerUsd)) {
    throw new ExchangeRateError(`open.er-api.com no tiene una tasa válida para "${currency}"`);
  }
  if (!isSaneRate(currency, currencyPerUsd)) {
    const [min, max] = SANITY_BANDS[currency];
    throw new ExchangeRateError(
      `La tasa de "${currency}" que devolvió open.er-api.com (${currencyPerUsd}) está fuera del rango esperado (${min}-${max})`
    );
  }

  // amount está en `currency`; se pasa a USD y de ahí a CRC.
  const amountInUsd = amount / currencyPerUsd;
  const amountInCrc = amountInUsd * usdRates.CRC;

  if (!Number.isFinite(amountInCrc)) {
    // No debería poder pasar (ya se validaron ambas tasas y amount viene de
    // un regex numérico), pero si pasa no se inserta un NaN/Infinity a la base.
    throw new ExchangeRateError(`La conversión de ${amount} ${currency} a CRC no dio un número válido`);
  }

  return Math.round(amountInCrc);
}

function normalizeCurrencyCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  // "NIC" es como el resto del código históricamente llamaba al córdoba;
  // "NIO" es el código ISO 4217 real, que es el que usan las APIs de tipo
  // de cambio.
  if (upper === "NIC") return "NIO";
  return upper;
}
