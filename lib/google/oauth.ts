import "server-only";

export function googleOAuthConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(id?.endsWith(".apps.googleusercontent.com") && secret &&
    !/\[SENSITIVE\]|your[-_]/i.test(secret));
}

/**
 * Único permiso que pide la app: identificar a quien entra. Nada de leer
 * correos ni de tocar ninguna otra API de Google — por eso no hay
 * `access_type=offline` ni refresh tokens que guardar en la base.
 */
export const LOGIN_SCOPE = "openid email profile";

/**
 * Flujo de OAuth directo contra Google (no vía Supabase Auth). No pasar por
 * Supabase Auth es lo que evita que la pantalla de consentimiento de Google
 * muestre "...continuar a tu-proyecto.supabase.co" en vez del dominio real
 * de la app.
 */
export function buildGoogleAuthUrl(redirectUri: string, state: string, nonce: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", LOGIN_SCOPE);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url.toString();
}

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  expires_in: number;
  scope?: string;
}

export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo canjear el código de Google: ${response.status}`);
  }
  return response.json();
}
