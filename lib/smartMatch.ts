import type { Transaction } from "./types";

/**
 * Adivina la categoría y la cuenta de un movimiento a partir de lo que se
 * escribe en la descripción.
 *
 * Dos fuentes, en este orden:
 *
 * 1. **Tu propio historial.** Si "Auto Mercado" lo pusiste tres veces en
 *    Alimentación pagando con la cuenta del banco, la cuarta vez eso es lo
 *    que corresponde — por encima de cualquier lista que traiga la app.
 * 2. **Una lista de comercios conocidos de Costa Rica**, para que la primera
 *    vez tampoco arranque en blanco.
 *
 * Nunca escribe nada sola: devuelve una sugerencia que el formulario aplica
 * y la persona puede cambiar de un toque. Una categoría adivinada mal y
 * guardada en silencio ensucia los gráficos sin que nadie se entere.
 */

/** Minúsculas y sin tildes, para que "Palí" y "pali" sean lo mismo. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Comercios y servicios frecuentes en Costa Rica. Las claves van
 * normalizadas: se comparan contra la descripción ya normalizada.
 */
const KEYWORDS: { category: string; words: string[] }[] = [
  {
    category: "Alimentación",
    words: [
      "auto mercado", "automercado", "pali", "maxi pali", "mas x menos", "masxmenos",
      "walmart", "pricesmart", "price smart", "fresh market", "super", "supermercado",
      "megasuper", "perimercados", "verduleria", "carniceria", "panaderia", "feria",
    ],
  },
  {
    category: "Transporte",
    words: [
      "uber", "didi", "indriver", "taxi", "gasolina", "combustible", "servicentro",
      "recope", "delta", "parqueo", "peaje", "riteve", "dekra", "marchamo", "bus",
    ],
  },
  {
    category: "Ocio",
    words: [
      "netflix", "spotify", "disney", "hbo", "max", "prime video", "crunchyroll",
      "cine", "cinemark", "nova cinemas", "steam", "playstation", "xbox", "nintendo",
      "restaurante", "mcdonald", "kfc", "pizza", "rostipollos", "subway", "starbucks",
      "britt", "bar", "cerveza",
    ],
  },
  {
    category: "Servicios",
    words: [
      "ice", "kolbi", "movistar", "claro", "liberty", "cabletica", "tigo",
      "aya", "acueductos", "cnfl", "coopelesca", "esph", "jasec",
      "internet", "electricidad", "luz", "agua", "telefono", "cable",
    ],
  },
  {
    category: "Salud",
    words: [
      "farmacia", "fischel", "sucre", "la bomba", "clinica", "hospital", "ccss",
      "ebais", "dentista", "odontolog", "optica", "laboratorio", "medico",
    ],
  },
  {
    category: "Vivienda",
    words: ["alquiler", "renta", "condominio", "municipalidad", "ferreteria", "epa"],
  },
  {
    category: "Educación",
    words: [
      "universidad", "ucr", "una", "tec", "uned", "ulacit", "fidelitas", "veritas",
      "colegio", "escuela", "matricula", "curso", "udemy", "platzi",
    ],
  },
  {
    category: "Trabajo",
    words: [
      "claude", "anthropic", "chatgpt", "openai", "github", "figma", "adobe",
      "notion", "vercel", "dominio", "hosting", "coworking", "oficina",
    ],
  },
];

export interface Suggestion {
  category: string | null;
  accountId: string | null;
  /** De dónde salió, para poder explicarlo en la interfaz. */
  source: "historial" | "comercio" | null;
}

const EMPTY: Suggestion = { category: null, accountId: null, source: null };

/**
 * Lo último que registraste con una descripción parecida.
 *
 * "Parecida" es que una contenga a la otra una vez normalizadas: así
 * "Auto Mercado Escazú" encuentra el "Auto Mercado" de la semana pasada.
 * Se piden al menos 4 caracteres para que escribir "a" no enganche con
 * cualquier cosa.
 */
function fromHistory(
  text: string,
  history: Pick<Transaction, "description" | "category" | "account_id" | "transaction_date">[]
): Suggestion | null {
  const needle = normalize(text);
  if (needle.length < 4) return null;

  const match = [...history]
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .find((t) => {
      if (!t.description) return false;
      const other = normalize(t.description);
      return other.includes(needle) || needle.includes(other);
    });

  if (!match || !match.category) return null;
  return { category: match.category, accountId: match.account_id, source: "historial" };
}

function fromKeywords(text: string, available: string[]): Suggestion | null {
  const needle = normalize(text);
  if (needle.length < 3) return null;

  for (const { category, words } of KEYWORDS) {
    if (!available.includes(category)) continue;
    if (words.some((word) => needle.includes(word))) {
      return { category, accountId: null, source: "comercio" };
    }
  }
  return null;
}

export function suggestFor(
  text: string,
  available: string[],
  history: Pick<Transaction, "description" | "category" | "account_id" | "transaction_date">[] = []
): Suggestion {
  if (!text.trim()) return EMPTY;

  const historical = fromHistory(text, history);
  // Solo vale si la categoría sigue existiendo: una borrada desde Ajustes no
  // se puede volver a sugerir.
  if (historical && historical.category && available.includes(historical.category)) {
    return historical;
  }

  return fromKeywords(text, available) ?? EMPTY;
}
