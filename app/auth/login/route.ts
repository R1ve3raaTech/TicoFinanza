import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleOAuthConfigured } from "@/lib/google/oauth";

const STATE_COOKIE = "login_state";
const NONCE_COOKIE = "login_nonce";

/**
 * Entrada con Google, directo contra Google (no vía Supabase Auth). El
 * callback usa el id_token que devuelve Google para crear la sesión de
 * Supabase con signInWithIdToken — así la pantalla de consentimiento de
 * Google muestra el dominio real de la app, no "...supabase.co".
 */
export async function GET(request: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/entrar?error=auth", request.url));
  }
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/auth/callback`;

  const state = crypto.randomUUID();
  // signInWithIdToken hashea el nonce que le pasás y lo compara contra el
  // claim "nonce" del id_token — así que a Google hay que mandarle el hash, y
  // guardar el nonce SIN hashear para dárselo a Supabase después. Mandarle el
  // mismo valor a los dos rompe la verificación con "Nonces mismatch".
  const rawNonce = crypto.randomUUID();
  const hashedNonce = createHash("sha256").update(rawNonce).digest("hex");

  const response = NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state, hashedNonce));
  const cookieOptions = {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/auth",
  };
  response.cookies.set(STATE_COOKIE, state, cookieOptions);
  response.cookies.set(NONCE_COOKIE, rawNonce, cookieOptions);
  return response;
}
