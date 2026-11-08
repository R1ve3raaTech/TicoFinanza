import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DELETION_EMAIL_FROM, getResend } from "@/lib/email/resend";
import { GENERIC_ERROR } from "@/lib/errors";

const CODE_LENGTH = 8;
const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/** Código numérico de 8 dígitos generado con el CSPRNG de Node (crypto.randomInt), no Math.random. */
export function generateDeletionCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

/**
 * El código nunca se guarda en texto plano — se guarda un HMAC-SHA256 con un
 * secreto propio del servidor (ACCOUNT_DELETION_CODE_SECRET). Aunque el
 * código ya tiene alta entropía (10^8 combinaciones), el HMAC evita que
 * alguien con acceso de solo lectura a la base pueda leer el código
 * directamente, igual que se hace con contraseñas.
 */
function hashCode(code: string): string {
  const secret = process.env.ACCOUNT_DELETION_CODE_SECRET;
  if (!secret) throw new Error("Falta ACCOUNT_DELETION_CODE_SECRET en el entorno.");
  return createHmac("sha256", secret).update(code).digest("hex");
}

/** Comparación en tiempo constante para no filtrar el código por temporización. */
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Genera un código, invalida cualquier código anterior sin usar del mismo
 * usuario, lo guarda hasheado y lo manda por correo a la dirección real de
 * la cuenta (auth.users.email, la que verificó Google al hacer login — no
 * una que el usuario pueda escribir a mano).
 */
export async function issueDeletionCode(
  admin: SupabaseClient,
  userId: string,
  email: string
): Promise<{ error: string | null }> {
  const code = generateDeletionCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  await admin
    .from("account_deletion_codes")
    .delete()
    .eq("user_id", userId)
    .is("consumed_at", null);

  const { error: insertError } = await admin
    .from("account_deletion_codes")
    .insert({ user_id: userId, code_hash: codeHash, expires_at: expiresAt });

  if (insertError) return { error: GENERIC_ERROR };

  try {
    await getResend().emails.send({
      from: DELETION_EMAIL_FROM,
      to: email,
      subject: `${code} es tu código para eliminar tu cuenta de TicoFinanza`,
      html: deletionCodeEmailHtml(code),
      text: `Tu código para eliminar permanentemente tu cuenta de TicoFinanza es: ${code}\n\nExpira en ${CODE_TTL_MINUTES} minutos. Si no pediste esto, ignorá este correo — tu cuenta sigue segura.`,
    });
  } catch {
    return { error: GENERIC_ERROR };
  }

  return { error: null };
}

type VerifyResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Verifica el código contra el más reciente sin usar del usuario. Máximo
 * MAX_ATTEMPTS intentos por código (después hay que pedir uno nuevo) y
 * expira a los CODE_TTL_MINUTES minutos, para limitar cuánto se puede
 * intentar adivinar por fuerza bruta.
 */
export async function verifyDeletionCode(
  admin: SupabaseClient,
  userId: string,
  submittedCode: string
): Promise<VerifyResult> {
  const { data: row } = await admin
    .from("account_deletion_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, error: "Pedí un código nuevo antes de confirmar." };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("account_deletion_codes").delete().eq("id", row.id);
    return { ok: false, error: "El código expiró. Pedí uno nuevo." };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from("account_deletion_codes").delete().eq("id", row.id);
    return { ok: false, error: "Demasiados intentos. Pedí un código nuevo." };
  }

  const submittedHash = hashCode(submittedCode.trim());
  if (!hashesMatch(submittedHash, row.code_hash)) {
    await admin
      .from("account_deletion_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    const remaining = MAX_ATTEMPTS - (row.attempts + 1);
    return {
      ok: false,
      error: remaining > 0 ? `Código incorrecto. Te quedan ${remaining} intentos.` : "Demasiados intentos. Pedí un código nuevo.",
    };
  }

  await admin
    .from("account_deletion_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true };
}

function deletionCodeEmailHtml(code: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:420px;background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
            <tr>
              <td style="color:#fafafa;font-size:15px;font-weight:600;letter-spacing:-0.01em;">TicoFinanza</td>
            </tr>
            <tr>
              <td style="padding-top:20px;color:#fafafa;font-size:16px;line-height:1.5;">
                Pediste eliminar permanentemente tu cuenta. Usá este código para confirmarlo:
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;padding-bottom:20px;">
                <div style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.15em;color:#fb923c;text-align:center;background:#09090b;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td style="color:#a1a1aa;font-size:13px;line-height:1.6;">
                Expira en ${CODE_TTL_MINUTES} minutos y solo sirve una vez. Esta acción borra
                todos tus datos de forma permanente y no se puede deshacer.
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;color:#71717a;font-size:12px;line-height:1.6;">
                Si no pediste esto, ignorá este correo — tu cuenta sigue segura y nadie puede
                eliminarla sin acceso a esta bandeja de entrada.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
