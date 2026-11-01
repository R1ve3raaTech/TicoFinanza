import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeGoogleAuthCode } from "@/lib/google/oauth";
import { sendWelcomeEmailIfFirstTime } from "@/lib/email/welcomeEmail";
import { resolveFirstName } from "@/lib/profile";

const STATE_COOKIE = "login_state";
const NONCE_COOKIE = "login_nonce";

function redirectAndClearState(url: string) {
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, "", { path: "/auth", maxAge: 0 });
  response.cookies.set(NONCE_COOKIE, "", { path: "/auth", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const nonce = request.cookies.get(NONCE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState || !nonce) {
    return redirectAndClearState(`${origin}/entrar?error=auth`);
  }

  try {
    const redirectUri = `${origin}/auth/callback`;
    const tokens = await exchangeGoogleAuthCode(code, redirectUri);

    if (!tokens.id_token) {
      console.error("[auth/callback] Google no devolvió id_token.");
      return redirectAndClearState(`${origin}/entrar?error=auth`);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokens.id_token,
      access_token: tokens.access_token,
      nonce,
    });

    if (error || !data.user) {
      console.error("[auth/callback] signInWithIdToken falló");
      return redirectAndClearState(`${origin}/entrar?error=auth`);
    }

    // El token de Google solo sirvió para identificar a la persona: no se
    // guarda nada de Google del lado de la app (ningún refresh token, ningún
    // permiso sobre sus datos).
    if (data.user.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      const firstName = resolveFirstName(data.user, profile?.full_name);
      try {
        const admin = createAdminClient();
        await sendWelcomeEmailIfFirstTime(admin, data.user.id, data.user.email, firstName);
      } catch {
        console.error("[auth/callback] no se pudo enviar la bienvenida");
      }
    }

    return redirectAndClearState(`${origin}/dashboard`);
  } catch {
    console.error("[auth/callback] no se pudo completar el login");
    return redirectAndClearState(`${origin}/entrar?error=auth`);
  }
}
