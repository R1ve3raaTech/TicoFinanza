import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { welcomeIfFirstTime } from "@/lib/auth/welcome";
import { googleClientId } from "@/lib/google/oauth";
import { audienceOf } from "@/lib/google/idToken";

/**
 * Canje del token que devuelve el inicio de sesión nativo de Android.
 *
 * Es el gemelo de `/auth/callback`: ahí el token lo trae Google por
 * redirección y acá lo manda la app, pero lo que pasa después es
 * **exactamente lo mismo** —`signInWithIdToken` y la sesión en cookies—,
 * así que no hay un segundo sistema de login que pueda divergir.
 *
 * ### Por qué hay un GET además del POST
 *
 * El GET reparte el nonce; el POST canjea el token. Son dos viajes a
 * propósito: **el nonce lo tiene que inventar el servidor**, no el
 * navegador. Ver abajo.
 *
 * ### Login CSRF: el ataque que esto frena
 *
 * Un endpoint que abre sesión con lo que le mandan es un blanco clásico, y
 * el ataque no es robarte la sesión: es **meterte en la cuenta del
 * atacante**. Él pone su propio token de Google en un formulario de su
 * sitio, te hace tocar un botón, tu navegador manda el POST con tus
 * cookies, y a partir de ahí anotás tus gastos —montos, comercios, saldos—
 * dentro de la cuenta de él, que los lee tranquilo. No se nota, porque la
 * app "funciona".
 *
 * **La primera versión de esto era vulnerable, y está comprobado que lo
 * era.** El detalle que lo permitía: un `<form>` de otro sitio no puede
 * mandar `Content-Type: application/json` —los formularios solo saben tres
 * tipos y ninguno es ese—, pero `request.json()` parsea igual sin mirar la
 * cabecera. Bastaba un formulario con `text/plain` y un cuerpo que
 * resultara JSON válido: sin preflight, sin CORS de por medio, con las
 * cookies de la víctima.
 *
 * Tres cierres, y cada uno por su cuenta ya alcanzaría:
 *
 * 1. **Mismo origen.** Se exige `Origin` del propio sitio o
 *    `Sec-Fetch-Site: same-origin`. Dentro del APK el WebView carga
 *    `www.ticofinanza.com`, así que la petición es del mismo origen.
 * 2. **`Content-Type: application/json` de verdad**, comprobado *antes* de
 *    parsear. Eso solo deja afuera a cualquier formulario: para mandar ese
 *    tipo hay que usar `fetch`, y ahí sí hay preflight de CORS.
 * 3. **El nonce lo pone el servidor**, en una cookie httpOnly. El atacante
 *    puede traer su token, pero no puede hacer que ese token lleve adentro
 *    un nonce que no conoce. Es el mismo diseño del flujo de la web, y la
 *    razón por la que allá este problema nunca existió.
 */

const NONCE_COOKIE = "native_login_nonce";

const cookieOptions = (seguro: boolean) => ({
  httpOnly: true,
  secure: seguro,
  // Strict y no Lax: esta cookie no tiene por qué viajar en ninguna
  // navegación que venga de afuera.
  sameSite: "strict" as const,
  maxAge: 600,
  path: "/auth",
});

/**
 * Reparte el nonce de este intento de login.
 *
 * Devuelve el **hash**, que es lo que hay que mandarle a Google, y guarda el
 * valor crudo en una cookie que el navegador no puede leer.
 * `signInWithIdToken` hashea el crudo y lo compara contra el claim del
 * token, así que mandarle el mismo valor a los dos falla con "Nonces
 * mismatch" — la misma danza que `app/auth/login/route.ts`.
 */
export async function GET(request: NextRequest) {
  if (!mismoOrigen(request)) {
    return NextResponse.json({ error: "origen" }, { status: 403 });
  }

  const crudo = crypto.randomUUID();
  const hasheado = createHash("sha256").update(crudo).digest("hex");

  const respuesta = NextResponse.json({ nonce: hasheado });
  respuesta.cookies.set(NONCE_COOKIE, crudo, cookieOptions(esHttps(request)));
  return respuesta;
}

export async function POST(request: NextRequest) {
  if (!mismoOrigen(request)) {
    console.error("[TicoFinanza] [auth/nativo] POST desde otro origen, rechazado");
    return NextResponse.json({ error: "origen" }, { status: 403 });
  }

  // Antes de parsear nada: un formulario de otro sitio no puede poner este
  // tipo, así que esta línea sola ya cierra el CSRF clásico.
  const tipo = request.headers.get("content-type") ?? "";
  if (!tipo.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "tipo" }, { status: 415 });
  }

  const clientId = googleClientId();
  if (!clientId) {
    console.error("[TicoFinanza] [auth/nativo] falta GOOGLE_CLIENT_ID");
    return NextResponse.json({ error: "config" }, { status: 503 });
  }

  // El nonce sale de la cookie, nunca del cuerpo: si lo trajera quien hace
  // la petición, podría mandar su token y su nonce a juego y la
  // comprobación no comprobaría nada.
  const nonce = request.cookies.get(NONCE_COOKIE)?.value;
  if (!nonce) {
    return NextResponse.json({ error: "nonce" }, { status: 400 });
  }

  let idToken: unknown;
  try {
    idToken = (await request.json())?.idToken;
  } catch {
    return limpiarNonce(NextResponse.json({ error: "cuerpo" }, { status: 400 }), request);
  }

  if (typeof idToken !== "string" || !idToken) {
    return limpiarNonce(NextResponse.json({ error: "falta el token" }, { status: 400 }), request);
  }

  // El `aud` tiene que ser nuestro cliente. Se lee sin verificar la firma
  // —de eso se encarga Supabase— solo para que el registro diga cuál fue el
  // problema: un token de otra app es un error de configuración, no un
  // fallo pasajero que convenga reintentar.
  const aud = audienceOf(idToken);
  if (aud && aud !== clientId) {
    console.error("[TicoFinanza] [auth/nativo] el token viene de otro cliente de Google");
    return limpiarNonce(NextResponse.json({ error: "cliente" }, { status: 400 }), request);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce,
    });

    if (error || !data.user) {
      console.error(
        "[TicoFinanza] [auth/nativo] signInWithIdToken falló:",
        error?.message ?? "sin usuario"
      );
      return limpiarNonce(NextResponse.json({ error: "auth" }, { status: 401 }), request);
    }

    await welcomeIfFirstTime(supabase, data.user);

    // La app no navega con esta respuesta: al verla recarga, para que el
    // servidor vuelva a dibujar ya con la cookie de sesión puesta.
    return limpiarNonce(NextResponse.json({ ok: true }), request);
  } catch (error) {
    console.error("[TicoFinanza] [auth/nativo] no se pudo completar el login:", error);
    return limpiarNonce(NextResponse.json({ error: "auth" }, { status: 500 }), request);
  }
}

/** Un nonce sirve para un intento. Gastado o fallido, se va. */
function limpiarNonce(respuesta: NextResponse, request: NextRequest): NextResponse {
  respuesta.cookies.set(NONCE_COOKIE, "", { ...cookieOptions(esHttps(request)), maxAge: 0 });
  return respuesta;
}

function esHttps(request: NextRequest): boolean {
  return (
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:"
  );
}

/**
 * ¿La petición viene de nuestro propio sitio?
 *
 * Se miran las dos señales porque ninguna alcanza sola: `Sec-Fetch-Site` no
 * lo manda todo motor, y `Origin` viaja en todo POST hecho con `fetch` pero
 * no en toda petición imaginable. Basta con que una diga que sí; si no
 * aparece ninguna, **se rechaza**. Fallar cerrado acá es lo correcto: lo
 * peor que pasa es que un cliente raro no entre por este camino y caiga al
 * de la web, que sigue existiendo.
 */
function mismoOrigen(request: NextRequest): boolean {
  const sitio = request.headers.get("sec-fetch-site");
  if (sitio === "same-origin") return true;
  if (sitio && sitio !== "none") return false;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
