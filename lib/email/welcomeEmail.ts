import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getResend } from "@/lib/email/resend";

const WELCOME_EMAIL_FROM = "TicoFinanza <no-responder@ticofinanza.com>";

/**
 * Dominio del sitio, para las imágenes y los enlaces del correo. Un correo
 * se abre fuera de la app, así que todo tiene que ir con URL absoluta: una
 * ruta relativa no resuelve contra nada.
 */
const APP_URL = "https://www.ticofinanza.com";

/**
 * Manda el correo de bienvenida la primera vez que alguien se registra —
 * nunca en logins posteriores. Reclama el envío con un UPDATE condicional
 * (`welcome_email_sent_at is null`) antes de mandar el correo: si dos
 * requests llegaran a la vez (poco probable, pero el callback de OAuth
 * puede reintentarse), solo una gana la carrera y solo esa manda el correo.
 */
export async function sendWelcomeEmailIfFirstTime(
  admin: SupabaseClient,
  userId: string,
  email: string,
  firstName: string | undefined
): Promise<void> {
  const { data: claimed } = await admin
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_email_sent_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) return;

  try {
    await getResend().emails.send({
      from: WELCOME_EMAIL_FROM,
      to: email,
      subject: "Bienvenido a TicoFinanza — así se empieza",
      html: welcomeEmailHtml(firstName),
      text: welcomeEmailText(firstName),
    });
  } catch {
    // No revertimos welcome_email_sent_at: preferible perder un correo de
    // bienvenida a mandarlo duplicado si Resend falla de forma intermitente.
    console.error("[sendWelcomeEmailIfFirstTime] no se pudo enviar el correo");
  }
}

function welcomeEmailHtml(firstName: string | undefined): string {
  const escaped = firstName
    ? firstName.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
    : null;
  const greeting = escaped ? `Hola, ${escaped}` : "Hola";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#08090c;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#08090c;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:480px;background:#0e1014;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <!-- El ícono de verdad de la app, no las iniciales
                           dibujadas con CSS que había antes. Va como <img>
                           con URL absoluta: un correo no tiene de dónde
                           resolver una ruta relativa, y el SVG no lo dibujan
                           Gmail ni Outlook. -->
                      <img src="${APP_URL}/icon-192.png" width="40" height="40" alt=""
                           style="display:block;border-radius:10px;" />
                    </td>
                    <td style="padding-left:12px;color:#f4f6f8;font-size:16px;font-weight:600;letter-spacing:-0.01em;">
                      TicoFinanza
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 0 32px;color:#f4f6f8;font-size:21px;font-weight:700;letter-spacing:-0.015em;line-height:1.25;">
                ${greeting}, tu cuenta ya está lista.
              </td>
            </tr>
            <tr>
              <td style="padding:14px 32px 0 32px;color:#a2aab8;font-size:15px;line-height:1.6;">
                TicoFinanza no se conecta a tu banco ni lee tus correos: vos anotás lo que entra
                y lo que sale, y la app lleva la cuenta. Todo en colones.
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0 32px;color:#f4f6f8;font-size:14px;font-weight:600;">
                Los primeros pasos
              </td>
            </tr>
            <tr>
              <td style="padding:10px 32px 0 32px;">
                <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0 9px;">
                  <tr>
                    <td style="width:20px;color:#38bdf8;font-size:14px;vertical-align:top;">1</td>
                    <td style="color:#a2aab8;font-size:14px;line-height:1.55;">
                      Creá una cuenta por cada lugar donde tenés plata: efectivo, el banco, la tarjeta.
                    </td>
                  </tr>
                  <tr>
                    <td style="width:20px;color:#38bdf8;font-size:14px;vertical-align:top;">2</td>
                    <td style="color:#a2aab8;font-size:14px;line-height:1.55;">
                      Cargá tus gastos fijos con su día de cobro, y tu salario o quincena.
                    </td>
                  </tr>
                  <tr>
                    <td style="width:20px;color:#38bdf8;font-size:14px;vertical-align:top;">3</td>
                    <td style="color:#a2aab8;font-size:14px;line-height:1.55;">
                      Anotá los gastos del día a día con su categoría, y poné un tope a la que se te va de las manos.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <a href="${APP_URL}/dashboard"
                   style="display:block;text-align:center;background:#38bdf8;color:#04141f;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;padding:13px 0;">
                  Abrir TicoFinanza
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px;color:#6b7382;font-size:12px;line-height:1.6;">
                De tu cuenta de Google solo recibimos tu nombre, tu correo y tu foto, para
                identificarte. Los detalles están en la
                <a href="${APP_URL}/privacidad" style="color:#7dd3fc;text-decoration:underline;">política de privacidad</a>.
                ¿Dudas? Escribinos a
                <a href="mailto:info@ticofinanza.com" style="color:#7dd3fc;text-decoration:underline;">info@ticofinanza.com</a>.
                <br /><br />
                — El equipo de TicoFinanza
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function welcomeEmailText(firstName: string | undefined): string {
  const greeting = firstName ? `Hola, ${firstName}` : "Hola";
  return `${greeting}, tu cuenta de TicoFinanza ya está lista.

TicoFinanza no se conecta a tu banco ni lee tus correos: vos anotás lo que entra y lo que sale, y la app lleva la cuenta. Todo en colones.

Los primeros pasos:
1. Creá una cuenta por cada lugar donde tenés plata: efectivo, el banco, la tarjeta.
2. Cargá tus gastos fijos con su día de cobro, y tu salario o quincena.
3. Anotá los gastos del día a día con su categoría, y poné un tope a la que se te va de las manos.

Abrir TicoFinanza: ${APP_URL}/dashboard

De tu cuenta de Google solo recibimos tu nombre, tu correo y tu foto, para identificarte. Los detalles están en la política de privacidad: ${APP_URL}/privacidad
¿Dudas? Escribinos a info@ticofinanza.com.

— El equipo de TicoFinanza`;
}
