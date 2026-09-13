import { convertToCRC } from "@/lib/exchangeRate";
import { parseBacCardPurchase } from "./bacCardPurchase";
import { parseBacTransfer } from "./bacTransfer";
import { parseBcrCardPurchase } from "./bcrCardPurchase";
import { parseBcrSinpe } from "./bcrSinpe";
import { parseBnCardPurchase } from "./bnCardPurchase";
import { parseBpCardPurchase } from "./bpCardPurchase";
import { parseBpServicePayment } from "./bpServicePayment";
import { parseDaviviendaCardPurchase } from "./daviviendaCardPurchase";
import { parseInternalTransfer } from "./internalTransfer";
import { parseMucapCardPurchase } from "./mucapCardPurchase";
import { parseMucapSinpe } from "./mucapSinpe";
import { parsePayPal } from "./paypal";
import { parseSinpeMovil } from "./sinpeMovil";
import type { EmailContext, EmailParser, ParsedTransaction } from "./types";

const parsers: EmailParser[] = [
  parseInternalTransfer,
  parseBacTransfer,
  parseSinpeMovil,
  parseMucapSinpe,
  parseMucapCardPurchase,
  parseBcrSinpe,
  parseBpServicePayment,
  parseBacCardPurchase,
  parseBpCardPurchase,
  parseDaviviendaCardPurchase,
  parseBnCardPurchase,
  parseBcrCardPurchase,
  parsePayPal,
];

/** Lo que devuelve parseEmail(): igual que lo que arma cada parser, pero con
 *  la moneda ya resuelta — siempre colones, la única que la app guarda. */
export interface ConvertedTransaction extends Omit<ParsedTransaction, "currency"> {
  currency: "CRC";
}

/**
 * Prueba cada parser conocido contra el cuerpo del correo hasta que uno
 * matchee, y si la transacción vino en otra moneda (dólares, córdobas,
 * euros, lo que sea) la convierte a colones con el tipo de cambio del día
 * antes de devolverla — ver lib/exchangeRate.ts. Así ningún parser
 * individual necesita saber de tipos de cambio: solo reporta la moneda cruda
 * que trae el correo del banco.
 *
 * Si el correo matchea un parser pero la conversión de moneda falla
 * (ExchangeRateError — API caída, tasa inválida, lo que sea), esta función
 * NO atrapa el error ni devuelve null: lo deja propagar. Un `null` acá
 * significa "este correo no es una transacción que reconozcamos", y un
 * correo que SÍ matcheó pero no se pudo convertir es un caso distinto —
 * el llamador (syncGmailForUser) necesita poder diferenciarlos para loguear
 * el fallo real y reintentar en la próxima sincronización, en vez de que se
 * pierda en silencio mezclado con los correos que simplemente no eran nada.
 */
export async function parseEmail(
  bodyText: string,
  ctx: EmailContext
): Promise<ConvertedTransaction | null> {
  for (const parser of parsers) {
    const result = parser(bodyText, ctx);
    if (!result) continue;

    if (result.currency === "CRC") {
      return { ...result, currency: "CRC" };
    }

    const amount = await convertToCRC(result.amount, result.currency);
    return { ...result, amount, currency: "CRC" };
  }
  return null;
}

/**
 * Dominios de correo bancario conocidos, usados para armar la query de
 * búsqueda de Gmail. Agregar acá cuando se sumen más bancos.
 */
export const KNOWN_BANK_SENDERS = [
  "bpdc.fi.cr",
  "bancopopularinforma.fi.cr",
  "baccredomatic.com",
  "notificacionesbaccr.com",
  "intl.paypal.com",
  "davibank.cr",
  "mucap.fi.cr",
  "bncr.fi.cr",
  "bancobcr.com",
];

export function buildGmailQuery(days = 3): string {
  const fromClause = KNOWN_BANK_SENDERS.map((domain) => `from:${domain}`).join(
    " OR "
  );
  return `(${fromClause}) newer_than:${days}d`;
}
