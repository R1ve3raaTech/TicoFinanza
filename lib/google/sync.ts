import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshGoogleAccessToken } from "@/lib/google/token";
import { getMessage, listMessageIds } from "@/lib/google/gmail";
import { buildGmailQuery, parseEmail } from "@/lib/parsers";
import { sendPushToUser } from "@/lib/push/send";
import { formatMoney } from "@/lib/format";

export interface SyncResult {
  transactionsInserted: number;
  errors: string[];
}

export interface SyncOptions {
  admin: SupabaseClient;
  userId: string;
  refreshToken: string;
  /** Fila de gmail_tokens que se está sincronizando (un usuario puede tener varias cuentas conectadas). */
  tokenId: string;
  days?: number;
  maxResults?: number;
}

/**
 * Sincroniza los correos bancarios de una cuenta de Gmail conectada
 * puntual. Compartido entre el cron externo (/api/sync-gmail) y el botón
 * manual del dashboard. Un mismo usuario puede tener varias cuentas
 * conectadas, cada una con su propia fila en gmail_tokens.
 */
export async function syncGmailForUser({
  admin,
  userId,
  refreshToken,
  tokenId,
  days = 3,
  maxResults = 100,
}: SyncOptions): Promise<SyncResult> {
  const errors: string[] = [];
  let transactionsInserted = 0;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const ownerName = profile?.full_name ?? undefined;

  const { access_token } = await refreshGoogleAccessToken(refreshToken);
  const query = buildGmailQuery(days);
  const messageIds = await listMessageIds(access_token, query, maxResults);

  // Traer los correos en paralelo (en lotes) en vez de uno por uno — es la
  // parte más lenta del sync, ya que cada correo es un round-trip a Gmail.
  const FETCH_CONCURRENCY = 10;
  for (let i = 0; i < messageIds.length; i += FETCH_CONCURRENCY) {
    const batchIds = messageIds.slice(i, i + FETCH_CONCURRENCY);
    const batch = await Promise.all(
      batchIds.map(async (id) => {
        try {
          return { id, message: await getMessage(access_token, id) };
        } catch (err) {
          errors.push(`${id}: ${(err as Error).message}`);
          return null;
        }
      })
    );

    const pushes: Promise<void>[] = [];
    for (const item of batch) {
      if (!item) continue;
      const { id, message } = item;

      let parsed: Awaited<ReturnType<typeof parseEmail>>;
      try {
        parsed = await parseEmail(message.bodyText, { receivedAt: message.receivedAt, ownerName });
      } catch (err) {
        // El correo matcheó un parser pero algo después falló de verdad (hoy
        // en la práctica: no se pudo convertir la moneda — ver
        // ExchangeRateError en lib/exchangeRate.ts). A propósito NO se
        // inserta nada con un monto inventado: el correo queda sin marcar
        // como procesado (no se crea su fila, no hay gmail_message_id
        // guardado), así que la próxima sincronización lo vuelve a traer y
        // reintenta solo, sin que nadie tenga que hacer nada a mano.
        errors.push(`${id}: no se pudo registrar (se reintentará solo) — ${(err as Error).message}`);
        continue;
      }
      if (!parsed) continue;

      // PayPal manda un correo al autorizar un pago y otro distinto cuando
      // el comercio lo captura después — mismo pago, dos gmail_message_id
      // distintos, así que el unique constraint de más abajo no alcanza
      // para evitar el duplicado. Si el parser trae un identificador estable
      // (ver ParsedTransaction.dedupeKey), se busca si ya hay una
      // transacción de este usuario/banco con ese mismo id antes de
      // insertar. El id queda grabado dentro de `description` (mismo patrón
      // que ya usa bacTransfer con su "(ref. X)"), no hace falta una
      // columna nueva.
      if (parsed.dedupeKey) {
        const marker = `(ref. ${parsed.dedupeKey})`;
        const { data: existing } = await admin
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("bank_name", parsed.bank_name)
          .ilike("description", `%${marker}%`)
          .limit(1)
          .maybeSingle();
        if (existing) continue;
      }

      const { error: insertError, count } = await admin
        .from("transactions")
        .upsert(
          {
            user_id: userId,
            gmail_message_id: message.id,
            bank_name: parsed.bank_name,
            amount: parsed.amount,
            currency: parsed.currency,
            description: parsed.description,
            type: parsed.type,
            is_automated: true,
            transaction_date: parsed.transaction_date,
          },
          { onConflict: "gmail_message_id", ignoreDuplicates: true, count: "exact" }
        );

      if (insertError) {
        errors.push(`${id}: ${insertError.message}`);
      } else if (count && count > 0) {
        transactionsInserted++;
        const title = parsed.type === "INCOME" ? "Nuevo ingreso" : "Nuevo gasto";
        const body = `${parsed.bank_name} · ${formatMoney(parsed.amount)} · ${parsed.description}`;
        pushes.push(
          sendPushToUser(admin, userId, { title, body, url: "/dashboard" }).catch((err) => {
            errors.push(`push/${id}: ${(err as Error).message}`);
          })
        );
      }
    }
    await Promise.all(pushes);
  }

  await admin
    .from("gmail_tokens")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", tokenId);

  return { transactionsInserted, errors };
}
