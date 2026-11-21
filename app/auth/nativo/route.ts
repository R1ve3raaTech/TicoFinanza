import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { welcomeIfFirstTime } from "@/lib/auth/welcome";
import { googleClientId } from "@/lib/google/oauth";
import { audienceOf } from "@/lib/google/idToken";

/**
 * Canje del token que devuelve el inicio de sesión nativo de Android.
 *
 * Es el gemelo de `/auth/callback`, con una diferencia: ahí el token lo
 * trae Google por redirección y acá lo manda la app. Lo que pasa después es
 * **exactamente lo mismo** —`signInWithIdToken` y la sesión en cookies—,
 * así que no hay un segundo sistema de login que pueda divergir.
 *
 * ### Por qué recibir un token por POST no abre nada
 *
 * El token viene firmado por Google. Supabase verifica esa firma, el
 * emisor, el vencimiento y que el token esté dirigido a nuestro cliente
 * (`aud`). Un token inventado no pasa; uno de otra app tampoco, porque su
 * `aud` sería otro. Acá además se comprueba el `aud` antes de llamar a
 * Supabase: no porque Supabase no lo haga, sino para que el registro diga
 * cuál fue el problema en vez de un error genérico.
 *
 * Lo que este endpoint **no** puede hacer es confiar en quién llama: el
 * identificador del navegador se falsea en un segundo, y por eso no es la
 * comprobación de seguridad. Solo decide el mensaje de error.
 */
export async function POST(request: NextRequest) {
  const clientId = googleClientId();
  if (!clientId) {
    console.error("[TicoFinanza] [auth/nativo] falta GOOGLE_CLIENT_ID");
    return NextResponse.json({ error: "config" }, { status: 503 });
  }

  let idToken: unknown;
  let nonce: unknown;
  try {
    const cuerpo = await request.json();
    idToken = cuerpo?.idToken;
    nonce = cuerpo?.nonce;
  } catch {
    return NextResponse.json({ error: "cuerpo" }, { status: 400 });
  }

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "falta el token" }, { status: 400 });
  }
  if (nonce !== undefined && typeof nonce !== "string") {
    return NextResponse.json({ error: "nonce" }, { status: 400 });
  }

  // El `aud` del token tiene que ser nuestro cliente. Se lee sin verificar
  // la firma —de eso se encarga Supabase— solo para dar un motivo claro en
  // el registro: un token de otra app es un error de configuración, no un
  // fallo pasajero que convenga reintentar.
  const aud = audienceOf(idToken);
  if (aud && aud !== clientId) {
    console.error("[TicoFinanza] [auth/nativo] el token viene de otro cliente de Google");
    return NextResponse.json({ error: "cliente" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      // Sin nonce, Supabase no compara ese claim. Se manda siempre que la
      // app lo haya generado.
      ...(nonce ? { nonce } : {}),
    });

    if (error || !data.user) {
      console.error(
        "[TicoFinanza] [auth/nativo] signInWithIdToken falló:",
        error?.message ?? "sin usuario"
      );
      return NextResponse.json({ error: "auth" }, { status: 401 });
    }

    await welcomeIfFirstTime(supabase, data.user);

    // La app no navega con esta respuesta: al verla recarga, para que el
    // servidor vuelva a dibujar ya con la cookie de sesión puesta.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TicoFinanza] [auth/nativo] no se pudo completar el login:", error);
    return NextResponse.json({ error: "auth" }, { status: 500 });
  }
}
