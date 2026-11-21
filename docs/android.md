# El APK de Android

TicoFinanza se instala como app de Android con un envoltorio de **Capacitor**
que **carga el sitio en vivo**. Eso significa que un cambio en la web sale en
el teléfono sin recompilar ni reinstalar nada: el APK solo hay que rehacerlo
cuando cambia el envoltorio (el ícono, un permiso, un plugin nativo).

No es el TWA de antes. Un TWA es Chrome en una caja: abre el navegador por
dentro, y si Chrome está deshabilitado o viejo la app no abre. Este es una
app propia, con su proceso y su sesión.

## Compilar sin instalar nada

El APK se arma en GitHub Actions, así no hace falta Android Studio ni el SDK
de Android en la computadora.

1. En GitHub, pestaña **Actions** → **APK de Android**.
2. **Run workflow**, y elegir la variante:
   - **debug** — se instala sin configurar nada. Es con la que hay que
     empezar.
   - **release** — firmado de verdad. Pide los cuatro secretos de abajo.
3. Cuando termina, el APK queda como **artefacto** al final de la corrida.
   Se descarga como `.zip` y adentro viene el `.apk`.

### Instalarlo en el teléfono

1. **Desinstalar primero el TWA viejo**, si todavía está. El nuevo tiene otro
   identificador (`com.ticofinanza.app` contra `com.ticofinanza.www.app`), así
   que no se pisan — pero quedarían dos TicoFinanza en el cajón de apps.
2. Pasar el `.apk` al teléfono y abrirlo. Android va a pedir permiso para
   instalar desde esa fuente: **Ajustes → Permitir desde esta fuente**.
3. Volver atrás e **Instalar**.

## La variante debug tiene una contra, y conviene saberla

Un APK debug viene con `android:debuggable` activo. Para una app que guarda
tus movimientos eso es un escalón menos de protección: alguien con el
teléfono en la mano, las opciones de desarrollador encendidas y un cable
podría inspeccionar la app por dentro.

Para el uso de todos los días conviene pasar a **release firmado**. Hace
falta una llave, una sola vez.

### La llave, una sola vez

La llave **no va en el repositorio**: va en los secretos del repo en GitHub.
Se genera con `keytool`, que viene con cualquier JDK (si no hay Java en la
computadora, Android Studio lo trae, o se puede generar en cualquier máquina
con Java y copiar el archivo):

```bash
keytool -genkeypair -v -keystore ticofinanza.jks \
  -alias ticofinanza -keyalg RSA -keysize 2048 -validity 10000
```

Guardá ese archivo y la contraseña **fuera del repositorio y sin perderlos**:
si se pierden, un APK nuevo ya no se puede instalar encima del viejo — hay
que desinstalar y volver a entrar. Y además **el login con Google dejaría de
funcionar** hasta registrar la huella de la llave nueva en Google Cloud.

La huella SHA-1 de esa llave va registrada en Google Cloud Console, en un
cliente de OAuth de tipo **Android** con el paquete `com.ticofinanza.app`.
Se saca con:

```bash
keytool -list -v -keystore ticofinanza.jks -alias ticofinanza | grep SHA1
```

Después, en GitHub → Settings → Secrets and variables → Actions, cuatro
secretos:

| Secreto | Qué va |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | el archivo `.jks` en base64 (`base64 -w0 ticofinanza.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | la contraseña del almacén |
| `ANDROID_KEY_ALIAS` | `ticofinanza` |
| `ANDROID_KEY_PASSWORD` | la contraseña de la llave |

## El workflow y la llave

Tres cosas del workflow que no son decorativas:

- **`permissions: contents: read`.** Sin eso el token del job sale con los
  permisos por defecto, que incluyen escritura sobre el repositorio.
- **Todas las acciones van fijadas a un commit**, no a una etiqueta. Una
  etiqueta se puede mover, y este job recibe la llave de firma del APK: si
  uno de esos repositorios se comprometiera, un paso ajeno corriendo acá
  podría leer la llave ya descifrada en disco. Para actualizar cualquiera:
  `gh api repos/<dueño>/<repo>/git/ref/tags/vX --jq .object.sha`.
- **`setup-android` tiene que ser v4 o más.** La v3 intenta instalar el
  paquete `tools` del SDK, que Google sacó del repositorio: falla con
  "Failed to find package 'tools'" antes de compilar nada.
- **El secreto de la llave entra por `env`**, no interpolado dentro del
  `run`: así no queda escrito en el script que el runner ejecuta.

## Qué hay que saber si se toca el envoltorio

- **`capacitor.config.ts` manda.** Después de cambiarlo hay que correr
  `npx cap sync android` para que llegue al proyecto nativo; el workflow lo
  hace solo en cada corrida.
- **La marca del identificador (`appendUserAgent`) es lo que hace que la web
  sepa que está dentro del APK.** Tiene que contener `TicoFinanzaApp`, que es
  lo que espera `lib/appMode.ts`. Si se desajusta, el APK pasa a comportarse
  como la web —portada en vez de bienvenida, sin cerrojo, con cierre por
  inactividad— y **nada falla**: solo deja de ser la app. Hay una prueba
  (`lib/appMode.test.ts`) y una comprobación dentro del workflow.
- **Los íconos y el splash se generan** con
  `node scripts/generate-android-icons.mjs`, a partir del mismo símbolo que
  el resto de la marca. Sin correrlo, la app queda con el logo de Capacitor.
- **`android/gradlew` tiene que estar marcado como ejecutable en git**
  (`100755`). Windows no guarda ese permiso, así que al commitearlo desde
  esta máquina sale `100644` y el runner de Linux falla con **exit code
  126** ("se encontró el comando pero no se puede ejecutar"). Se arregla con
  `git update-index --chmod=+x android/gradlew`.
- **`webDir` apunta a `capacitor-web/`, no a `public/`.** El contenido viene
  del sitio en vivo; empacar `public/` metía 1,2 MB de capturas —y el APK
  viejo dentro del APK nuevo— sin que nada de eso se use.

## Lo que todavía no está

En orden, y cada uno con su razón en el CLAUDE.md:

1. **Huella.** Ojo: `lib/native.ts` está escrito contra
   `capacitor-native-biometric`, que **peerea contra Capacitor 3** y está
   abandonado. El mantenido es `@aparajita/capacitor-biometric-auth` v10.
   Sigue siendo un solo archivo, pero la forma del plugin cambia.
2. **Notificaciones push.** Dentro de un WebView no existe la API de push del
   navegador; hay que pasarlas a Firebase.
3. **`FLAG_SECURE`**, para que los saldos no salgan en la miniatura de la
   lista de apps recientes.
4. **Revisar el caché sin conexión** adentro del WebView, y con él la
   insignia "Funciona sin señal" de la portada.
5. **Leer las notificaciones de Wallet y de los bancos.** El primer paso no
   es escribir código: es capturar texto real de notificaciones del teléfono.
   Inventar el formato es exactamente como nació el bug de agosto, con
   compras del Banco Popular registradas como BAC.

## El login con Google (hecho)

El flujo de la web manda el navegador a `accounts.google.com`. Adentro del
APK ese dominio no es el del sitio, así que Capacitor se lo entrega al
navegador del sistema: la persona entraba **en Brave**, la cookie quedaba
ahí y la app seguía sin sesión. Forzarlo a cargar dentro del WebView no es
salida: Google rechaza su pantalla de login en vistas embebidas
(`disallowed_useragent`).

Ahora el token se le pide al sistema (Play Services) con
`@capgo/capacitor-social-login`, y se canja en `/auth/nativo`, que hace
**lo mismo** que `/auth/callback`: `signInWithIdToken`. No hubo que tocar
nada de Supabase.

- **Se le pasa el ID del cliente WEB, no el de Android.** Ese es el público
  al que va dirigido el token y el que el backend ya valida. El cliente de
  Android no se nombra en el código: Google lo usa por detrás para
  comprobar que quien pide es esta app, firmada con esta llave.
- **Por eso el APK tiene que ir firmado con la llave registrada.** Con la
  firma de debug —que el runner genera nueva en cada corrida— el login
  nativo no funciona. La variante `release` dejó de ser "lo recomendable"
  y pasó a ser requisito.
- El `nonce` sigue la misma danza que el flujo web: a Google va el hash, a
  Supabase el valor crudo (ver `app/auth/login/route.ts`).
- El ID de cliente **solo baja al APK**, decidido por petición en
  `AuthPage`: `/entrar` también se usa dentro de la app, así que no
  alcanzaba con no mandarlo nunca.
- Si el puente nativo no está, el botón cae al camino de la web. Alguien
  que falsee el identificador entra igual, en vez de mirar un botón muerto.
