@AGENTS.md

## Dónde quedamos (2026-07-29)

Verificación de OAuth de Google enviada. Estado real (no confundir con los
checks verdes de "branding", que ya estaban aprobados antes y son un trámite
aparte):

- El scope `gmail.readonly` es un **scope restringido** de Google (no solo
  "sensible"), y por eso requiere su propia revisión — la advertencia de
  "Google no verificó esta app" seguía saliendo en incógnito aunque branding
  ya estuviera en verde, porque el scope restringido nunca había sido
  **declarado** en Cloud Console → Acceso a los datos (por eso las tablas
  salían vacías, aunque el código sí lo pedía en tiempo de ejecución).
- Ya se declaró el scope, se completó justificación + video de demo (unlisted
  en YouTube) y se envió el formulario. Google confirmó: primer correo de
  respuesta en 3-5 días, proceso completo 4-6 semanas. Contacto del proyecto
  es `thecamil999@gmail.com` — revisar esa bandeja para pedidos de Google.
- **Importante para el futuro**: como el scope es restringido, Google exige
  además una **evaluación CASA** (Cloud Application Security Assessment),
  paga y a recertificar anualmente, antes de aprobar el acceso final a la
  API. Para una app chica como esta normalmente aplica el tier más bajo
  (~$540/año vía proveedores aprobados), no el tier enterprise. Esto todavía
  no se contrató — probablemente llegue como siguiente paso pedido por
  Google en el correo de seguimiento.
- Se agregó `include_granted_scopes=true` al armado manual de la URL de
  OAuth (`lib/google/oauth.ts`) para resolver el warning de "autorización
  incremental" que mostraba Cloud Console — ya deployado y verificado en
  producción.
- Mientras la revisión está pendiente, la app sigue funcionando normal en
  producción; los usuarios nuevos van a seguir viendo la advertencia de
  Google hasta que termine el proceso. No hay nada que hacer del lado del
  código salvo responder si Google pide más info por correo.

## Dónde quedamos (2026-07-30)

Google mandó el checklist automático de verificación (pide confirmar por
correo que la app cumple cada punto antes de seguir con la revisión). Se
agregó a `/privacidad` una declaración explícita de "Limited Use" (Google la
exige cuando una app usa IA sobre datos que vienen de una API de Workspace,
como Gmail) y se deployó. Queda pendiente que Camil mande la respuesta al
correo de Google confirmando el checklist (borrador ya redactado en esa
conversación). El bloqueante real sigue siendo CASA, sin contratar todavía
(ver nota de 2026-07-29 arriba).

Los dos pendientes visuales de la sesión del 2026-07-24 (header del
dashboard y `/bienvenida`) ya fueron confirmados por Camil viendo la app en
producción — se ven bien, no hace falta retocar nada.

## Dónde quedamos (2026-08-15)

Camil reportó que el saldo del dashboard no le cuadraba. Causa real: el
saldo consolidado se calculaba sumando solo las transacciones ya traídas
para la lista visible (`.limit(50)` sin filtro de fecha, `.limit(300)` con
filtro) — en cuanto había más movimientos que ese límite, el saldo
ignoraba los más viejos. Se arregló calculando el saldo con una consulta
aparte sin límite (`app/dashboard/page.tsx`).

De paso se quitó el córdoba nicaragüense (NIC) como moneda propia de la
app — ya no aparece en saldo, formulario de efectivo, metas ni
presupuestos; solo quedan CRC y USD. Los correos de BAC/MUCAP que a veces
llegan en córdobas (compras hechas en Nicaragua) se convierten
automáticamente a colones al parsear el correo, con un tipo de cambio fijo
aproximado (`NIO_TO_CRC_RATE = 14.2` en `lib/parsers/types.ts` — no es una
tasa en vivo, son montos chicos y esporádicos). Migración `0016_remove_nic_currency.sql`
ya corrida en Supabase Studio por Camil (convirtió filas viejas en
córdobas a colones y sacó NIC de los check constraints). Deployado a
producción.

**Importante para el futuro**: no tengo acceso directo a la base de
TicoFinanza por ningún canal automatizado — el MCP de Supabase conectado
en este entorno apunta a otra cuenta de Camil (proyectos ajenos, no
`pukvyunpwgwpbvtmyniu`), no hay `DATABASE_URL`/connection string guardado
en `.env.local` (solo `SUPABASE_SERVICE_ROLE_KEY`, que no permite DDL/SQL
crudo), y el CLI de Supabase no está enlazado. Mientras eso no cambie,
cualquier migración SQL la tiene que correr Camil a mano en Supabase
Studio → SQL Editor.

## Dónde quedamos (2026-08-15, segunda parte)

Rediseño visual completo de la app, en cuatro commits (landing → ajustes →
estadísticas → login/bienvenida). Lo que hay que saber para no deshacerlo
sin querer:

- **El acento de la app es celeste `#38BDF8`, no naranja.** No es un capricho:
  es el color que ya tenía el ícono (`public/icon-192.png`), así que antes el
  usuario instalaba una app azul y abría una app naranja. Además el naranja
  chocaba con el ámbar de "casi te pasás del presupuesto".
- **Regla de color que gobierna todo**: verde/rosa/ámbar están *reservados*
  para ingreso/gasto/alerta y no se usan decorativamente. Si algo necesita
  color y no significa plata, va celeste o neutro. Los tokens viven en
  `app/globals.css` (`--ground`, `--ink`, `--accent`, `--income`, …) y se usan
  como clases de Tailwind (`bg-surface`, `text-ink-2`, `border-line`).
- **El gráfico de los 6 meses es divergente a propósito** (ingresos arriba,
  gastos abajo). No volver a barras agrupadas: verde contra rojo da ΔE 4.6 en
  deuteranopía, o sea que para ~1 de cada 12 hombres eran el mismo color, y
  ahí el color era lo único que separaba las series. Los rellenos usan
  `--chart-income` / `--chart-expense`, más profundos que los del texto porque
  tienen que caer dentro de la banda OKLCH L 0.48–0.67 del validador.
- **Para ver pantallas que exigen login** (ajustes, estadísticas, bienvenida)
  se puede crear `app/preview-tmp/page.tsx` con datos falsos, capturarla con
  Playwright (está en node_modules) y borrarla antes de commitear. Ojo: Next
  ignora las carpetas que empiezan con `_`, por eso no puede llamarse
  `_preview`. Así aparecieron varios de los bugs que se corrigieron.
- Las skills instaladas con `npx skills add` viven en `.agents/`, `.claude/` y
  `agent/`, están en `.gitignore` y excluidas del lint. Se reinstalan con
  `npx skills experimental_install` desde `skills-lock.json`, que sí se versiona.

## Dónde quedamos (2026-08-15, tercera parte)

Camil pidió revisar su Gmail real para ver si algún correo bancario servía
de algo. Encontré un bug de correctness real (no de diseño): las
notificaciones de compra de Banco Popular usan el mismo layout de tabla que
BAC ("Comercio: / Fecha: / Tipo de Transacción: / Monto:"), y
`bacCardPurchase.ts` no exigía ningún texto propio de BAC — así que
cualquier compra de BP con tarjeta se registraba como si fuera de BAC.
Confirmado corriendo `parseEmail()` de verdad contra el HTML real de dos
correos de BP (`notificacion@bancopopularinforma.fi.cr`). Se agregó
`lib/parsers/bpCardPurchase.ts` (gateado por "bp.fi.cr", propio de sus
correos) y se blindó `bacCardPurchase.ts` exigiendo "baccredomatic.com" o
"BAC INTERNATIONAL BANK".

De paso salieron dos bugs más del mismo lote de correos: el filtro que evita
duplicar una compra pagada vía PayPal solo reconocía "PAYPAL \*comercio",
no "PP\*comercio" (la notación que usa BP) — ahora es
`isPaypalRoutedMerchant()`, compartida entre ambos parsers de tarjeta. Y el
parser de PayPal (`lib/parsers/paypal.ts`) solo aceptaba correos "Ha
pagado", así que los pagos "Ha autorizado" (pendientes de captura, comunes
en compras dentro de apps/juegos) no se registraban nada — ahora acepta
ambas variantes.

**Importante, sin resolver**: no tengo forma de saber si esto ya afectó
datos reales en producción — no tengo acceso de lectura a la base (ver nota
de acceso arriba, 2026-08-15 segundo bloque). Si Camil ya conectó Gmail y
usó "Leer correos" con compras de BP de por medio, esas filas quedaron con
`bank_name = 'BAC'` en vez de `'BP'` y hay que corregirlas a mano (editar
cada una desde Ajustes → o Camil corre un `UPDATE` en Supabase Studio
buscando transacciones "BAC" cuyo `description` no le suene a Nicaragua/BAC).

**Pendientes generales, sin fecha de sesión asociada:**
- El texto sobre notificaciones bancarias de BAC quedó deliberadamente
  genérico ("revisá los ajustes de notificaciones de tu banco") porque las
  instrucciones específicas que se probaron dos veces resultaron
  incorrectas — no reintroducir pasos de menú inventados sin confirmarlos
  con Camil primero.
- **Deploy automático en cada push a `main`** (corregido el 2026-11-07: esta
  nota decía por error que no había auto-deploy, y por eso cada sesión
  terminaba corriendo `npx vercel --prod` a mano de más). El repo
  `R1ve3raaTech/TicoFinanza` está conectado al proyecto `finanzascr`, así que
  un `git push origin main` construye y publica solo. Comprobado:
  `npx vercel git connect` responde "already connected", y el push de los
  cuatro commits de ese día creó el despliegue `finanzascr-nq2784xq9` sin que
  nadie lo pidiera. **Consecuencia: todo lo que llegue a `main` sale a
  producción**, así que lo que no esté para publicarse no se pushea.
  `npx vercel --prod` sigue sirviendo para forzar un deploy sin commit.
  Dominio de producción actual: `www.ticofinanza.com`.

## Dónde quedamos (2026-08-18)

Se quitó el dólar de toda la app (solo queda colones) y se agregó
selector de tema claro/oscuro/sistema. Deployado a producción.

- Cualquier correo bancario en otra moneda (USD, córdobas, euros) se
  convierte a CRC al parsear el correo, con el tipo de cambio en tiempo
  real de `open.er-api.com` (`lib/exchangeRate.ts`, sin API key, cacheado
  1h). La conversión pasa una sola vez en `parseEmail()`
  (`lib/parsers/index.ts`) — los parsers individuales de banco siguen
  devolviendo la moneda cruda que detectan (USD/NIO/CRC), no saben de
  tipos de cambio.
- "Moneda por defecto" en Ajustes se reemplazó por el selector de tema
  (`components/settings/ThemeSetting.tsx`, usa `next-themes`). La paleta
  clara se agregó en `app/globals.css` sin tocar la mayoría de los
  componentes porque el rediseño del 2026-08-15 ya había tokenizado casi
  todos los colores — los puntos con colores fijos que no pasaban por los
  tokens (botón de Google, botones destructivos rojos, texto blanco
  hardcodeado en /privacidad y /terminos) se migraron a tokens semánticos
  nuevos (`--danger`/`--on-danger`) o existentes.
- `supabase/migrations/0017_crc_only_theme.sql` ya la corrió Camil a mano
  en Supabase Studio (confirmado 2026-08-18): filas viejas en USD
  convertidas a colones, check constraints de `currency` endurecidos a
  solo `'CRC'`, y `user_settings.default_currency` renombrada a `theme`.
  No queda ninguna migración pendiente de correr.

## Dónde quedamos (2026-09-13)

Rediseño completo de la interfaz autenticada + nueva marca. Solo UI: no se
tocó `lib/`, Supabase, parsers ni lógica (la única consulta que cambió es el
perfil duplicado que el dashboard pedía y ya traía el layout). **No
commiteado ni deployado** al cierre: pendiente de que Camil lo revise.
Reemplaza varias decisiones de la nota del 2026-08-15 (segunda parte):

- **Estructura**: `components/shell/AppShell` → rail (`AppRail`, angosto
  con etiqueta abajo en md–xl, ancho desde xl) y barra de pestañas abajo en
  teléfono (`MobileTabBar`). Cada pantalla usa `PageHeader` (barra fija en
  teléfono, título de sección en escritorio). Cerrar sesión e instalar la
  app viven en el menú de cuenta del rail (`UserMenu`) y en Ajustes → Sesión.
- **Composición separada de datos**: `DashboardView`, `InsightsView` y
  `SettingsView` reciben props planas; los `page.tsx` solo consultan. Así la
  preview con datos falsos renderiza exactamente lo mismo.
- **Kit en `components/ui/`**: `Button` (primary/secondary/ghost/danger/
  danger-ghost; regla: una sola primary por pantalla), `Dialog` (único
  diálogo de la app: hoja inferior en teléfono, Escape, foco atrapado y
  devuelto; enfoca `data-autofocus`, no `autoFocus`), `Segmented`, `Field`/
  `Select`, `Switch`, `ToggleChip`, `Money` (signo siempre escrito;
  `tabular` en listas, proporcional en cifras sueltas grandes).
- **Tokens** (`app/globals.css`): neutros casi puros (ya no con tinte azul),
  dark `--ground #0a0a0b`. Escalas nuevas: radios `rounded-control/surface/
  dialog` y tipografía `text-display/figure/title/heading/label/meta/micro`.
  El acento celeste queda para acción primaria, foco, selección y links.
  **Las reglas base van en `@layer base`**: sin capa le ganaban a las
  utilidades de Tailwind v4 (un `outline-none` no sacaba el foco global).
- **Gráficos** (validados con el script de la skill `dataviz`):
  `--chart-income` pasó a teal `#0d9488` — emerald contra rosa daba ΔE 5.8
  en deuteranopía (falla); teal da 10.2. El de 6 meses sigue divergente. Los
  desgloses por categoría/banco son una sola serie → un solo color neutro
  (`--chart-neutral`), no un arcoíris; medidores neutro/ámbar/rosa con texto
  e ícono.
- **Marca**: no llegó asset definitivo, así que el símbolo (tres barras:
  pieza suelta arriba, barra partida con acento, barra entera abajo) vive en
  `components/brand/BrandMark.tsx` y `public/brand/mark.svg`. Íconos PWA,
  maskable, apple-touch, favicon (.ico con versión en grilla de píxeles para
  16/32) y badge de push salen de `node scripts/generate-brand-icons.mjs`.
  Si llega el asset real: cambiar la geometría en esos dos archivos y en el
  script, y volver a correrlo. El `og-image.png` y la captura de la landing
  se regeneraron desde la preview.
- **Preview**: ahora con grupo de rutas, `app/preview-tmp/(app)/dashboard|
  insights|settings` (con el shell) y datos en `app/preview-tmp/data.ts`;
  soporta `?empty=1` y `?from=&to=`. Se borra antes de commitear.
- **Entorno local**: en `.env.local` las variables sensibles (URL y claves
  de Supabase, claves y subject de VAPID) valen 11 caracteres, que coincide
  con el marcador `[SENSITIVE]` que deja `vercel env pull`. Por eso `/` y
  `/entrar` dan 500 en `next dev`, y `npm run build` falla en
  `/api/sync-gmail` (`lib/push/send.ts` valida VAPID al cargar el módulo).
  No es del código: el build pasa dándole valores de reemplazo solo al
  comando (claves VAPID descartables + URL de Supabase de prueba). Vercel
  compila en sus servidores con las variables reales.

(Los dos pendientes que quedaban acá —hidratación con reduced motion y el
monto en dólares del mockup— se resolvieron en la sesión del 2026-09-14,
ver nota abajo.)

## Dónde quedamos (2026-09-14)

Segunda pasada visual sobre la landing (`app/page.tsx` + `components/landing/`),
para alinearla con el rediseño de la app autenticada del 2026-09-13. Solo UI,
nada de `lib/`, Supabase, OAuth ni parsers. Commiteado y pusheado; deploy
pendiente de autorización aparte.

- **Fix crítico**: `MockupPreview.tsx` mostraba el resultado final de una
  compra en dólares (`-$12,90`) pese a que la app es CRC-first. Ahora el
  correo de origen sigue en USD (`Pago de $12.90 en Uber Eats`, así llega
  de verdad) pero el movimiento registrado queda en colones (`-₡6.500`) —
  el contraste entre las dos líneas es la demostración de la conversión, sin
  agregar texto aclaratorio (la fila usa posicionamiento absoluto a `top`
  fijo entre las 3 tarjetas; un texto más largo la hace desbordar sobre la
  siguiente). Verificado leyendo el texto del DOM directamente, no por
  captura: la animación CSS de esa fila (`mockup-result-2`) solo la deja
  visible ~180ms de cada ciclo de 9s, así que una captura normal casi
  siempre agarra el placeholder o un frame intermedio.
- **Hidratación con reduced motion** (pendiente documentado desde el
  2026-09-13): `Reveal`, `PasswordTrust`, `SupportedBanks` y `Footer`
  ramificaban el `initial` de Framer Motion según `useReducedMotion()`, que
  en el primer render del cliente no siempre coincide con lo que renderizó
  el servidor. Mismo fix que ya se había aplicado al gráfico de 6 meses:
  `initial` fijo siempre, solo la `duration` de la transición cambia con
  `reduce` (a 0). Confirmado sin errores de consola con Playwright
  (`reducedMotion: "reduce"`) en dark 1440 y light 390.
- **Bug nuevo encontrado en QA** (no estaba en el pedido, pero rompía el
  breakpoint 768 que sí pedían revisar): la nav del header aparecía en
  `md:` (768px), justo el punto con menos espacio — "Cómo funciona" se
  envolvía en dos líneas y chocaba con el logo. Se subió a `lg:` (1024px);
  por debajo el header se queda con logo + botón, igual que en móvil.
- **Reducir look SaaS**: kicker de sección (`font-mono text-accent` →
  texto neutro sobrio, el acento queda para CTA/links/foco); numeración de
  `StepsSection` (círculo con acento → "01/02/03" editorial, mismo lenguaje
  que `LegalSection` de /privacidad); `Features` pasó de una grilla de 8
  tarjetas idénticas a 4 filas agrupadas (Automatización/Control/Análisis/
  Tus datos) con el mismo patrón "etiqueta | contenido" que `SettingsRow`
  de la app; `Pricing` pasó de una grilla de 3 tarjetas a un trío inline sin
  caja; radios `rounded-2xl/xl` → escala compartida
  (`rounded-control/surface/dialog`); se quitó el marquee infinito de
  bancos del footer (prohibido explícitamente) por una fila estática.
- **Compactar**: padding vertical de todas las secciones unificado a
  `py-16` (antes variaba 14/20/24). Se fusionaron `PasswordTrust` +
  `PrivacySnippet` —dos secciones de confianza casi seguidas diciendo cosas
  relacionadas (acceso de solo lectura / Ley 8968)— en una sola sección
  "Seguridad"; `PrivacySnippet.tsx` se borró (contenido migrado). Se quitó
  el botón de login duplicado al final de Pricing (ya hay CTA en header,
  hero y cierre).
- **Coherencia con la app**: se quitó la fuente Montserrat por completo
  (`layout.tsx`, `globals.css` — quedaba huérfana, ya no la usa nada desde
  el rediseño del 2026-09-13) a favor de la tipografía compartida (Geist);
  header a `h-16` como el rail de la app; montos del mockup sin `font-mono`
  (igual que el `Money` component nuevo, que usa tabular-nums sobre la sans
  normal, no una fuente monoespaciada).
- QA con Playwright en 1440/1920/768/390/360, claro y oscuro, más capturas
  de detalle por sección. Sin overflow horizontal en ningún caso. `tsc`,
  `eslint` y `npm run build` (con placeholders de env — mismo caso conocido
  del `.env.local`, ver arriba) pasan limpios.

## Dónde quedamos (2026-10-31)

Reescritura completa: TicoFinanza dejó de leer correos y pasó a ser un
tracker de **registro manual**. Se eliminó el scope `gmail.readonly` y todo
el análisis de correos, junto con los módulos que dependían de ese flujo.
Esto deja sin efecto buena parte de las notas de 2026-07-29, 2026-07-30 y
2026-08-15 (tercera parte): ya no hay revisión de Google pendiente, ni CASA,
ni parsers de bancos.

**Decisiones que tomó Camil antes de empezar** (las cuatro cambian el
alcance, por eso quedan acá):

1. **Solo Google OAuth** con scopes básicos (`openid email profile`). Se
   borró el sistema de correo+contraseña que estaba sin commitear
   (`/registrarse`, `/recuperar`, `/nueva-clave`, `lib/auth/`, `docs/auth/`,
   `test/auth-*.mjs`, `scripts/check-auth-*.mjs`). Lo único que se rescató de
   `lib/auth/` fue `isProjectAuthCookie()` → `lib/supabase/cookies.ts`.
2. **Solo colones.** El pedido original pedía CRC/USD en las membresías; se
   mantuvo la decisión del 2026-08-18 de una sola moneda.
3. **Empezar limpio**: se eliminaron presupuestos, metas de ahorro, resumen
   con IA, notificaciones push, export CSV y suscripciones detectadas. Se
   conservó lo que no es un módulo de producto sino higiene de cuenta:
   perfil, tema, cerrar sesión, eliminar cuenta (con su código por correo) y
   PWA. También se eliminó el onboarding `/bienvenida`: el estado vacío del
   resumen cumple esa función.
4. **Migración agresiva**: `supabase/migrations/0019_manual_tracker.sql`
   **borra los movimientos importados de Gmail** además de las tablas. Ya la
   corrió Camil a mano en Supabase Studio (confirmado 2026-11-01); sigue sin
   haber acceso automatizado a la base — ver nota del 2026-08-15.

**Modelo de datos nuevo.** `transactions` queda solo con lo que anota la
persona (se le quitaron `gmail_message_id`, `is_automated` y `bank_name`) y
aparece `fixed_expenses`. El par `status` + `status_month` es la pieza a
entender: el estado "pagado" vale solo para el mes que dice `status_month`,
así que `effectiveStatus()` (`lib/fixedExpenses.ts`) lo devuelve como
pendiente en cuanto cambia el mes — el ciclo se reinicia solo, sin ningún
job de fondo.

**Gastos fijos vs. movimientos**: los fijos NO son transacciones. El resumen
hace ingresos − fijos − variables, así nada se cuenta dos veces; marcar
"pagado" no crea ningún movimiento. Por eso el gráfico de 6 meses (que sale
de `transactions`) no incluye los fijos, y lo dice en una línea debajo.

**Rutas**: `/dashboard` (resumen), `/dashboard/fijos`,
`/dashboard/movimientos`, `/dashboard/ajustes` (antes `/settings`;
`/insights` se eliminó).

**Fechas**: todo el calendario se resuelve en el servidor en hora de Costa
Rica y baja como claves `"YYYY-MM-DD"` (`dayKey()`); si el navegador
recalcula "hoy" por su cuenta, el día cae distinto y se rompe la
hidratación. Un cobro agendado el 31 se recorta al último día del mes
(febrero → 28/29). Cubierto en `lib/fixedExpenses.test.ts`.

**Gráficos** (reglas de la skill `dataviz`, ver también la nota del
2026-09-13):
- La dona de categorías usa **una sola rampa de celeste**, de más oscuro a
  más claro según cuánto pesa la categoría — no seis colores. Los pasos
  (`--chart-ramp-1..6` en `app/globals.css`) pasan los checks ordinales del
  validador (L monótona, ΔL ≥ 0.06, extremo claro ≥ 2:1) en claro y en
  oscuro, con el ancla invertida en dark. No reemplazar por un arcoíris.
- El de 6 meses sigue siendo el divergente de siempre
  (`components/charts/IncomeExpenseChart.tsx`, antes `MonthlyBarChart`).
- Rojo (`--expense`) para lo que vence en menos de 5 días, siempre con ícono
  y con el plazo escrito: nunca solo color.

**Assets regenerados** desde la preview temporal con Playwright:
`public/screenshots/dashboard.png` (1440×1232) y `public/og-image.png`
(el anterior decía "lee tus correos bancarios"). Si cambia el resumen, hay
que volver a generarlos — ocultando `nextjs-portal` con CSS, que si no el
indicador de dev sale en la foto.

**Dependencias que se fueron**: `@anthropic-ai/sdk`, `web-push`,
`@types/web-push`, `pdf-parse` y `@napi-rs/canvas` (y `serverExternalPackages`
en `next.config.ts`). También se vació `vercel.json` (el cron de sync) y se
borró el handler de push de `public/sw.js`.

**Estado**: `npm test` (8), `eslint`, `tsc` y `npm run build` pasan. QA con
Playwright en 1440 oscuro y 390 claro sobre las cuatro pantallas con sesión
(con datos y vacías), landing, entrar y privacidad: sin overflow horizontal
ni errores de consola, y los diálogos de alta/edición probados de verdad.
**No commiteado ni deployado** al cierre de esa sesión: quedaba pendiente que
Camil lo revise y corra la migración 0019 (ya corrida, ver 2026-11-01).

## Dónde quedamos (2026-10-31, segunda parte)

Sobre el tracker manual de la nota de arriba se agregaron cuatro módulos:
cuentas (billeteras) con transferencias internas, presupuestos por
categoría, metas de ahorro y exportación a CSV. La migración
`0020_multicount_budgets_goals.sql` (va después de la 0019) ya la corrió
Camil a mano en Supabase Studio, confirmado 2026-11-01.

**Lo que hay que entender antes de tocar esto:**

- **Los saldos los calcula la base, no la app.** `accounts.current_balance`
  y `savings_goals.current_amount` los mantienen triggers que *recalculan
  desde cero* (`refresh_account_balance` / `refresh_goal_amount`), no que
  suman deltas. Es más lento y es a propósito: con una edición, un borrado o
  un cambio de cuenta de un movimiento viejo, el saldo sigue dando bien. La
  app nunca escribe esas dos columnas.
- **Las transferencias viven en su propia tabla** (`transfers`), no como un
  tercer `type` en `transactions`. Mover plata de débito a efectivo no es ni
  ingreso ni gasto, y mezclarlo ahí obligaría a cada total, al superávit y a
  cada gráfico a acordarse de excluirlo. Separado, es imposible que se
  cuele. Lo mismo con los abonos a metas (`goal_contributions`).
  `lib/ledger.ts` las junta con los movimientos solo para mostrarlas en una
  lista, y `ledgerNet()` les da valor cero.
- **RLS protege lo que se escribe, no lo que se referencia**: la política de
  `transactions` solo exige que `user_id` sea el de la sesión, así que un
  `account_id` ajeno pasaría igual. Por eso toda acción que recibe un id de
  cuenta o de meta lo valida con `ownsRow()` (`lib/supabase/ownership.ts`)
  antes de escribir. Si se agrega otra tabla referenciada, va la misma
  comprobación.
- **Los presupuestos son por mes** (`month_year` "YYYY-MM"), no un tope
  eterno: un mes con vacaciones no tiene el mismo límite. El mes se navega
  por URL (`/dashboard/plan?mes=`) y hay un botón para copiar los del mes
  anterior. El gasto se mide contra movimientos **y** gastos fijos de la
  misma categoría (`expenseByCategory`), porque el tope es de la categoría.
- **Colores de los medidores**: verde <70 %, ámbar 70–100 % y rosa al
  pasarse, como pidió Camil explícitamente. Ojo que esto se aparta de la
  nota del 2026-09-13, que decía medidores "neutro/ámbar/rosa" para no usar
  el verde de ingreso de adorno; acá el verde significa "vas bien", y el
  estado igual lleva ícono y rótulo, nunca solo color.
- **Colores de las metas**: celeste, índigo, violeta y neutro
  (`--goal-*` en `app/globals.css`). Verde, rosa y ámbar quedan fuera porque
  significan ingreso, gasto y alerta; el color de una meta es
  personalización, no un dato.
- **Navegación**: cinco secciones (Resumen · Fijos · Movimientos · Plan ·
  Ajustes). "Plan" junta presupuestos y metas en dos pestañas que son links
  (`?ver=metas`), no estado de cliente. No agregar una sexta: a 360px la
  barra de teléfono ya usa `shortLabel` ("Movs.") para no truncar.
- **Cuentas**: el CRUD vive en el panel "Tus cuentas" del resumen, no en
  Ajustes. El campo editable es el saldo *inicial*; el actual se recalcula.
  Borrar una cuenta deja sus movimientos sin cuenta (`on delete set null`),
  pero sí borra sus transferencias (sin los dos lados no significan nada).
- **CSV** (`/api/export-csv?from=&to=`): separador `;` y BOM al inicio
  porque Excel en español, con coma, mete toda la fila en la primera
  columna y sin BOM se come los acentos. Incluye transferencias con monto 0
  y la cuenta como "origen → destino".
- La migración 0020 le crea una cuenta "Efectivo" a cada usuario que ya
  existía (y a los nuevos, desde `handle_new_user`) y le asigna los
  movimientos que no tenían cuenta. Arranca con saldo inicial 0: si el real
  no era 0, se corrige desde el resumen.

**Estado**: `npm test` (20), `eslint`, `tsc` y `npm run build` pasan. QA con
Playwright en 1440 oscuro y 360 claro sobre las cinco pantallas (con datos y
vacías), más pruebas reales de los diálogos de cuenta, transferencia,
movimiento con cuenta, tope y abono. Sin overflow horizontal ni errores de
consola. Captura de la landing y OG regeneradas. **No commiteado ni
deployado.**

## Dónde quedamos (2026-11-01)

Fase 3 sobre lo anterior: comprobantes adjuntos, deudas entre personas y
recordatorios push. Migración `0021_phase3_debts_receipts_push.sql`, que va
después de la 0019 y la 0020. **Camil corrió las tres a mano en Supabase
Studio el 2026-11-01**, así que la base ya tiene el esquema completo de las
tres fases y no queda ninguna migración pendiente.

**Comprobantes (`transactions.receipt_url`)**

- La columna guarda la **ruta** dentro del bucket privado `receipts`
  (`"<user_id>/<uuid>.jpg"`), **no una URL**. El nombre de la columna es el
  que pidió Camil; el contenido no es lo que el nombre sugiere, por eso está
  comentado en la migración y en el tipo. El bucket es privado porque un
  comprobante trae nombre, monto y a veces número de cuenta: con uno público
  bastaría un link filtrado para dejarlo expuesto para siempre. Cada vista
  pide una URL firmada de 10 minutos (`getReceiptUrl`).
- **Toda la seguridad vive en el primer segmento de la ruta**: la política de
  `storage.objects` solo compara `(storage.foldername(name))[1]` con
  `auth.uid()`. Por eso la ruta se arma siempre con `receiptPath()` y nunca
  con el nombre del archivo original (que puede traer barras o el nombre de
  la persona), y las acciones validan con `ownsReceiptPath()`.
- **El archivo sube desde el navegador, directo a Storage**
  (`lib/receiptUpload.ts`), no por una Server Action: una action tiene un
  tope de 1 MB de cuerpo y la foto de un recibo lo pasa sin esfuerzo. Antes
  de subir, las imágenes se reducen a 1600px/JPEG 0.82 con canvas; si falla
  (un HEIC que el navegador no decodifica) sube el original.
- Sube al elegir el archivo, no al guardar el formulario, así el error
  aparece cuando todavía se puede hacer algo. La contra es que un formulario
  cerrado sin guardar deja un archivo colgado: lo borra `close()` en
  `MovementDialog`. Reemplazar o quitar también borra el anterior, y borrar
  un movimiento (uno, varios o todos desde Ajustes) borra sus comprobantes.
- `<input>` **sin `capture`** a propósito: con `accept="image/*"` el teléfono
  ofrece cámara *y* galería. Con `capture` solo abre la cámara, y la captura
  del SINPE ya está guardada — quedaría inalcanzable.
- El clip de la lista es un **botón hermano** de la fila, no uno anidado
  (sería HTML inválido). La fila le reserva el espacio con `pr-*`, y el
  espacio se reserva en todas las filas visibles o en ninguna, para que los
  montos no queden desalineados.

**Deudas (`debts`)**

- Tabla aparte, misma razón que transferencias y abonos: prestar no es un
  gasto y que te deban no es un ingreso hasta que te pagan. No tocan el
  superávit hasta que se saldan.
- "Saldar" ofrece registrar el movimiento, **pero es opcional**: si te
  pagaron por SINPE al banco el ingreso tiene que existir; si te pagaron en
  efectivo que ya gastaste, forzarlo le mentiría a la cuenta. Si se registra,
  `settled_transaction_id` apunta al movimiento. **Reabrir borra ese
  movimiento** (lo creó la app, deshacer el pago tiene que deshacerlo o la
  plata se cuenta dos veces); **borrar la deuda no lo borra** (es plata que
  de verdad se movió).
- Viven en una **tercera pestaña de Plan** (`?ver=deudas`), no en una sexta
  entrada de navegación. A 360px las tres pestañas solo caben porque
  "Presupuestos" se acorta a "Topes".

**Recordatorios push**

- Vuelve `web-push`, que se había sacado en la reescritura del 2026-10-31.
  **Las claves VAPID ahora se leen de forma perezosa** (`ensureConfigured()`
  en `lib/push/send.ts`), no al cargar el módulo: así se arregla el problema
  conocido de que `npm run build` fallaba sin claves reales. Sin claves la
  app compila y funciona; lo único que no pasa es el envío.
- `node scripts/generate-vapid-keys.mjs` genera el par. Si la privada se
  cambia después, **todas las suscripciones existentes dejan de servir** y
  cada dispositivo tiene que volver a activar los recordatorios.
- **Dos cosas distintas en dos tablas**: `user_settings.reminders_enabled`
  dice si la persona los quiere (es de la cuenta) y `push_subscriptions` dice
  qué navegadores pueden recibirlos (es del dispositivo). El interruptor de
  Ajustes refleja lo segundo, que es lo que la persona está mirando:
  activarlo en la compu no hace que lleguen al teléfono.
- El aviso sale **a 2 días y a 1 día** del cobro (`lib/reminders.ts`). El día
  del cobro ya no se avisa: a esa hora el aviso no cambia nada y el resumen
  ya lo muestra en rojo.
- `push_reminders` evita el aviso repetido. **La clave es
  (gasto, día de cobro, días antes)**: sin `days_before`, el aviso de "mañana"
  se tomaría por repetido del de "pasado mañana" y nunca saldría. El registro
  se escribe **antes** de mandar, para que una caída en el medio no duplique.
- `/api/reminders` lo llama el cron de Vercel a las 13:00 UTC (7 a.m. de
  Costa Rica), autenticado con `CRON_SECRET`. **Sin el secreto el endpoint
  responde 503**, no queda abierto. Corre en el servidor y no en el navegador
  porque el aviso tiene que salir con la app cerrada, que es justo cuando uno
  se olvida del recibo. El botón "Mandar prueba" de Ajustes existe porque la
  cadena tiene muchas partes (permiso, Service Worker, suscripción, VAPID,
  servicio del fabricante) y la primera vez que falla no puede ser el día del
  vencimiento.

**Variables de entorno nuevas** (ver `.env.example`):
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y
`CRON_SECRET`. Van en `.env.local` y en Vercel.

**Un detalle de Tailwind v4 que costó un bug**: en las filas con un botón
absoluto a la derecha, `md:px-2` le gana a `sm:pr-24` — v4 ordena primero por
variante y después por propiedad, así que el `pr` hay que repetirlo en la
misma variante (`md:pr-24`). Se vio en la lista de deudas, con el monto
pintado debajo del botón "Saldar".

**Estado**: `npm test` (32, 12 nuevas entre deudas, recordatorios y rutas de
comprobantes), `eslint`, `tsc` y `npm run build` pasan. QA con Playwright en
1440 oscuro y 360 claro sobre las pantallas tocadas (con datos y vacías), más
21 comprobaciones reales de los diálogos de deuda, saldar, movimiento con
comprobante y el visor. Sin overflow ni errores de consola.

**Lo que NO se probó de punta a punta**: la subida real a Storage, el envío
real de un push y la corrida del cron. La base ya está migrada, pero sigue
sin poder probarse desde acá — el `.env.local` de este entorno trae
marcadores en vez de las claves de Supabase (nota del 2026-09-13), así que no
hay forma de abrir una sesión real en `next dev`. Son las tres cosas que hay
que mirar en producción, en este orden: adjuntar una foto a un movimiento,
activar los recordatorios y darle "Mandar prueba", y al día siguiente revisar
que el cron haya mandado el aviso de un gasto fijo que venza en uno o dos
días. Ojo con el segundo: **en iPhone el push solo llega si la app está
instalada en la pantalla de inicio**; en Safari a secas iOS no la entrega.

**Commiteado y deployado el 2026-11-01** (commit `3af1ef3`, las tres fases
juntas; deploy `dpl_9p8UGB9h38XoYdBLw7Dz7qcJ5EQ8`). Humo verificado contra
`www.ticofinanza.com`: landing 200, `/dashboard` 307 al login,
`/api/reminders` sin secreto 401 (o sea que `CRON_SECRET` está puesto — si
faltara daría 503) y `/sw.js` sirviendo el handler de push.

Las claves VAPID y `CRON_SECRET` **ya estaban en Vercel** de cuando la app
tenía push, antes de quitar Gmail: no hubo que generar nada. Reusar el par
viejo no dejó a nadie colgado porque la 0019 borró la tabla de suscripciones
y la 0021 la creó vacía.

Quedan en Vercel dos variables muertas de las funciones eliminadas,
`ANTHROPIC_API_KEY` y `GMAIL_TOKEN_ENCRYPTION_KEY`. No las usa nada; borrarlas
es irreversible (son "Sensitive", no se pueden volver a leer), así que quedó
pendiente de que Camil lo pida.

## Dónde quedamos (2026-11-01, segunda parte)

Camil pidió tres cosas sobre la app ya deployada: cierre de sesión por
inactividad, que lo de adentro se sienta más intuitivo y personalizado, y
que cada sección se explique. Sin tocar colores ni tipografías.

**Cierre por inactividad (15 min)**

- `lib/idle.ts` + `components/shell/IdleLogout.tsx`, montado en el layout de
  `/dashboard` (afuera no hay sesión que cerrar).
- **La cuenta va contra una marca de tiempo, no contra un `setTimeout`.** Si
  la máquina se suspende, el temporizador se congela con ella y al despertar
  la sesión seguiría abierta; comparando contra el reloj, una compu que
  durmió dos horas aparece vencida apenas se despierta.
- Aviso un minuto antes, con cuenta regresiva. Mientras el aviso está en
  pantalla la actividad suelta **no** reinicia el conteo: si bastara mover la
  rueda del mouse, el aviso se cerraría solo y nadie se enteraría de que
  estuvo por perder la sesión.
- `mousemove` no está entre las señales de actividad: un mouse apoyado en una
  mesa que tiembla mantendría la sesión abierta toda la tarde.
- La última actividad se comparte entre pestañas por `localStorage`, si no la
  pestaña de atrás se vence sola y saca de las dos. Una marca guardada en el
  futuro se descarta (reloj desajustado dejaría la sesión abierta para
  siempre).
- `signOutIdle()` usa alcance **local**, no global como `signOut()`:
  olvidarse una pestaña en el trabajo no es razón para cerrar la sesión del
  teléfono. Redirige a `/entrar?motivo=inactividad`, que lo explica.

**Personalización e intuición**

- El resumen abre con saludo por nombre y una frase que contesta "cómo
  vengo" con los números de la persona (`lib/greeting.ts`). La hora se
  resuelve **en el servidor** en hora de Costa Rica: calcularla en el
  navegador rompía la hidratación en la frontera de las 12 y las 19.
- `FirstSteps` reemplaza al "Empezá por acá" fijo de antes, que no sabía qué
  habías hecho ya. Son **tres** pasos (cuenta, fijos, un movimiento) y no
  cuatro: presupuestos y metas son opcionales, y en la lista el panel no
  desaparecería nunca para quien no los usa. El botón celeste está solo en
  el siguiente paso pendiente, que de paso respeta la regla de una sola
  acción primaria por pantalla.
- Con cero cuentas el panel "Tus cuentas" **no se muestra**: su estado vacío
  decía lo mismo que el primer paso, con otro botón al lado.

**Explicaciones**

- `PageHeader` ahora muestra la descripción de la sección **también en
  teléfono** (antes solo en escritorio, porque la barra de arriba es fija y
  compacta). Se reescribieron las cinco descripciones.
- Ajustes → **Guía de la app** (`components/settings/AppGuide.tsx`): qué hace
  cada sección y las tres confusiones reales — un gasto fijo no es un
  movimiento, una transferencia no es ingreso ni gasto, y una deuda no toca
  las cuentas hasta que se salda. Va en Ajustes y no en un tour al entrar:
  un tour se cierra una vez y después no hay forma de volver a verlo.

**Para QA con Playwright**: `page.clock.install()` sirve para simular los 15
minutos, pero **congela las animaciones de framer-motion**, así que el
diálogo queda en el DOM con opacidad 0 y las capturas salen en blanco. No
medir "¿se cerró?" por presencia del nodo — medir conducta (que la marca de
actividad se reinicie, que no redirija). Para una captura de verdad del
aviso, bajar un momento `IDLE_TIMEOUT_MS` y usar tiempo real.

**Estado**: `npm test` (44, 12 nuevas entre inactividad y saludo), `eslint`,
`tsc` y `npm run build` pasan. QA con Playwright en 1440 oscuro y 360 claro
sobre las cinco pantallas, más 13 comprobaciones de conducta. Sin overflow ni
errores de consola.

## Dónde quedamos (2026-11-02)

Dos cosas: un bug de datos que reportó Camil y el rediseño del layout de la
landing.

**Bug: los movimientos con fecha pasada "no se guardaban"**

Sí se guardaban. La lista los escondía. `app/dashboard/movimientos/page.tsx`
hacía `fromKey = hasRange ? from : primerDíaDelMes`, o sea que **sin filtro
puesto recortaba al mes en curso** — mientras el filtro de arriba mostraba
"Todo" marcado como activo. Anotabas algo del mes pasado, la lista no lo
mostraba y las cifras del resumen (que sí son del mes en curso, a propósito)
tampoco se movían: parecía que no se había guardado.

- La regla vive ahora en `movementsRange()` (`lib/dateRange.ts`), con
  pruebas: **sin rango en la URL no se filtra nada**. "Todo" dice la verdad.
- Además, el formulario avisa al elegir una fecha de otro mes: "Queda
  registrado en octubre, así que no entra en las cifras del resumen de este
  mes". El resumen es mensual a propósito; lo que faltaba era decirlo donde
  se toma la decisión.
- **Lección para el futuro**: si un filtro tiene una opción "Todo", la
  consulta por defecto tiene que coincidir con ella. Un default que no
  coincide con lo que el control dice es indistinguible de perder datos, y
  es lo que hace desconfiar de la app entera.

**Rediseño del layout de la landing** (pedido con la skill `frontend-design`;
colores y tipografías intactos, solo estructura)

El problema: siete bandas idénticas (todas `max-w-6xl`, todas `py-16`, todas
separadas por la misma línea, todas abriendo con el mismo trío "rótulo en
mayúsculas / título / bajada"). Se leía como una sola columna sin jerarquía.

- **Espina** (`components/landing/LandingSpine.tsx`): columna pegajosa a la
  izquierda con la sección activa marcada. Es el rail de la app, en la
  landing — que la página que vende el producto tenga otra gramática visual
  que el producto es una pequeña mentira sobre él. Reemplaza la navegación
  del encabezado, que solo existía de 1024px para arriba. En teléfono se
  esconde y el nombre de la sección va con el contenido (`SectionLabel`).
- El scroll spy es **una regla, no un IntersectionObserver**: la última
  sección cuyo borde superior pasó la línea de los 140px. Con alturas tan
  distintas (tres pasos contra una captura a pantalla completa) cualquier
  criterio de desempate entre secciones que cruzan una franja fallaba en
  algún punto del scroll.
- **Cada sección mide lo que necesita** (`measure` en el `Section` de
  `app/page.tsx`): las preguntas y el precio a ancho de lectura, las
  funciones y la captura a todo lo ancho. Esa diferencia es la que marca el
  ritmo — **se quitaron las líneas divisorias entre secciones**, que eran
  justo lo que hacía que todo se leyera igual.
- **Se fue `SectionHeading`** y con él el rótulo en mayúsculas espaciadas
  sobre cada título (el nombre de la sección ya está en la espina, donde
  además sirve para navegar). `components/landing/Reveal.tsx` quedó sin uso
  y se borró: con él se van los fade-up por sección, que eran movimiento
  decorativo repetido. Queda un solo momento animado, el del hero, más el
  acordeón de preguntas (que responde a una acción).
- **Bug encontrado de paso**: `AnchorLink` no reenviaba props, así que
  `aria-current` se perdía en silencio. Ahora hace spread del resto.

**Estado**: `npm test` (48, 4 nuevas sobre el rango), `eslint`, `tsc` y
`npm run build` pasan. QA con Playwright en 1440 oscuro y 1024/768/360 claro:
sin overflow ni errores de consola, más 9 comprobaciones de la espina y la
estructura.

## Dónde quedamos (2026-11-02, segunda parte)

Filtro de períodos, y una pasada de espacio sobre las pantallas con sesión.

**El filtro de movimientos pasa a períodos de calendario**

Eran ventanas móviles ("últimos 1/3/7/15/30 días"), que no es como nadie
piensa su plata: uno pregunta "¿cuánto llevo este mes?". Ahora son
**Todo · Hoy · Esta semana · Este mes · Mes pasado · Este año**, más el
rango a mano.

- **Las fechas las resuelve el servidor** (`resolvePeriod()` en
  `lib/dateRange.ts`); el navegador solo manda `?periodo=hoy`. El chip no
  hace ninguna cuenta de calendario.
- **Bug que esto arregló**: `presetRange()` armaba las fechas en el
  navegador con `toISOString()`, o sea UTC. Después de las 6 de la tarde
  hora de Costa Rica, "hoy" se iba al día siguiente y la lista salía vacía.
- **Segundo bug, más silencioso**: `startOfDayISO`/`endOfDayISO` parseaban
  sin offset, así que los límites salían en la zona del servidor — UTC en
  Vercel. "Este mes" arrancaba a las 6 p.m. del 31 del mes anterior y se
  perdía las últimas seis horas del 30. Ahora el offset va explícito
  (`-06:00`; Costa Rica no tiene horario de verano desde 1992).
- Mes y año van **completos**, no hasta hoy: un movimiento con fecha futura
  dentro del mes es válido y recortar en hoy lo escondería.

**Menos espacio muerto en las pantallas con sesión**

Medido antes y después con Playwright a 1440/1024/768/360. Ajustes a 1440:
**2581px de alto → 1985px**, y el contenido pasó de usar el 69 % del ancho
al 82 %.

- Las cuatro pantallas comparten ahora el ancho del resumen
  (`max-w-[1180px]`); estaban en 1000px y sobraban ~150px a la derecha en
  escritorio.
- `SettingsSection` y `SettingsRow` perdieron aire vertical (`pb-10/12` →
  `pb-7/9`, filas `py-3.5` → `py-3`) y la columna de etiquetas creció a
  200px, que es donde el texto dejaba de envolverse en dos líneas.
- **La guía de Ajustes se rehízo compacta** (tres columnas, sin el bloque
  citado por entrada): ocupaba los primeros 600px y empujaba el perfil fuera
  de la pantalla. Nadie entra a Ajustes a leer, entra a cambiar algo. Las
  tres aclaraciones que importan quedaron juntas al final de la guía.

**Para QA**: la preview no puede probar el clic en los chips del filtro —
`DateRangeFilter` navega a `/dashboard/movimientos`, que sin sesión redirige
a `/entrar`. Se comprueban las dos mitades por separado: que el chip escribe
`?periodo=` y que el servidor filtra por ese parámetro (navegando directo).

**Estado**: `npm test` (53, 8 nuevas sobre períodos y husos), `eslint`, `tsc`
y `npm run build` pasan.

## Dónde quedamos (2026-11-02, cuarta parte)

Cuatro cosas de la pantalla de entrada y una de saldos.

**El saldo de una cuenta no cuadraba (no era un bug de cálculo)**

Camil reportó una cuenta con ₡3.000 reales que mostraba −₡4.100. La resta
estaba bien; lo que faltaba era el punto de partida. El formulario pedía
**"Saldo inicial"** con la ayuda *"lo que hay en la cuenta hoy, antes de
registrar movimientos"*, que se contradice sola: quien pone 0 (o lo deja
vacío) y después anota gastos termina con un saldo que no es el suyo.

- Ahora el campo pide **el saldo de hoy**, que es el número que la persona
  puede comparar contra su banco. Al guardar, la acción ajusta
  `initial_balance` por la diferencia (`initial + (deseado − actual)`) y el
  trigger recalcula el actual. Los movimientos no se tocan.
- En una cuenta nueva no hay movimientos, así que lo de hoy es el punto de
  partida y se guarda tal cual.
- Hay una ventana de carrera mínima entre leer el saldo actual y escribir el
  inicial; con un usuario por cuenta son milisegundos y se corrige volviendo
  a ajustar. Está comentado en `updateAccount`.

**Cierre por inactividad: ahora es un modal**

`components/auth/IdleNoticeDialog.tsx`, sobre `/entrar?motivo=inactividad`.
Antes era una línea de texto debajo del botón y se perdía entre el resto:
quien vuelve a la pestaña ve la pantalla de entrada y piensa que algo se
rompió. El modal dice por qué pasó y que no se perdió nada.

**Términos con casilla explícita**

Antes el consentimiento era implícito ("al entrar aceptás los términos", en
letra chica). Ahora hay que marcar la casilla.

- Es un `<input type="checkbox">` nativo con su `<label>`, y **los enlaces
  legales van fuera de esa etiqueta**: un enlace dentro de un label hace que
  tocarlo marque la casilla además de abrir la página. El primer intento fue
  un `<button role="checkbox">` con los enlaces dentro del label y alternaba
  dos veces (quedaba igual que antes del clic).
- El botón de Google **queda habilitado** aunque falte marcar: uno
  deshabilitado no recibe foco ni explica por qué no anda. Al tocarlo sin
  marcar, muestra el error y manda el foco a la casilla.

**Rediseño de `/entrar`**

- El panel derecho muestra el producto (`HeroMockup`, el mismo de la
  landing) en vez de tres párrafos de promesas: la pregunta de quien está
  por entrar es "¿qué voy a ver adentro?".
- Entrada escalonada con `animate-fade-up`, la utilidad que **ya existe** en
  globals.css y que respeta `prefers-reduced-motion`. No se agregaron
  animaciones nuevas ni se tocó globals.css.
- En teléfono el panel derecho no se muestra, así que los tres puntos van
  resumidos a una línea cada uno debajo del botón.

**Estado**: `npm test` (53), `eslint`, `tsc` y `npm run build` pasan. QA con
Playwright a 1440/1024/768/360: sin overflow ni errores de consola, más 8
comprobaciones de la casilla y el modal.

## Dónde quedamos (2026-11-02, quinta parte)

**Hay una migración sin correr: `0022_fixed_expense_payments.sql`.** Agrega
`transactions.fixed_expense_id`. Las consultas del resumen y de Plan ya la
usan (`.is("fixed_expense_id", null)`), así que **deployar antes de correrla
rompe las dos pantallas**. Primero la migración, después el deploy.

**Marcar un gasto fijo como pagado ahora mueve el saldo**

Era un hueco: `fixed_expenses.account_id` se guardaba y no se usaba para
nada. Marcabas el alquiler como pagado y el saldo de la cuenta quedaba
intacto, así que el número de la app se alejaba del banco el total de los
fijos, todos los meses.

- Marcar pagado abre `MarkPaidDialog` con un interruptor **prendido** para
  descontarlo de la cuenta, igual que "Saldar" en deudas. Desmarcar borra el
  movimiento de este ciclo (si lo creó la app, deshacer el pago tiene que
  deshacerlo).
- **El movimiento generado NO cuenta como gasto variable.** El resumen hace
  ingresos − fijos − variables y los topes miden movimientos MÁS fijos: sin
  excluirlo, el alquiler sumaría por los dos lados. Por eso la columna
  `fixed_expense_id` y el filtro en las consultas del resumen y de Plan. Sí
  cuenta para el saldo de la cuenta, que es justo el punto, y se ve en
  Movimientos.
- El gráfico de 6 meses también los excluye: si no, los meses en que
  marcaste pagado no serían comparables con los que no.

**El neto del mes ahora distingue lo ejecutado de lo comprometido**

`monthSummary` devuelve `net` (ingresos − variables − fijos **ya pagados**)
y `projectedNet` (restando todos). La tarjeta muestra el ejecutado y dice
aparte cuánto falta por pagar, sin pintarlo de rojo.

Esto salió de una pregunta real de Camil: el día 2 del mes la tarjeta decía
"Déficit neto −₡15.100" cuando lo único que pasaba era que el salario no
había entrado y todos los fijos ya restaban. Un número que alarma todos los
primeros de mes deja de mirarse.

**Saldo proyectado**: bajo el saldo total, "si pagás los ₡X de fijos que
faltan → ₡Y". **No suma ingresos esperados**: la app no tiene gastos ni
ingresos recurrentes de entrada, no sabe cuándo entra tu salario, y
proyectar con un número inventado sería peor que no proyectar. Si algún día
hay ingresos recurrentes, ese término se agrega acá.

**Se eliminó el calendario del resumen**: contestaba lo mismo que "Próximos
pagos", que estaba al lado. Se fueron `PaymentCalendar.tsx`, `calendarMonth()`
y `CalendarDay` de `lib/fixedExpenses.ts` con su prueba, y se actualizó toda
la copia que lo mencionaba (landing, /entrar, /privacidad, /terminos, el alt
de la captura y la meta description). La captura
`public/screenshots/dashboard.png` se regeneró (1440×1334).

**Estado**: `npm test` (56, 4 nuevas sobre ejecutado vs. proyectado),
`eslint`, `tsc` y `npm run build` pasan. QA con Playwright a 1440/1024/360
sobre resumen y fijos: sin overflow ni errores de consola, más 6
comprobaciones del neto, la proyección, la ausencia del calendario y el
diálogo de marcar pagado.

## Dónde quedamos (2026-11-03)

Cuatro módulos sobre lo de la sesión anterior. La migración 0023 ya la
corrió Camil (confirmado 2026-11-03).

La `0024_offline_client_id.sql` (columna `transactions.client_id` con
índice único parcial por `(user_id, client_id)`) **también la corrió
Camil**, antes del deploy. No queda ninguna SQL pendiente.

**Commiteado, pusheado y deployado** (commit `0e2776e`, deploy
`dpl_3z83JRqAKcvD2tFMggz5wgmJurLy`, aliaseado a `www.ticofinanza.com`).

**Ojo con el CLI de Vercel**: `npx vercel --prod` terminó imprimiendo
`{"status":"error","reason":"deploy_failed","message":"Not authorized"}`
**aunque el deploy sí salió**. El build corrió, la función quedó lista y
el alias de producción apunta a ese despliegue; lo que falló fue un paso
posterior del CLI. Si vuelve a pasar, no redeployar a ciegas: comprobar
con `npx vercel inspect www.ticofinanza.com` qué despliegue sirve el
dominio y cuándo se creó, antes de concluir nada.

**Lo que NO se pudo verificar desde acá**: las pantallas con sesión. El
middleware manda todo `/dashboard/*` sin sesión a `/entrar` antes de
enrutar, así que desde afuera una ruta nueva y una inventada responden
igual (307) — no sirve para distinguir si algo se deployó. Humo público
verificado: landing, `/entrar`, `/privacidad`, `/terminos` y `/sw.js` en
200, y `/api/reminders` sin secreto en 401.

**Confirmado por Camil en producción** (capturas, 2026-11-02):

- Se guarda un movimiento → la migración 0024 está aplicada y el camino
  de escritura funciona.
- **La subida de comprobantes a Storage sirve** (el clip aparece en la
  fila). Era uno de los tres pendientes desde la Fase 3 del 2026-11-01.
- El reporte mensual cuadra con los números revisados a mano: fijos
  15.100, pendientes 6.000, neto ejecutado −9.101, proyectado −15.101,
  porcentajes 60/23/17.
- **El filtro `fixed_expense_id` funciona en producción**: Claude Code
  Pro está marcado como pagado (o sea que generó su movimiento) y aun
  así pesa ₡9.100 una sola vez en el desglose; los variables dan ₡1.
- El estado vacío de "Ingresos por categoría" se omite entero, como debe.

**Todavía sin confirmar en producción**: el prorrateo anual (la meta que
se creó para probarlo quedó como meta normal, sin recurrencia), el panel
de aguinaldo, la salida real de impresión del reporte, la cola sin señal,
el envío de un push y la corrida del cron.

**Ingresos fijos con confirmación de un toque** (migración 0023)

- Tabla `fixed_incomes` aparte de `fixed_expenses`: se parecen en la forma
  (monto, día, cuenta) y no en el comportamiento. Un gasto fijo vencido es
  una deuda y va en rojo; un ingreso que no llegó es otra cosa, y lo que
  vence sin confirmar **no se pinta de rojo** — el rojo de esta app
  significa plata que sale.
- **No se registra solo al llegar la fecha.** Aparece en el resumen para
  confirmarlo, con el monto editable: el caso real es la quincena que vino
  distinta por un rebajo o unas horas extra. Insertarlo automático dejaría
  el saldo mintiendo cada vez que el depósito se atrasa.
- Una quincena son dos días de pago en la misma fila (`second_pay_day`), no
  dos ingresos que haya que mantener a la par.
- Viven en **Fijos → Ingresos** (`?ver=ingresos`), no en una sexta sección.
- Con esto el saldo proyectado quedó completo: "si entran ₡X y pagás ₡Y de
  fijos". Solo cuenta ingresos declarados como fijos; nunca inventa plata.

**Prorrateo de metas anuales** (columnas `recurrence` y `cycles_completed`
de la 0023)

- No es un módulo nuevo: una meta ya tenía monto, fecha y ritmo mensual. Un
  módulo paralelo habría sido la tercera forma de apartar plata en la app.
- **"Ya lo pagué" hace tres cosas que son una sola idea**: borra los abonos
  (esa plata vuelve al saldo de la cuenta), registra el gasto real (que la
  saca) y corre la fecha un año. El neto es cero si pagaste justo lo
  apartado y es la diferencia si el recibo vino más caro. Por eso el monto
  se pide: el marchamo de este año casi nunca es el del anterior.
- Los abonos del ciclo que cerró se pierden como historial; lo que queda es
  el movimiento del pago, que es el dato que sirve después.
- El salto de ciclo va condicionado a `cycles_completed` **y** `target_date`
  leídos antes (compare-and-swap), igual que marcar un gasto fijo pagado:
  dos toques seguidos no registran el pago dos veces.
- Ir atrasado se muestra en tinta, no en rosa: es un dato para ponerse al
  día, no plata que sale.

**Panel de aguinaldo** (Fijos → Ingresos, debajo de los ingresos fijos)

- Ventana del 1.º de diciembre al 30 de noviembre, entre doce. Lo que nadie
  tiene claro no es la fórmula sino que no es por año calendario, así que
  la ventana va **escrita con fechas**.
- Cuenta **solo la categoría "Salario"** (`AGUINALDO_CATEGORY`). Sumar todo
  ingreso daría un número más grande y falso.
- Los meses sin salario anotado se nombran en el texto además de la tira de
  doce celdas: el `title` del hover no existe en teléfono.
- **El mes que corre no cuenta como hueco**: marcarlo el 1.º de cada mes
  sería un reclamo por un salario que todavía no tenía por qué entrar.

**Reporte mensual** (`/dashboard/reporte?mes=`, enlace en Ajustes → Datos)

- **Sin dependencias**: `window.print()` + `@media print`. El diálogo del
  navegador guarda en PDF en escritorio, Android e iOS. Una librería de PDF
  pesa cientos de kilobytes, redibuja con su propio motor y rompe las
  tildes al cambiar de fuente.
- Los estilos viven en `components/report/ReportPrintStyles.tsx`, **no en
  `app/globals.css`**: solo existen para esa pantalla.
- El papel se fuerza a blanco aunque la app esté en oscuro; `break-inside:
  avoid` por sección y fila; `table-header-group` para que el encabezado se
  repita por hoja. El rail y la barra de pestañas se ocultan con `print:`
  desde `AppShell`.
- El movimiento que generó marcar un fijo pagado **no** cuenta en el
  desglose (ya pesa como fijo) pero **sí** sale en la lista: el desglose
  tiene que cuadrar consigo mismo y la lista contra el banco.
- Los porcentajes se redondean uno por uno y pueden no dar 100 exacto.
  Cuadrarlos obligaría a mentir en una fila.
- Un reporte del mes en curso dice hasta qué día llegan los datos.
- **Ojo con `capitalize` de Tailwind**: pone mayúscula en cada palabra
  ("Octubre De 2026"). Para español va `first-letter:uppercase`.

**Guardado offline de movimientos** (`lib/offline.ts`, `lib/offlineDb.ts`,
`components/offline/`)

- Cola en IndexedDB para anotar sin señal. Se guarda la *intención*, no el
  movimiento: al mandarlo se llama la misma Server Action, así que no hay
  un segundo camino de escritura que valide distinto.
- Los pendientes **se ven**, arriba de la lista y separados de ella.
  Guardar en silencio es indistinguible de perder el dato (ver el bug del
  filtro "Todo", 2026-11-02).
- **Editar y borrar no se encolan**: tocan una fila que ya existe, y
  resolverlas a ciegas desde una cola local pierde la edición hecha en otro
  dispositivo.
- Fallo de red → se reintenta. Rechazo del servidor → no, se muestra el
  motivo. Sin esa distinción la cola crece sola con algo que nunca entra.
- **Dos trampas que costaron bugs**: (1) en IndexedDB los manejadores de la
  transacción hay que engancharlos de corrido, sin `await` en el medio — la
  transacción se cierra apenas se vacía la cola de microtareas y un
  `tx.oncomplete` tardío no se llama nunca; (2) `redirect()` de Next llega
  al cliente como excepción con `digest` "NEXT_…", y con la sesión vencida
  eso marcaba toda la cola como fallida (`isFrameworkNavigation`).
- **El vaciado corre desde la página**, no desde el Service Worker.
  Background Sync mandaría con la app cerrada, pero un SW no puede llamar
  una Server Action.
- **La cola está atada al usuario, en dos capas.** En el navegador, cada
  pendiente guarda su `userId` y la app solo lista y manda los suyos
  (`QueueOwnerProvider` en el layout de /dashboard): IndexedDB es del
  origen y no de la sesión, así que en una compu compartida sobrevive al
  cierre de sesión, y sin dueño lo que anotó una persona se le mostraría a
  la siguiente **y se mandaría a su cuenta**. En el servidor,
  `addTransaction` recibe `expectedUserId` y rechaza el movimiento si no
  coincide con la sesión (`WRONG_SESSION`): el filtro del navegador no
  alcanza porque `owner` se fija al dibujar la pantalla y la acción
  escribe con la cookie del momento — una pestaña vieja tras un cambio de
  cuenta escribiría donde no va. El rechazo deja el pendiente intacto, sin
  gastar un intento. **El control real es el del servidor**; el del
  navegador es para no mostrar datos ajenos.
- Lo de otra persona no se borra —es un gasto sin registrar— pero queda
  invisible hasta que vuelva a entrar. Al eliminar la cuenta sí se borra
  lo suyo.
- **Deduplicación real** (migración 0024): cada movimiento anotado lleva un
  `clientId` que genera el navegador, y el índice único
  `(user_id, client_id)` hace que un reintento no inserte dos veces. Es el
  caso de la red móvil mala: el pedido llega, la fila se inserta y la
  respuesta se pierde, así que el navegador cree que falló y reintenta.
  `addTransaction` trata el error 23505 como éxito, porque lo es.
  El formulario usa el **mismo** `clientId` para el intento con señal y
  para el que queda en la cola, que es lo que cierra esa ventana.
- **Lo que sigue sin existir**: caché de la app para abrirla sin señal
  desde cero. Hoy, sin datos y con la app cerrada, la página no carga. Un
  caché de páginas en una app de plata muestra saldos viejos, así que si se
  hace, tiene que decir "datos de la última vez" en pantalla.

**Estado**: `npm test` (131), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright a 1440 oscuro y 768/390/360 claro sobre metas, ingresos
fijos, aguinaldo, reporte (incluida la vista de impresión emulada) y la
cola offline con la red cortada de verdad. Sin overflow horizontal.


## Dónde quedamos (2026-11-02, descarga)

Nueva ruta pública `/descargar` para ofrecer el APK de Android, pedida por
Camil. **El APK todavía no existe**: no hay carpeta `android/` ni
Bubblewrap/Capacitor en el proyecto.

- **El botón solo aparece si el archivo está de verdad.** La página
  comprueba `public/downloads/TicoFinanza.apk` con `statSync` en el
  servidor (`app/descargar/page.tsx`). Sin archivo no se dibuja ningún
  botón: una descarga que responde 404 deja a la persona creyendo que la
  app está rota, y es un error que nadie reporta porque parece culpa del
  teléfono. Para publicarlo: poner el archivo ahí y volver a deployar; la
  ruta es estática, así que se resuelve al construir.
- **NO se quitó la instalación como PWA**, aunque el pedido decía
  "remover los componentes antiguos de agregar a pantalla de inicio". Un
  APK es solo Android: quitarla dejaría a iPhone y a escritorio sin
  ninguna forma de instalar. Quedan las dos vías, separadas y rotuladas.
- `components/download/PwaInstall.tsx` **siempre muestra algo**, al revés
  que `InstallAppButton`, que se esconde cuando el navegador no ofrece el
  aviso nativo (iOS siempre). En una página titulada "Descargar", un
  espacio vacío se lee como que no hay forma de instalar.
- Misma razón en Ajustes → Sesión: la fila "Instalar la app" ya no
  desaparece cuando no hay aviso nativo; en ese caso enlaza a
  `/descargar`.
- Enlazada desde el pie de la landing y agregada al sitemap: una página
  que nadie enlaza es una página que nadie encuentra.
- **Tres tarjetas, una por plataforma** (Android, iPhone/iPad, Windows),
  en cuadrícula de 3 columnas desde 768px y apiladas en teléfono. Todas
  con la misma forma —ícono, para qué es, la acción, pasos numerados—
  para poder compararlas de un vistazo.
- **Windows no ofrece archivo descargable, a propósito.** El paquete que
  PWABuilder genera para instalar a mano (`TicoFinanza.sideload.msix`)
  **no sirve suelto**: `install.ps1` necesita el `.msix` y
  `utils/pwainstaller.exe` en la misma carpeta. Instalar desde la barra
  de Edge o Chrome es un clic y cero archivos. El `.appxbundle` es para
  subir a la Microsoft Store, no para repartir.
- El botón de "instalar desde el navegador" va en la fila de acciones y
  no en el pie: en el pie dejaba una divisoria colgando sin nada debajo
  cuando el navegador no ofrece el aviso nativo, que es casi siempre.
- **`public/.well-known/assetlinks.json`** (generado por PWABuilder, ya
  commiteado) es lo que hace que el TWA de Android abra sin barra de
  direcciones. La huella que trae tiene que ser la de la llave que firma
  el APK: si se regenera con otra llave, hay que actualizarlo.
- **Los paquetes de PWABuilder NO van en el repo.** El 2026-11-02 se
  descomprimieron en la raíz (el proyecto de Xcode de iOS quedó en
  `src/`, que es justo donde Next busca una ubicación alternativa del
  proyecto) y se movieron a `Desktop/TicoFinanza-paquetes/`. Si vuelven a
  aparecer ahí, mismo destino.

**Para generar el APK** (cuando se haga): es un TWA con Bubblewrap sobre
`https://www.ticofinanza.com/manifest.webmanifest`. Dos cosas que hay que
saber antes: (1) sin `public/.well-known/assetlinks.json` con la huella
SHA-256 de la llave de firma, el TWA abre con barra de direcciones
visible y no se ve como app; (2) **un TWA no da offline** — es Chrome en
una caja, así que sigue necesitando el caché de pantallas que está
pendiente desde la nota anterior.


## Dónde quedamos (2026-11-02, caché sin conexión)

La app ya abre sin señal. Antes cualquier navegación pedía al servidor y
caía en la pantalla del dinosaurio — incluso moverse entre secciones, que
en App Router también pega a la red (los pedidos `?_rsc=`).

**Service Worker** (`public/sw.js`, antes era un passthrough vacío):

- **Inmutables al caché primero** (`/_next/static/`, `/brand/`, íconos):
  tienen hash en el nombre, su contenido no cambia.
- **Pantallas: red primero, caché solo si la red falla.** Al revés
  mostraría datos viejos a alguien con señal, que es lo que hay que
  evitar. Lo que se guarda es el HTML ya renderizado, así que trae los
  datos dentro.
- **`/entrar` y `/auth/*` no se guardan**: deciden a dónde mandarte según
  la sesión, y una copia vieja puede dejarte en un login cuando ya
  entraste.
- **Los `?_rsc=` tampoco.** Cuando fallan, Next cae a pedir el documento
  entero, que sí sale del caché. Guardarlos sería una segunda copia de
  los datos que podría no coincidir con el HTML guardado.
- `/sin-conexion` se precachea al instalar: es el respaldo para una
  pantalla que nunca se abrió.
- `VERSION` en el archivo invalida todo lo guardado al subirla.

**El aviso de datos viejos es la salvaguarda de todo esto**
(`components/offline/OfflineBanner.tsx`). Sin él, el caché sería una
trampa: la app abriría mostrando saldos viejos con la misma cara de
siempre.

- La hora la arma el **servidor** al generar la pantalla y queda escrita
  en el HTML (`renderedAt` en el layout de /dashboard). Cuando ese HTML
  sale del caché, el texto dice la hora en que se generó, que es la
  antigüedad real de lo que se está viendo. Calcularla en el navegador
  daría la hora de ahora — justo la mentira a evitar.
- **`navigator.onLine` solo NO alcanza.** Se lo vio reportar "con señal"
  con la red cortada, justo después de navegar. Como de esto depende que
  se avise, el banner hace un pedido de verdad (`/manifest.webmanifest`
  con `cache: "no-store"`) y decide con eso.

**Privacidad: lo guardado no sobrevive a la sesión.** El servidor manda
las pantallas con `Cache-Control: private, no-cache, no-store` —
comprobado— y la Cache Storage API **no respeta esa cabecera**, así que
guardar ahí es pasarle por encima a propósito. Eso solo es aceptable si
lo guardado desaparece cuando la sesión termina:

- **Cada caché lleva el id de su dueño en el nombre**
  (`tf-pages-v2-<userId>`) y el worker solo sirve si la **marca de
  sesión** dice que esa misma persona tiene sesión abierta. Sin marca no
  sirve nada: falla cerrado. La marca vive en su propia base
  (`ticofinanza-sesion`), la escribe `QueueOwnerProvider` y la borra
  `endSession()` (`lib/pageCache.ts`).
- **Se borra en TODAS las salidas**, y **siempre antes** de llamar a la
  acción del servidor: esa puede no llegar sin red, y lo local tiene que
  irse igual. Botón de cerrar sesión, cierre por inactividad y la
  pantalla `/entrar` sin sesión — esta última atrapa lo
  que no pasa por un botón (cookie vencida, sesión invalidada en el
  servidor). La corrección de la nota anterior: decir que el cierre por
  inactividad no debía borrar confundía *el dispositivo* con *la sesión*.
  Si la sesión terminó, mostrar saldos está mal sin importar quién esté
  enfrente.
- **El borrado va directo desde la página** con `caches.delete`, que se
  puede esperar y funciona sin worker activo. Antes mandaba un mensaje al
  worker sin esperar respuesta: si no estaba listo, el mensaje se perdía
  en silencio y quedaba todo guardado creyendo que se había borrado.
- **La marca vence a las 12 horas** (`MARK_MAX_AGE_MS`, en los dos
  archivos). La marca dice "hubo sesión viva hace poco", no "hay sesión
  ahora": quien cierra el navegador sin salir no pasa por ningún borrado,
  y sin vencimiento su marca autorizaría a leer el caché para siempre.
  Doce horas cubre el caso real (abrir la app en la casa, leerla sin
  señal en el bus) y acota la ventana. Se refresca sola en cada pantalla.
  Al vencer, el worker además **borra** lo guardado.
  *Detalle*: tras revalidar, la primera visita no se guarda — el worker
  decide antes de que la pantalla refresque la marca. La segunda sí.
- **La marca solo se refresca desde una pantalla recién hecha por el
  servidor** (`isFreshRender`, 2 minutos de tolerancia). Si una pantalla
  guardada pudiera refrescarla, abrir la app sin señal renovaría el
  permiso de leer el caché y el vencimiento no vencería nunca: el permiso
  se renovaría leyendo aquello mismo que autoriza. La prueba de sesión
  viva tiene que venir del servidor. Si el reloj del dispositivo está muy
  corrido respecto al del servidor, la marca deja de refrescarse y el
  modo sin conexión se apaga a las 12 horas — falla cerrado, a propósito.
- **Vencimiento de lo guardado a los 7 días** (`MAX_AGE_MS`), como tope
  de afuera: lleva la hora en una cabecera propia y se descarta en vez de
  mostrar números de hace semanas.
- `/sin-conexion` vive en el caché de **estáticos**, no en el de
  pantallas: no lleva datos de nadie y tiene que seguir ahí después de
  cerrar sesión.

**Lectura sin conexión: no hay un segundo almacén de datos.** Lo que se
consulta sin señal sale del HTML guardado, que ya trae los números
renderizados; escribir va por la cola de IndexedDB que ya existía. Un
espejo de los datos en IndexedDB sería una segunda fuente de verdad que
puede discrepar con el servidor, y en una app de plata eso es peor que
no tener modo sin conexión.

**Las pantallas del dashboard SÍ se guardan** aunque salgan con
`no-store`: la Cache Storage API ignora esa cabecera. Está comprobado con
una pantalla dinámica de verdad, no solo con páginas públicas — la
primera QA solo probó públicas y eso dejaba sin verificar justo el caso
que importa.

**Para probar el Service Worker hay que usar el build de producción**
(`npm run build` + `next start`), no `next dev`. En desarrollo los chunks
cambian de nombre y el caché sirve los viejos, así que se prueba código
que ya no existe — pasó en esta sesión y parecía un bug del banner.

**Lo que sigue sin existir**: abrir sin señal una pantalla que nunca se
visitó con señal. Esa cae en `/sin-conexion`, a propósito: inventar la
pantalla sin datos sería peor.

**Estado**: `npm test` (131), `eslint`, `tsc` y `npm run build` limpios.
QA con Playwright contra el build de producción, con la red cortada de
verdad: 11 comprobaciones — que el worker controle la pestaña, qué
pantallas se guardan y cuáles no, que recargar sin señal no falle y
muestre la pantalla real, que una nunca abierta caiga en el respaldo, que
el aviso aparezca con la hora correcta y desaparezca con señal, y que
cerrar sesión borre lo guardado.


## Dónde quedamos (2026-11-02, atajos y portada)

**Accesos rápidos del ícono** (`shortcuts` en `app/manifest.ts`). Al
mantener apretado el ícono de la app instalada aparecen "Anotar un gasto"
y "Anotar un ingreso".

- Apuntan a `/dashboard/movimientos?nuevo=gasto|ingreso`, **no** a una
  ruta propia: el formulario es un diálogo, no una pantalla, y una ruta
  aparte obligaría a mantener el mismo formulario dos veces. El pedido
  original decía `/movimientos/nuevo?tipo=`, que en esta app no existe —
  un atajo a una ruta inexistente es un 404 en el menú del sistema.
- El parámetro lo lee `page.tsx` y baja como `autoOpen` hasta
  `MovementEntryProvider`, que abre el diálogo con esa pestaña marcada.
  Cualquier otro valor se ignora: un parámetro raro no debería abrir un
  formulario a medias.
- Solo dos. Android muestra hasta cuatro, pero a más atajos menos sirve
  cada uno.

**Portada**: botón secundario "Instalar la app"
(`components/landing/InstallCta.tsx`) y dos datos nuevos en la fila de
objeciones (funciona sin señal, Android o navegador).

- **Secundario, no primario**: la acción principal de la portada sigue
  siendo entrar, y la regla de una sola acción primaria por pantalla
  vale también acá.
- Usa el aviso nativo del navegador cuando lo hay y si no lleva a
  `/descargar`. **El rótulo es el mismo en los dos casos**: cambia el
  elemento, no lo que se lee, porque un texto que cambia al hidratar es
  un parpadeo en el botón principal de la portada.
- Lo estético se mantuvo corto a propósito: **un** resplandor quieto y
  muy tenue detrás de la captura, y **un** levantado al pasar el puntero.
  Nada que se repita solo. El pedido hablaba de glow, micro-interacciones
  y "tarjetas destacadas"; lo último habría revertido el rediseño del
  2026-09-14, que sacó justamente las tarjetas de `Features` y el acento
  decorativo para bajarle el look SaaS. Si alguna vez se quiere, que sea
  una decisión tomada, no un efecto colateral.
- La fila de insignias lleva `max-w-[26rem]` para que envuelva dos y dos:
  suelta, en escritorio quedaban tres arriba y una huérfana abajo.

**Estado**: `npm test` (138), `eslint`, `tsc` y `npm run build` limpios.
QA con Playwright contra el build de producción a 1440 oscuro y 768/390
claro: los dos atajos declarados, con ícono, y **sus URLs respondiendo de
verdad** (307 al login, que es lo correcto sin sesión); el CTA apuntando
a /descargar; las cuatro insignias; una sola acción primaria en el hero;
sin overflow ni errores de consola.


## Dónde quedamos (2026-11-02, pulido)

Camil pidió "botón de volver en toda la app", micro-interacciones y "que se
vea más completa". Se acordó: el volver **solo donde falta** (adentro ya
hay rail y barra de pestañas siempre visibles, y una flecha extra ahí
estorba más que ayuda), y de lo demás, pulido + que no queden pantallas
pobres.

**Lo que la auditoría encontró, y se arregló:**

- **El reporte mensual era la única pantalla sin salida propia ni
  esqueleto de carga.** Ahora tiene un volver a Ajustes (de donde se
  llega) y su `loading.tsx`. El volver va dentro de
  `.reporte-no-imprimir`: en el papel sobra. Comprobado emulando la
  impresión.
- **Los esqueletos medían 1000px y las pantallas 1180px.** Ajustes,
  Fijos, Movimientos y Plan saltaban ~180px al cargar; solo el del
  resumen se había actualizado cuando se cambió el ancho. Es el tipo de
  bug que nadie reporta pero que hace que la app se sienta floja.
- **Había UN solo `active:` en toda la app.** En teléfono no existe el
  hover, así que apretar un botón no devolvía ninguna señal: en una
  conexión lenta se siente como que no registró el toque. Ahora el kit
  compartido (`Button`, `ToggleChip`, `Segmented`, `Switch`) se hunde un
  2 % al apretarlo, y se apaga con `prefers-reduced-motion`.
- **No había 404 propio**: Next servía el suyo, fondo blanco aun con la
  app en oscuro y texto en inglés. Ahora hay uno con las dos salidas
  (resumen para quien tiene sesión, portada para quien no).

**Detalles para la próxima vez:**

- **Tailwind v4 emite la propiedad `scale` suelta, no `transform`.** Al
  medir un estado de pulsado con Playwright hay que leer
  `getComputedStyle(el).scale`; `transform` devuelve `none` y parece que
  el efecto no existe.
- Las transiciones nombran las propiedades
  (`transition-[color,background-color,transform]`) en vez de usar
  `transition-all`: animar todo incluye el alto, y un botón que cambia de
  texto crecería con animación.
- `surface-selected` **no sirve** como color de pulsado: en claro es más
  *claro* que `surface-hover` y en oscuro más oscuro, así que el efecto
  saldría invertido según el tema.
- Los estados vacíos ya estaban cubiertos en las 16 secciones que los
  necesitan; no hacía falta tocarlos.

**Estado**: `npm test` (138), `eslint`, `tsc` y `npm run build` limpios.
QA con Playwright contra el build de producción: el 404 responde 404 de
verdad, es el propio y respeta el tema; los cuatro esqueletos alineados;
el CSS servido trae `:active` y su `prefers-reduced-motion`; un botón
pasa de `scale: none` a `0.98` al apretarlo; y el volver del reporte no
aparece en la vista de impresión.

## Dónde quedamos (2026-11-07, píldoras y campo de monto)

Camil probó la app instalada unos días y pidió tres cosas: el resumen más
personalizado y con lo principal más a la vista, la navegación como píldora
flotante (arriba en escritorio, abajo en teléfono) con microinteracciones, y
que el campo de monto no acepte letras y agrupe los miles solo. Sin tocar
backend, flujos ni datos de Supabase — y así fue: no hay migraciones nuevas
ni cambios en acciones de servidor.

**La navegación es ahora una píldora flotante** (`components/shell/TopNav.tsx`
y `MobileTabBar.tsx`; `AppRail.tsx` se borró).

- Arriba desde `md`, centrada, `fixed` con `backdrop-blur`. El rail se
  llevaba 88px de ancho en laptop y 232px en escritorio para cinco entradas;
  arriba la navegación ocupa alto y no ancho, que es lo que le sobra a una
  pantalla de laptop y le falta a una tabla.
- **El relleno que despeja las dos píldoras vive en `AppShell`**, no en cada
  pantalla: `md:pt-[68px]` (12 de aire + 56 de alto) y
  `pb-[calc(4.75rem+env(safe-area-inset-bottom))]` abajo. Si alguna pantalla
  nueva no usa `AppShell`, le va a quedar la píldora encima.
- Los dos elementos fijos que asumían la barra vieja de 3.5rem se corrieron:
  la barra de selección múltiple de Movimientos y el `Toast`. **Si se agrega
  otro elemento fijo abajo, hay que despejarla igual.**
- Tres microinteracciones, todas en respuesta a algo que la persona hace:
  la pastilla de la sección activa **se desliza** entre entradas
  (`motion.span` con `layoutId`, framer mide y anima sin cálculo propio),
  apretar hunde la entrada, y el ícono sube un píxel al pasar el puntero.
  Con `prefers-reduced-motion` la duración pasa a 0 y el hundido se apaga —
  el `initial` no se ramifica, que es lo que rompía la hidratación (ver nota
  del 2026-09-14).
- `UserMenu` se adaptó a la píldora: disparador compacto (solo la foto) y
  menú hacia abajo, alineado a la derecha.
- **El contenedor fijo de cada píldora lleva `pointer-events-none`** y la
  píldora los vuelve a aceptar: ocupa todo el ancho para centrarse, y sin eso
  se come los clics de la franja de arriba (o de abajo) del contenido.

**El saldo total subió al encabezado del resumen**
(`components/dashboard/SummaryHero.tsx`).

- Era la cifra que uno viene a ver y estaba a 22px, abajo de las cuatro
  tarjetas y de los primeros pasos: en teléfono había que bajar. Ahora abre
  la pantalla en la escala `display` (48px / 56px en md).
- Esa escala **existía en los tokens desde 2026-09** ("el saldo es la única
  cifra display y nunca baja de 48px") y no la usaba nadie: el saldo se
  dibujaba con `text-figure`, el tamaño de sus cuatro acompañantes.
- Sigue habiendo una sola cifra protagonista: `AccountsPanel` ya no repite el
  total ni la proyección (se le quitaron los props `pendingFixed` y
  `pendingIncome`), solo desglosa por billetera.
- El saludo por nombre pasó a la línea de contexto del encabezado ("Buenas
  tardes, Camil · Sábado 7 de noviembre"): como párrafo aparte quedaban tres
  textos apilados antes de la cifra.
- Sin ninguna cuenta no se dibuja la cifra: un ₡0 gigante en una cuenta
  recién creada no es un dato.

**Campo de monto: solo dígitos y miles agrupados al escribir** (`lib/amount.ts`,
`components/ui/MoneyInput.tsx`).

- Antes cada diálogo tenía un `<input>` de texto con `inputMode="decimal"`:
  **inputMode es una sugerencia al teclado del teléfono, no una validación**,
  así que se podían escribir letras. La limpieza ahora es la misma para lo
  tecleado y lo pegado.
- **El separador de miles es el punto y el decimal la coma** ("1.250.000,50").
  Camil lo pidió con coma ("4,532"); va con punto porque es lo que muestra
  `formatMoney` en toda la app, y si el campo agrupara distinto, lo que uno
  escribe y lo que la lista muestra dos líneas abajo serían dos formatos para
  el mismo monto. **Queda dicho: si lo quiere con coma, se cambia en
  `GROUP_SEPARATOR`/`DECIMAL_SEPARATOR` y en `formatMoney`, las dos cosas
  juntas o no vale la pena.**
- **El valor se escribe en el nodo antes de levantar el estado**
  (`handleAmountChange`). Es lo que mantiene el cursor en su lugar: si solo se
  levantara el estado, React repinta con un texto más largo —se le metió un
  punto— y el cursor salta al final en cada tecla. Probado corrigiendo un
  dígito en el medio de "1.250.000".
- El campo usa cifras de ancho fijo (`money`). Acá no es alineación: al
  agrupar, el texto cambia de largo debajo del cursor y con dígitos de ancho
  variable la cifra entera se corre con cada tecla.
- `allowNegative` solo en el saldo de una cuenta (una tarjeta de crédito va en
  menos). En un movimiento el signo lo da el tipo, y un "-" escrito a mano
  haría que el monto dijera lo contrario de lo elegido.
- `parseAmount` y `formatAmountInput` se mudaron a `lib/amount.ts` y se
  re-exportan desde `MovementFields` porque los doce diálogos las importan de
  ahí.

**Estado**: `npm test` (150, 12 nuevas sobre el campo de monto), `eslint`,
`tsc` y `npm run build` limpios. QA con Playwright contra el build de
producción (preview temporal del resumen, borrada antes de commitear) a
1440 oscuro, 1280/768 claro y 390/360 de teléfono, más una pasada con
movimiento reducido: **67 comprobaciones**, todas OK — la píldora centrada y
flotante, el contenido que la despeja, la sección activa marcada, el hundido
al apretar (`getComputedStyle(el).scale`, que es la propiedad que emite
Tailwind v4), el saldo a 56px, el total que ya no se repite, el menú de
cuenta abriendo hacia abajo sin salirse, y el campo de monto con sus cinco
casos (miles, letras, coma decimal, edición en el medio, ancho fijo). Sin
desborde horizontal ni errores de consola.

**Ojo al probar con Playwright**: medir el hundido con `mouse.down()` sobre
un enlace y soltar encima **es un clic y navega**. Hay que soltar lejos.
Y `nav[aria-label="Principal"]` matchea las dos píldoras (una está oculta por
breakpoint): usar `:visible` o `boundingBox()` devuelve null.

**No deployado** al cierre: commiteado nada más, a la espera de que Camil lo
pida.

## Dónde quedamos (2026-11-07, segunda parte)

Dos pedidos de Camil sobre lo de arriba, todavía sin deployar.

**El saludo y la fecha ahora pesan.** Venían a 15px en producción ("en esas
letras pequeñas no se ven") y en la primera pasada de hoy habían quedado como
línea de contexto a 12px, que era peor. Ahora el saludo va a **24px
semibold** y la fecha a 13px, los dos arriba del todo en `SummaryHero`; el
`PageHeader` del resumen quedó **sin línea de contexto** para no repetir la
fecha. El título de sección ("Resumen") sigue arriba como rótulo chico: la
jerarquía es rótulo 20px → saludo 24px → saldo 56px.

**Transferir entre cuentas, desde donde uno registra.** La transferencia
existía desde la migración 0020 y funcionaba, pero vivía detrás de un botón
chico en "Tus cuentas". Camil, para pasar del ahorro a la principal, terminó
anotando **dos movimientos** (un ingreso y un gasto) — que además ensucian el
mes, porque un traslado no es ni lo uno ni lo otro. Era un problema de dónde
está, no de qué hace: **no se tocó nada de la tabla `transfers` ni de
`createTransfer`.**

- `EntryKindToggle` (en `MovementFields.tsx`) es el control de tres opciones
  —Gasto · Ingreso · Transferir— que ahora abre el formulario de registrar.
- La etiqueta dice **"Transferir" y no "Transferencia"**: a 360px la palabra
  larga no entra en un tercio del ancho del diálogo y parte en dos líneas.
- `MovementEntryProvider` pasó a ser dueño **de los dos diálogos** y del
  modo. Son dos y no uno con dos caras: la transferencia escribe en otra
  tabla, valida otra cosa y no tiene categoría, comprobante ni dólares. Al
  cambiar, uno sale y el otro entra en 160ms y se ve como un cruce; está
  comprobado que después del cruce queda **un solo** diálogo en el DOM.
- Volver de la transferencia a gasto/ingreso remonta el formulario de
  movimiento con la pestaña elegida (`backToMovement`).
- "Transferir" **solo aparece con dos cuentas o más** y **solo al registrar**:
  un movimiento ya guardado no se convierte en transferencia.
- El botón "Transferir" de "Tus cuentas" sigue igual, con su propio diálogo y
  sin el control de arriba: desde ahí uno ya venía a transferir.

**Estado**: `npm test` (150), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright contra el build de producción a 1440 oscuro y 390 de teléfono:
**31 comprobaciones**, todas OK — el saludo a 24px, la fecha sin repetirse,
las tres opciones sin partirse en dos líneas, el cruce de diálogos, origen y
destino distintos por defecto, el control que se queda arriba en la
transferencia, y la vuelta a movimiento con la pestaña elegida.

**Pendiente de Camil**: los dos movimientos que anotó a mano para simular la
transferencia se pueden borrar y rehacer como una sola transferencia — los
saldos los recalcula la base desde cero (triggers de la 0020), así que
borrarlos no deja nada descuadrado. **No se tocó ningún dato suyo.**

## Dónde quedamos (2026-11-07, tercera parte)

Camil: las otras secciones se sienten pobres al lado del resumen, los gastos
fijos necesitan color, y quiere más variedad visual con lo que ya existe.
Todavía sin deployar; nada de backend ni de datos.

**Color por categoría** (`lib/categoryStyle.ts`, `components/ui/CategoryMark.tsx`,
tokens `--cat-*`). Cada categoría tiene su ícono y su color, y aparecen en
los tres lugares donde se la nombra: el sello del día en Fijos, el cuadrito
de cada movimiento y la fila de cada tope. Una lista larga se agrupa sola a
la vista.

- **Es identidad, no dato.** Pasada por `validate_palette.js` de la skill
  dataviz como paleta categórica, **falla**: nueve tonos no se distinguen
  con daltonismo (peor par adyacente ΔE 2.0 en deuteranopía) ni con visión
  normal (ΔE 4.8). Como marca sí sirve, porque el color nunca va solo —al
  lado hay un ícono propio y el nombre escrito— y lo único que el validador
  exige para eso, contraste >= 3:1 contra la superficie, lo pasan los diez
  tonos en claro y en oscuro. **Por eso la dona del resumen sigue con su
  rampa de un solo celeste: ahí el color SÍ es el dato.**
- **El verde es solo de las categorías de ingreso** (Salario, Freelance) y
  ninguna de gasto lo lleva: así un tono verde en una lista sigue queriendo
  decir que entró plata. Tampoco se usan el rosa de `--expense` ni el ámbar
  de `--warn`. Hay una prueba que lo verifica.
- Una categoría propia recibe su tono por **hash del nombre**, no por orden
  en la lista: por orden, borrar una le cambiaría el color a todas las de
  abajo y el historial dejaría de reconocerse.
- En la fila de un movimiento quedan dos canales: la **forma** de la flecha
  dice si entró o salió, el **color** de qué categoría es.
- Las clases van escritas enteras en una tabla (`TONE`) y no armadas con
  plantillas: Tailwind lee el fuente buscando clases, y `bg-cat-${tono}`
  nunca llega al CSS.
- **Trampa del compilador de React**: `const Icon = categoryIcon(cat)` da
  error de lint ("Cannot create components during render") — no distingue
  una función que BUSCA un componente de una que lo CREA. Se indexa la tabla
  en el render.

**Cada sección abre con una cifra** (`components/shell/SectionLead.tsx`),
con la misma anatomía del resumen: rótulo chico, cifra `display`, cifras de
apoyo en línea y una oración que la interpreta.

- Fijos → lo que se va en fijos este mes (y en la pestaña de ingresos, lo
  que entra). Movimientos → lo que queda en el período. Plan → lo que queda
  de los topes, lo apartado en metas, y el neto de las deudas.
- **Los totales que estas cifras repiten se borraron de abajo**: el `dl` de
  tres cifras de `BudgetsSection`, el de `DebtsSection` y la línea de
  "Apartado en total" de `GoalsSection`. Eran las mismas cifras dos veces en
  media pantalla.
- **Ajustes no tiene cifra**: abre con una tarjeta de cuenta (foto, nombre,
  correo y cuántos movimientos llevás anotados). Era la única pantalla que
  entraba directo a una lista de controles sin decir en qué cuenta estás.
- Los cuatro esqueletos de carga se ajustaron a las medidas nuevas.

**Estado**: `npm test` (156, 6 nuevas sobre los tonos de categoría),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright contra el build
de producción sobre las **siete** vistas (fijos, fijos→ingresos,
movimientos, plan→topes, plan→metas, plan→deudas, ajustes) a 1440 claro y
390 oscuro: sin desborde horizontal ni errores de consola, revisadas una por
una con captura.

## Dónde quedamos (2026-11-07, cuarta parte)

Camil pidió poder crear sus propias categorías ("gasto ₡29.000 en
ferretería"). **Ya existían** —tabla `user_categories` desde la fase del
tracker manual— pero vivían **solo** en Ajustes → Categorías. Mismo problema
que la transferencia: la función estaba, el lugar no.

En la práctica, quien está anotando tiene que abandonar el formulario a
medio llenar, irse a otra pantalla, crear la categoría y volver a empezar.
Nadie hace eso: se elige "Otro" y la plata termina en una bolsa que no dice
nada.

- **`CategoryPicker` crea sin salir del formulario**: un chip "+ Nueva" al
  final de los chips abre un campo en la misma fila, y al confirmar la
  categoría queda creada y elegida de una. Está en los tres formularios que
  piden categoría (movimiento, gasto fijo, ingreso fijo), con el tipo que le
  corresponde a cada uno.
- La recién creada se guarda en un estado local (`justAdded`) y no se espera
  la lista del servidor: la acción revalida la ruta, pero el chip tiene que
  aparecer marcado **ya**, antes de ese viaje.
- **Escape dentro del campo necesita `e.nativeEvent.stopPropagation()`**, no
  solo el `stopPropagation` del evento de React: el `Dialog` escucha Escape
  en `document`, y sin frenar el evento nativo, cancelar el nombre de la
  categoría cerraba el formulario entero a medio llenar. Enter adentro del
  campo tampoco envía el movimiento.
- **`addCategory` ahora valida de verdad** (`categoryClash` en
  `lib/categories.ts`, con pruebas). El índice único de la tabla compara el
  texto tal cual, así que antes entraban "Ferretería" y "ferreteria" por
  separado, y peor: una que ya trae la app —las dos listas se concatenan al
  mostrarlas, así que agregar "ocio" dejaba "Ocio" dos veces sin que la base
  se quejara. La comparación es sin tildes ni mayúsculas, y hay techo de 24
  caracteres.
- `addCategory`/`deleteCategory` revalidan además `/dashboard` y
  `/dashboard/plan`: esas pantallas también tienen formularios con el
  selector, y una categoría creada desde el resumen no aparecía ahí hasta la
  siguiente carga completa.
- **Una categoría propia lleva su inicial** en la marca de color, no el
  glifo genérico: con el mismo ícono para todas, dos propias que caen en
  tonos parecidos se veían iguales. "Otro" y "Otros", que sí son de la app,
  se quedan con el glifo.
- Las categorías propias se ven con su color en Ajustes → Categorías y en
  los chips del filtro de Movimientos.

**Lo que no se pudo probar desde acá**: la creación de verdad. La vista de
prueba no tiene sesión, así que `addCategory` redirige a `/entrar` — lo que
sí confirma que el botón dispara la acción. Crear una categoría y verla
quedar es de las cosas a mirar en producción.

**Estado**: `npm test` (160, 4 nuevas sobre los choques de nombre),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright a 1440 claro y
390 oscuro: 20 comprobaciones, todas OK.

## Dónde quedamos (2026-11-07, quinta parte)

**Ajustes dejó de ser una pantalla y pasó a ser un diálogo.** Lo pidió
Camil. No es un lugar donde uno *esté*: se entra a cambiar una cosa y se
sale, y como pantalla obligaba a abandonar lo que estabas viendo.

- `components/settings/SettingsDialog.tsx` (el diálogo, con pestañas) y
  `SettingsEntry.tsx` (el provider y el botón). Se borraron `SettingsView`,
  `SettingsIndex` y `sections.ts`; de `SettingsSection.tsx` quedó solo
  `SettingsRow`.
- **El provider envuelve al shell, no al contenido**: el botón que lo abre
  vive en las dos píldoras de navegación, y `AppShell` las dibuja FUERA de
  sus children. Adentro, el contexto no les llegaría.
- **Siete pestañas, una a la vez** (Perfil · Categorías · Apariencia ·
  Recordatorios · Datos · Guía · Cuenta). Apiladas con scroll habría sido la
  misma pantalla de antes metida en una caja más chica. Abre en Perfil.
- **Ajustes sale de `NAV_ITEMS`** y las dos píldoras dibujan su botón
  aparte: es una acción, no un destino, así que no se marca como sección
  activa. **No se puede sacar de la barra de teléfono**: ahí no hay menú de
  cuenta, y sin ese botón el perfil y el cierre de sesión quedarían
  inalcanzables.
- Los datos los carga el layout de /dashboard, dos consultas chicas más
  (categorías y cuántos movimientos) en el mismo `Promise.all`. A cambio el
  diálogo abre lleno y sin espera desde cualquier pantalla.
- **Un solo manejador de clic cierra el diálogo cuando se toca cualquier
  enlace de adentro** (`closest("a[href]")`): el diálogo vive en el layout,
  así que sin eso se quedaba abierto encima del reporte.
- `/dashboard/ajustes` **se queda como redirección**, no se borra: hay tres
  formas de llegar con un enlace viejo —un marcador, la pantalla guardada en
  el caché sin conexión, y el "volver" del reporte en una pestaña vieja— y
  las tres darían 404.
- El "volver" del reporte ahora va al resumen.
- **`VERSION` del Service Worker a `v3`**: sin eso, quien tuviera
  `/dashboard/ajustes` en el caché seguiría abriendo la pantalla vieja sin
  señal.

**El perfil se guarda solo** (`ProfileSettings`). Antes tenía su botón
"Guardar cambios", que dentro de un diálogo compite con el de cerrar: uno
escribe el nombre, le da a "Listo" y no sabe cuál de los dos guardaba.

- Cada campo se guarda **al salir de él**, y solo si cambió de verdad
  (`savedRef` guarda lo último confirmado): pasar el foco por un campo sin
  tocarlo no dispara ninguna escritura. Comprobado en la QA — si escribiera,
  la acción redirige a `/entrar` en la vista de prueba y se nota.
- El botón "Listo" del diálogo manda lo pendiente antes de cerrar
  (`flushRef`), y **si el servidor rechaza no cierra**: vuelve a la pestaña
  de Perfil para que el error se vea.
- Un nombre vacío no se manda: dejaría la app saludando a nadie.
- La línea de acuse ("Guardando…" / "Guardado" / "Se guarda solo al salir de
  cada campo") no es decorativa: guardar en silencio es indistinguible de no
  guardar.

**Estado**: `npm test` (160), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright a 1440 claro y 390 oscuro: 41 comprobaciones — que no quede
ningún enlace a la pantalla vieja, los cuatro destinos, el botón que se
anuncia como diálogo, las siete pestañas, el perfil con foto/nombre/fecha,
que salir de un campo sin tocarlo no guarde, el cambio de pestaña, que
"Listo" cierre sin navegar, y que la ruta vieja no dé 404.

## Dónde quedamos (2026-11-07, sexta parte) — REGLA DE COPY

Camil: "no des muchas explicaciones con textos pequeños, se ve un poco
improfesional e innecesario". **Esto reemplaza la decisión de la nota del
2026-11-01 ("Explicaciones"), que iba en la dirección contraria**: ahí se
habían agregado descripciones a cada sección y a cada fila. No volver a
agregarlas.

**La regla, de ahora en adelante:**

- **Fuera**: todo texto chico que explique *cómo funciona la app* o *cómo
  guarda* algo. Si el control se entiende por su rótulo, no lleva línea
  debajo.
- **Adentro**: lo que dice qué va a pasar con una acción que no se puede
  deshacer (las descripciones de los diálogos de confirmación), y lo que es
  **dato** y no explicación (el "12 % más que el mes pasado" de las
  tarjetas, los rótulos de los gráficos, el aviso de datos viejos sin
  señal).
- Cuando un dato importante vivía en una explicación, se mete en el
  **rótulo**: "Recordatorios de gastos fijos" + línea sobre que es por
  dispositivo → **"Recordatorios en este dispositivo"**, sin línea.
- Los estados vacíos se quedan con **una** frase y su botón: la pantalla no
  tiene otra cosa que mostrar, pero no hacen falta tres renglones.

**Lo que se tocó**: el diálogo de ajustes (su botón pasó a decir **"Guardar
y salir"** y se fue el "Se guarda solo al salir de cada campo"), las filas
de Apariencia, Recordatorios, Sesión, Datos y Zona de peligro, las líneas de
contexto de Fijos/Movimientos/Plan, los párrafos de los encabezados de
sección, la nota del gráfico de seis meses (de cuatro renglones a uno), la
intro de "Empezá por acá", y los estados vacíos de cuentas, fijos,
movimientos, ingresos fijos, topes, metas, deudas y aguinaldo.

**Lo que NO se tocó, y por qué**: las descripciones de los diálogos
destructivos (qué se borra exactamente y si se puede deshacer), el aviso del
formulario cuando la fecha cae en otro mes (es el que evita el bug de
"no se guardó" del 2026-11-02), y la pestaña **Guía** del diálogo de
ajustes, que es texto explicativo a propósito y está detrás de su pestaña.

**Estado**: `npm test` (160), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright a 1440 claro y 390 oscuro: 20 comprobaciones, incluida una
que recorre las seis pestañas de ajustes y **falla si queda algún párrafo de
13px o menos con más de seis palabras** — así la regla queda comprobada y no
solo escrita.

## Dónde quedamos (2026-11-07, séptima parte)

### `0025_category_icon_color.sql` — ya corrida (2026-11-08)

Agrega `user_categories.icon` y `user_categories.color`, las dos NULL por
defecto. **Es segura de correr en cualquier momento y también es segura de
NO correr**: sin ella lo único que falla es el selector de ícono y color
—`updateCategory` devuelve "Falta correr la migración 0025 en Supabase"— y
todo lo demás sigue igual, porque las columnas se leen de forma tolerante y
nadie más escribe en ellas.

**Anotar un gasto o un ingreso, más rápido**

Tres cambios, medidos contra lo que costaba antes: estirar el pulgar al
botón de la esquina de arriba, escribir el monto, **bajar** con el teclado
abierto hasta los chips de categoría, elegir, guardar.

1. **El "+" en la píldora de abajo.** Es un enlace a
   `/dashboard/movimientos?nuevo=gasto` —el mismo camino de los accesos
   rápidos del ícono— y no una llamada al formulario: el formulario lo monta
   cada pantalla y la barra vive fuera de ellas. De paso, al guardar quedás
   en la lista donde se ve lo que anotaste.
2. **Cuenta, fecha y comprobante arrancan plegados** detrás de "Más
   detalles". De los ocho bloques del formulario, seis son siempre lo mismo
   en un gasto del día a día. Comprobado en la QA: la categoría entra en
   pantalla sin bajar, a 390 y a 1440. Al **editar** van abiertos: ahí uno
   viene justamente a revisar.
3. **"Lo de siempre"** (`lib/quickEntry.ts`): una fila con los movimientos
   que más repetís; un toque llena monto, detalle, categoría y cuenta. Sale
   de los mismos recientes que ya alimentan la sugerencia de categoría — no
   hay consulta nueva, solo dos columnas más (`amount`, `type`) en el select
   que ya existía.
   - **Mínimo dos apariciones**: con una sola serían los últimos movimientos
     y no los habituales, y ofrecería repetir el regalo de cumpleaños.
   - **Manda el monto más reciente**, no el promedio ni el más repetido: si
     el almuerzo subió de ₡3.000 a ₡3.500, vale el de ahora; el promedio
     daría un número que nunca se pagó.
   - **No guarda directo**: llena el formulario y deja guardar. Un botón que
     escribe en la base sin que se vea qué escribió es la forma más rápida
     de meter un dato equivocado.

**Biblioteca de íconos y colores para las categorías**

- Los íconos son **Material Symbols de Google** (Apache 2.0), 36 del juego
  "outlined". **Los trazos están copiados en `lib/materialSymbols.ts`, no se
  carga la fuente de Google.** Dos razones: la app funciona sin señal y una
  fuente pedida a `fonts.googleapis.com` no llega —los íconos se verían como
  el nombre escrito, "restaurant", en media pantalla—, y la fuente completa
  pesa megas contra los ~16 KB de estos trazos. Para agregar otro: bajar
  `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/<nombre>/default/24px.svg`
  y pegar su atributo `d`. Todos comparten `viewBox="0 -960 960 960"`.
- Los colores son los diez tonos `--cat-*` que ya existían. **Se guarda la
  clave del tono ("naranja"), no un hexadecimal**, para que el mismo color
  valga en claro y en oscuro.
- **"Automático" es una opción de verdad y es la de arranque**: sin elegir
  nada, la app sigue decidiendo por el nombre como venía haciendo. Obligar a
  elegir convertiría crear una categoría en un trámite de tres decisiones.
- Lo elegido llega a todas las listas por **contexto**
  (`components/ui/CategoryStyle.tsx`, montado en el layout de /dashboard):
  la marca se dibuja en sitios muy repartidos y ninguno tiene por qué
  recibir la tabla de categorías para pintar un cuadrito. Los datos ya los
  bajaba el layout para el diálogo de ajustes.
- **Solo se pueden editar las categorías propias.** Las que trae la app no
  son filas de `user_categories`, así que no hay dónde guardarles la
  elección; su color e ícono siguen siendo los asignados a mano, que están
  pensados uno por uno. Hacerlas editables pide sembrar filas por usuario y
  es otra migración.
- `CategoryMark` pasó a ser componente de cliente (lee el contexto) y
  acepta `day` para el sello del día de Fijos y `previewIcon`/`previewTone`
  para la vista previa del selector.

**Estado**: `npm test` (174, 14 nuevas entre "lo de siempre" y la resolución
de estilos), `eslint`, `tsc` y `npm run build` limpios. QA con Playwright a
1440 claro y 390 oscuro: 39 comprobaciones — el "+" en la mitad de abajo de
la pantalla, los tres bloques plegados y que "Más detalles" los abra, que la
categoría entre sin scroll, que la fila de repetidos ofrezca lo que se
repite y no lo que pasó una vez, que al tocar uno llene monto/detalle/
categoría, y que la biblioteca traiga los 36 íconos y los 10 colores con el
guardado ya marcado.

## Dónde quedamos (2026-11-07, octava parte)

Camil: "intenté editar y guardar una categoría y no me dejó". Dos defectos
míos, los dos del mismo día:

1. **El error se mostraba donde no se ve.** El `FormError` del editor está
   al final de un diálogo con scroll, debajo de la grilla de 36 íconos: al
   tocar "Guardar" y fallar, la pantalla se quedaba igual. Tocar y que
   fallara era indistinguible de tocar y que no pasara nada. Ahora el error
   **también sale como aviso flotante** (`toast`), que es fijo y no se puede
   perder de vista.
2. **El error de "falta la migración" estaba mal reconocido.** Se miraba
   `42703`, el código de Postgres, pero al escribir desde la app el que
   llega es **`PGRST204`** de PostgREST ("Could not find the 'icon' column …
   in the schema cache"), porque rechaza el escrito antes de tocar la base.
   O sea que el caso más probable caía en el mensaje genérico. Ahora lo
   reconoce `isMissingColumnError()` (`lib/supabase/errors.ts`, con
   pruebas), por código **y** por mensaje.

De paso: el mensaje genérico ahora **lleva el código** del error
(`No se pudo guardar la categoría (23505)`). Un "no se pudo" a secas no deja
nada en la mano ni a quien lo lee ni a quien lo arregla.

Y el editor pasó a `layer="top"`: se abre encima del diálogo de ajustes y
compartían capa.

**Lo que esta QA no cubría antes**: se probaba que la grilla de íconos y la
de colores estuvieran, pero **nunca se tocaba "Guardar"**. Ahora sí: se
comprueba que el editor quede por encima (z=70), que se pueda escribir el
nombre con el otro diálogo abierto, y que el botón **llegue de verdad a la
acción del servidor**. La causa de fondo sigue siendo que la migración 0025
está sin correr — eso no se puede probar desde acá, pero ahora lo dice en
pantalla.

**Estado**: `npm test` (178, 4 nuevas sobre el reconocimiento del error),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright a 1440 y 390:
6 comprobaciones.

## Dónde quedamos (2026-11-08) — REGLA DE MENSAJES DE ERROR

Camil corrió la 0025 (ya no queda ninguna migración pendiente) y pidió que
cualquier error, salvo el 404, diga lo mismo: *"Ups, hubo un error al hacer
esto. Reintentalo, y si no funciona, comunicate con el equipo de TicoFinanza
(info@ticofinanza.com)."*

**La regla (en `lib/errors.ts`, que es donde vive el texto):**

- **Si la persona puede arreglarlo** —un monto en cero, dos cuentas iguales,
  un código vencido, una categoría repetida, una foto de más de 5 MB— el
  mensaje **sigue diciendo qué corregir**. Cambiarlos por "ups" convertiría
  un formulario que se arregla solo en uno que no se sabe por qué no pasa.
  Quedaron ~20 así.
- **Si se rompió algo de la app** —la base, la red, un permiso— va el
  mensaje único. Se reemplazaron **49 mensajes** repartidos en 12 archivos
  ("No se pudo guardar el gasto fijo. Intentá de nuevo.", "No se pudieron
  copiar los presupuestos.", y así).
- **El motivo real va al registro del servidor** (`logFailure`), no a la
  pantalla. Unificar los mensajes sin esto sería cambiar un error confuso
  por uno invisible, que es exactamente lo que pasó con el guardado de
  categorías. En Vercel → Logs quedan con el prefijo `[TicoFinanza]`.
- **Tres mensajes de "a medias" se quedan como están** ("Se marcó como
  pagado, pero no se pudo registrar el movimiento", y dos parecidos):
  avisan de que una parte sí ocurrió. Taparlos con "ups" escondería que el
  estado quedó por la mitad, y eso es peor que un mensaje largo.
- **El 404 no se toca**: tiene su propia pantalla, que explica que el enlace
  está viejo y ofrece a dónde ir.

Las dos pantallas de error (`app/error.tsx` y `app/global-error.tsx`) usan
el mismo texto. La global lo lleva escrito a mano, sin tokens ni
componentes: se dibuja cuando se rompió el layout raíz y no puede depender
de nada.

**Estado**: `npm test` (178), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright: la pantalla de error muestra el texto nuevo con el correo y
el botón de reintentar, y el 404 sigue respondiendo 404 con su propio
texto.

## Dónde quedamos (2026-11-08, rediseño de /entrar)

Camil pidió cambiarle la estructura. Se le propusieron tres (una columna
centrada, asimétrica 40/60, y el producto de fondo) y eligió **el producto
de fondo**.

**Lo que estaba mal**: dos mitades exactas, las dos oscuras, separadas por
una línea — ninguna mandaba, y en una página cuyo único trabajo es que
toques un botón, no saber dónde mirar es el problema más caro. La mitad
derecha se había vuelto una landing metida en media pantalla (titular,
bajada, maqueta y cuatro bloques de texto, que ya se salían). Y la izquierda
tenía cinco textos para un solo botón.

**Lo que hay ahora**: una captura de verdad del resumen a pantalla completa,
difuminada y con velo, y una tarjeta opaca flotando encima con la marca, el
titular, una línea, la casilla y el botón. Se fueron los tres bloques de
"puntos" y el aviso de "solo usamos tu nombre" (la política de privacidad
está enlazada ahí mismo).

- **La captura es de verdad, no una maqueta dibujada a mano.** La anterior
  (`HeroMockup`) mostraba números inventados y, peor, **todavía dibujaba el
  rail lateral que ya no existe**: lo que se prometía no era lo que se
  abría. Se regeneraron `entrar-oscuro.jpg`, `entrar-claro.jpg` y de paso
  `dashboard.png` (la de la landing, que estaba igual de vieja).
- **Hay una captura por tema y se eligen con una variable de CSS**
  (`--shot-entrar`), no con dos `<img>` y `display:none`: el navegador baja
  **solo** la URL que la variable resuelve. Está comprobado en la QA
  mirando los pedidos de red — en oscuro nunca se pide la clara ni al
  revés. Con dos `<img>` se bajarían las dos. Tampoco sirve `dark:` de
  Tailwind acá: en este proyecto el tema también se fuerza por clase
  (`.dark`/`.light`) y esa variante solo mira `prefers-color-scheme`.
- **La fuerza del velo cambia con el tema** (`--velo-entrar`: 72 % en claro,
  40 % en oscuro). No es la misma tarea: sobre la captura clara hay que
  bajar el contraste, y sobre la oscura un velo igual de fuerte la deja en
  negro y el fondo deja de reconocerse como la app. Primera versión: el
  mismo velo para los dos, y en oscuro la captura desaparecía.
- **En teléfono no hay fondo.** Una captura de escritorio reducida a 390px
  no se lee, y así la página pesa menos justo donde la conexión es peor.
  Comprobado: a 390 y 360 no se pide ninguna imagen.
- Las capturas son **JPEG de calidad 72** (~75 KB cada una) y no PNG: van
  difuminadas detrás de una tarjeta, no hacen falta a pleno detalle.
- La casilla de términos **se queda** (consentimiento explícito, decisión
  del 2026-11-02) y sigue bloqueando el botón.

**Estado**: `npm test` (178), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright en 1440/1024/768 y 390/360, en los dos temas: **46
comprobaciones** — sin desborde, que se baje solo la captura del tema y
ninguna en teléfono, que la tarjeta sea opaca (el texto nunca se lee sobre
la imagen), y que sin marcar la casilla avise y no entre.

## Dónde quedamos (2026-11-08, bienvenida y primeros pasos)

### `0026_onboarding.sql` — ya corrida (2026-11-08)

Agrega `user_settings.onboarding_seen`. **Segura de correr y segura de NO
correr**: sin ella la guía de bienvenida simplemente no sale y nada más
cambia. La comprobación es `settings?.onboarding_seen === false` y no
`!settings?.onboarding_seen` justamente por eso: sin la columna el valor es
`undefined`, y con la negación le trabaría la pantalla diez segundos a
todo el mundo en cada carga. Ante la duda, no molesta.

La migración marca como vista la guía a **las cuentas que ya existen**: es
para quien se acaba de registrar, no para interrumpir a quien lleva meses
anotando. Para verla vos (o volver a probarla):

```sql
update public.user_settings set onboarding_seen = false where user_id = auth.uid();
```

**La guía de bienvenida** (`components/onboarding/WelcomeDialog.tsx`), en el
layout de /dashboard, con el contenido de `AppGuide` — una sola fuente, la
misma que vive en Ajustes → Guía.

- **El contador de diez segundos es lo que la hace servir.** Un diálogo que
  se puede cerrar al instante se cierra al instante, y entonces la guía no
  la lee nadie. Mientras corre **no hay salida**: ni X, ni Escape, ni clic
  afuera (`dismissible={!ready}`), porque dejar cualquiera de las tres
  abiertas vuelve el contador un adorno. Comprobado las tres en la QA.
- El `setState` del contador va **dentro del tick** del `setInterval`, no en
  el cuerpo del efecto: en el cuerpo sería un cambio de estado durante el
  propio efecto y lo marca el lint.
- Que ya se vio se guarda **en la cuenta, no en el navegador**: con
  localStorage, instalar la app en otro teléfono volvería a frenar diez
  segundos a alguien que ya la leyó.
- `markOnboardingSeen` es `upsert`: la fila de ajustes puede no existir
  todavía. Si falla **no devuelve error a la pantalla** —lo peor que pasa es
  que la guía vuelva a salir— porque dejar a alguien atrapado en un diálogo
  sin salida por un fallo de red sería mucho peor. El motivo va al registro.

**"Empezá por acá" pasa de tres pasos a cinco**: se agregaron *cargá tu
ingreso fijo* y *poné un tope*.

- La nota del 2026-11-01 decía tres **y la razón sigue siendo válida**: un
  paso que no se puede terminar deja el panel para siempre. Por eso los dos
  que entran son configuración de una vez (como los gastos fijos) y no
  "usá esta función": **una meta de ahorro sigue afuera**.
- El ingreso fijo además completa el saldo proyectado: sin él la app sabe
  lo que vas a pagar pero no lo que va a entrar.
- El tope necesita saber si ya hay alguno: es un conteo con `head: true` en
  el mismo `Promise.all` del resumen, no trae filas.
- Los dos pasos nuevos son enlaces a su pantalla y no diálogos: el
  formulario de ingreso fijo y el de topes viven en Fijos y en Plan, y
  montarlos en el resumen sería tener el mismo formulario en dos lados.

**Estado**: `npm test` (178), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright a 1440 oscuro y 390 claro: **36 comprobaciones** — que la
guía salga sola, que el botón arranque deshabilitado con el contador, que
Escape y el clic afuera no la cierren, que el contador baje, que al llegar
a cero aparezca la X y el botón diga "Empezar", que cerrar llame a la
acción, y que los primeros pasos sean cinco con un solo botón celeste.

## Dónde quedamos (2026-11-08, tercera parte)

Tres cosas que reportó Camil mirando la app en producción.

**La captura de fondo de /entrar llevaba su nombre y sus montos.** Es una
página pública: salía "Buenas tardes, Camil" y los saldos de sus cuentas de
verdad. Se regeneraron las tres capturas (`entrar-oscuro.jpg`,
`entrar-claro.jpg` y `dashboard.png`, la de la portada) con una persona
inventada —"Ana", cuentas y montos nuevos—. **Regla para la próxima: la
vista temporal que genera capturas públicas no usa datos reales ni el
nombre de nadie.**

**Ajustes vuelve a ser un solo scroll, no pestañas.** Las pestañas se
agregaron esta misma mañana y fueron un error visible: la mitad llevaba a un
panel con una sola fila —"Recordatorios" era un interruptor solo en medio de
una pantalla vacía, "Apariencia" lo mismo—. Repartir seis controles en siete
pestañas hace que cada una se vea vacía y que haya que tocar siete veces
para ver lo que entra en una pasada de scroll. Ahora son ocho bloques
seguidos (`Bloque` en `SettingsDialog`), cada uno con su título y su línea:
junto no es amontonado.

**Y la bienvenida se puede volver a ver**: Ajustes → Guía → "Ver la
bienvenida", sin contador (`countdown={0}`). Camil no lograba verla porque
la 0026 marca como vista la guía a las cuentas que ya existen; con el botón
no hace falta tocar SQL para revisarla. `WelcomeDialog` pasó a `layer="top"`
porque ahora puede abrirse encima del diálogo de ajustes.

**Plan se veía corrido a la izquierda.** La página iba a `max-w-[1180px]`
centrada pero el contenido de cada pestaña estaba capado a 760 y pegado a la
izquierda, así que en una pantalla ancha quedaba en los dos tercios de la
izquierda. **La lección: capar el CONTENIDO dentro de una página más ancha
lo descentra; hay que capar la PÁGINA.** Plan pasó a `max-w-[860px]` (no
1180 como el resto: son medidores y filas, y a 1180 la barra de un tope mide
un metro) y se quitaron los `max-w-[760px]` de adentro; su `loading.tsx` se
ajustó al mismo ancho. Lo mismo tenía Fijos → Ingresos con un
`max-w-[900px]`, que se quitó para que las dos pestañas midan igual y no
salte al cambiar.

**Un falso positivo para no repetir**: en una captura los dos diálogos
(ajustes y la bienvenida encima) parecían translúcidos y superpuestos. No
era un fallo — medidos los dos paneles, los dos opacos (`rgb(17,17,19)`,
opacidad 1) y en capas 50 y 70. Era la animación de entrada a medio camino.
**Antes de arreglar algo que se ve raro en una captura, medir el estilo
calculado.**

**Otro, al medir centrado con Playwright**: los hijos ocultos por breakpoint
devuelven un rect de 0,0,0,0, así que entran en la cuenta como si estuvieran
en la esquina y el centro calculado se va solo a la izquierda. Hay que
filtrar por `width > 0 && height > 0`.

**Estado**: `npm test` (178), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright: 20 comprobaciones del diálogo de ajustes (sin pestañas, los
ocho bloques en orden, cada uno con su línea, que el diálogo se desplace,
que se llegue a la zona de peligro, y la bienvenida a pedido sin contador) y
8 del centrado de Plan a 1520 y 1920 en las tres pestañas.

## Dónde quedamos (2026-11-08, cuarta parte) — TRES BUGS REALES

Camil reportó que no podía cerrar sesión, que el "+" de la barra no hacía
nada y que la bienvenida nunca le salía pese a haber corrido la 0026. Los
tres eran bugs míos, los tres del mismo día.

**1. Cerrar sesión se colgaba.** En `SignOutDialog`, `await endSession()`
estaba **fuera** del `try`: si la limpieza fallaba, el error escapaba de la
transición y el botón se quedaba en "Cerrando..." para siempre, sin cerrar
sesión y sin decir nada. Y peor: `endSession` podía **no contestar nunca**
—IndexedDB no siempre falla, a veces se queda sin resolver ni rechazar: una
apertura bloqueada por otra pestaña, una base en mal estado—. Ahora la
llamada va dentro del `try` y cada paso de la limpieza tiene tope de 1,5 s
(`conTope` en `lib/pageCache.ts`). De paso, `SignOutDialog` pasó a
`layer="top"`: se abre dentro del diálogo de ajustes y compartían capa.

**2. El "+" de la píldora de teléfono no hacía nada.** Era un enlace a
`/dashboard/movimientos?nuevo=gasto`, y **en cuanto la URL ya traía ese
parámetro, volver a tocarlo navegaba al mismo sitio y no pasaba nada**. Por
eso "funcionaba" solo la primera vez y solo viniendo de otra pantalla.

La causa de fondo era de arquitectura: `MovementEntryProvider` lo montaban
el resumen y la lista por separado, así que la barra —que AppShell dibuja
fuera de los children— no tenía a quién pedirle que abriera el formulario.
**Ahora el provider vive en el layout de /dashboard** y el "+" es un botón
que abre el formulario encima de donde estés, sin navegar.

- El parámetro `?nuevo=` lo lee el propio provider con `useSearchParams()`:
  un layout no recibe los parámetros de la URL. Los accesos rápidos del
  ícono siguen funcionando igual.
- Las consultas de `accounts` y `recent` se mudaron al layout; el resumen y
  la lista dejaron de pedirlas por su cuenta, así que **no hay consultas de
  más**: las mismas, en otro lugar.

**3. La bienvenida no le salía a nadie.** `handle_new_user` crea el perfil y
una cuenta de efectivo pero **no crea la fila de `user_settings`** —esa
aparece recién cuando alguien toca el tema o los recordatorios—. Con
`settings?.onboarding_seen === false`, una cuenta sin fila daba `undefined`,
no entraba por ningún lado, y la guía no le salía **justamente a quien está
hecha**. La regla vive ahora en `lib/onboarding.ts` con pruebas, y separa
los tres casos: sin fila → se muestra (y `markOnboardingSeen` la crea al
cerrar); con fila en `false` → se muestra; con fila y sin la columna
(migración sin correr) → no se muestra.

**Y "Ver la bienvenida" ahora trae el contador.** La había puesto sin espera
"porque quien la abre ya sabe lo que abre", y así no servía para lo único
que se necesitaba: comprobar que la bienvenida funciona. Una versión
recortada de algo no sirve para verificar ese algo.

**Además, lo que pidió en el mismo mensaje:**

- **Los diálogos van centrados también en teléfono.** Eran una hoja que
  subía desde abajo.
- **Ajustes más compacto**: filas de `py-3` a `py-2.5`, columna de rótulo de
  200px a 160px, y menos aire entre bloques.
- **El correo de bienvenida se rehizo**: el ícono de verdad de la app
  (`<img>` con URL absoluta — un correo no resuelve rutas relativas y ni
  Gmail ni Outlook dibujan SVG) en vez de las iniciales "TF" hechas con CSS,
  los pasos actualizados a los de hoy, y **se fue la firma "— Camil"**:
  ahora dice "El equipo de TicoFinanza".

**Estado**: `npm test` (183, 5 nuevas sobre cuándo sale la bienvenida),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright a 390 y 1440:
**16 comprobaciones** — que el "+" sea un botón, que abra sin navegar, que
vuelva a abrir al segundo toque, que el formulario quede centrado y sin
tocar el borde, que la confirmación de cerrar sesión se abra por encima de
Ajustes (z=70) y que **cerrar sesión llegue de verdad a /entrar**, y que la
bienvenida a pedido traiga el contador.

## Dónde quedamos (2026-11-08, quinta parte)

### `0027_user_categories_update_policy.sql` — ya corrida (2026-11-08)

**Es la causa del bug que reportó Camil** ("edito el ícono, me dice guardado
y no guarda nada"). Hasta que no se corra, editar una categoría propia sigue
sin funcionar — pero ahora la app **lo dice** en vez de mentir.

**El bug: `user_categories` nunca tuvo política de UPDATE.** La tabla se creó
en la 0005 con SELECT, INSERT y DELETE. Mientras una categoría no se pudo
editar nadie lo notó; desde la 0025 (ícono y color propios) sí.

Lo peligroso es cómo falla: **con RLS activo y sin política de UPDATE, un
UPDATE no da error — simplemente no alcanza ninguna fila.** PostgREST
contesta sin error, así que `updateCategory` devolvía éxito y la app decía
"guardada". Un permiso que falta se veía exactamente igual que un guardado
exitoso.

Dos arreglos, y el segundo importa más que el primero:

1. La migración 0027 agrega la política (`using` **y** `with check`: sin la
   segunda, un UPDATE podría cambiar el `user_id` y regalarle la categoría a
   otra cuenta).
2. **`updateCategory` y `deleteCategory` ahora piden la fila de vuelta**
   (`.select("id").maybeSingle()`) y tratan "cero filas" como fallo. La regla
   general: *una acción no debe afirmar que guardó sin prueba de que guardó*.
   Con cero filas, `updateCategory` dice que falta correr la 0027 — el único
   caso posible, porque la fila ya se leyó con la política de SELECT.
3. `lib/supabase/policies.test.ts` cruza **las tablas que el código actualiza
   contra las políticas declaradas en las migraciones**. Comprobado que falla
   si se quita la 0027. Las tres tablas que se escriben solo con la clave de
   servicio (`account_deletion_codes`, `action_rate_limits`,
   `push_reminders`) están en una lista aparte, con el motivo.

**Ajustes: la guía y las categorías pasan a su propio diálogo**

- `GuideDialog` — la guía era el único texto largo de Ajustes y estaba suelta
  en el scroll: ocupaba más que todos los controles juntos y había que
  pasarla para llegar a la zona de peligro.
- `CategoryDialog` — reemplaza a `CategoryManager` + `CategoryEditor`, los dos
  borrados. Antes las categorías eran una tira de chips diminutos dentro de
  una fila de ajustes, y el editor se abría como un **tercer** diálogo encima.
  Ahora hay una lista de verdad (marca, nombre, Editar, Borrar) y **el editor
  es otra vista del mismo panel, no otro diálogo**: con tres ventanas apiladas
  no se sabe cuál cierra cuál. Se vuelve con una flecha en el título.
- El botón "Guardar" del editor **arranca apagado y se prende al cambiar
  algo** (`dirty`): guardar lo mismo que ya estaba no es una acción.
- **Orden nuevo de los bloques**, como lo pidió Camil: Perfil · Guía ·
  Categorías · Apariencia · Notificaciones push · Datos · Cuenta · Zona de
  peligro.
- **"Recordatorios" pasa a llamarse "Notificaciones push"** en todo lo que se
  ve (el bloque, los avisos, el push de prueba). La fila dice "En este
  dispositivo", que es el dato que se confunde.

**Se fue "Ver la bienvenida" de Ajustes.** Camil lo pidió expresamente y
tenía razón: era la misma explicación en dos puertas, una de ellas con un
contador de diez segundos que no tiene sentido para quien la abre a
propósito. **La bienvenida sale una sola vez, al registrarse, y punto**;
`WelcomeDialog` ya no acepta `countdown` ni `onDone`. La guía a pedido vive
en Ajustes → Guía.

**Estado**: `npm test` (185, 2 nuevas estructurales sobre las políticas),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright contra el build
de producción a 1440 oscuro y 390 claro: **59 comprobaciones** — el orden de
los ocho bloques, que no quede rastro de "bienvenida" ni de "Recordatorios",
que la guía y las categorías abran por encima (z=70) y cierren, la lista con
sus tres filas y el cambio a ingresos, que **editar NO abra un tercer
diálogo**, los 11 colores y los 37 íconos, Guardar apagado sin cambios y
prendido al elegir color, la vista previa tomando el tono, el volver, y que
Guardar **llegue de verdad a la acción del servidor**. Sin desborde ni
errores de consola.

## Dónde quedamos (2026-11-19) — una sola vía de instalación: Android

Camil: solo Android, que la descarga deje de ser una página aparte y viva en
la portada, y que Ajustes no ofrezca instalar. La app es **solo para él**, así
que no hay que pensar en Play Store ni en otros dispositivos.

**Se fue `/descargar`.** Era una página con tres tarjetas (Android, iPhone,
Windows) y dos de ellas no ofrecían ningún archivo — en iPhone Apple no
permite instalar por fuera de su tienda, y el paquete de Windows que generaba
PWABuilder no sirve suelto. Dos tarjetas sin archivo hacían ver la tercera,
que sí lo tiene, como una opción más entre varias.

- Ahora es la sección **"Instalar"** de la portada (`#instalar`, entre Precio
  y Preguntas): va al final porque es una acción, y una acción se ofrece
  cuando ya se entendió de qué se trata.
- `next.config.ts` redirige `/descargar` → `/#instalar` (308). **No se borró
  sin más** porque hay tres formas de llegar con un enlace viejo: un marcador,
  la portada guardada en el caché sin conexión, y lo que Google tenga indexado
  del sitemap anterior.
- `VERSION` del Service Worker a **`v4`**: sin eso, quien tuviera `/descargar`
  en el caché seguiría abriendo la página vieja sin señal.
- La comprobación que vale la pena conservar se mudó a `lib/apk.ts`: **el
  botón solo se dibuja si el archivo está de verdad** (`statSync`). Una
  descarga que responde 404 deja a la persona creyendo que la app está rota, y
  es un error que nadie reporta porque parece culpa del teléfono.

**Se fue toda la instalación como PWA**, no solo la fila de Ajustes. Se
borraron `InstallPromptProvider`, `InstallAppButton`, `NativeInstallButton` y
`DownloadView`, y con ellos el botón del menú de cuenta y el ícono de descarga
que salía en el encabezado de teléfono de Resumen, Fijos, Movimientos y Plan.
Si la única vía es el APK, un segundo camino que aparece y desaparece según el
navegador es ruido. **Consecuencia: ya no se maneja `beforeinstallprompt` en
ningún lado.** Si algún día se quiere de vuelta, está en el historial.

**El botón del hero (`InstallCta`) baja a la sección, no descarga.** Un botón
del hero que dispara un archivo grande sin avisar es una emboscada; la sección
dice el tamaño y los tres pasos antes de empezar. De paso dejó de ser
componente de cliente: ya no consulta el estado del navegador, así que no hay
nada que hidratar.

**Copia que se actualizó** porque decía lo contrario: la pregunta "¿Se instala
en el teléfono?" del FAQ (decía "se agrega a la pantalla de inicio desde el
navegador"), la insignia del hero ("Android o desde el navegador" → "App para
Android") y el `operatingSystem` del JSON-LD.

### Lo que viene: APK nativo, y por qué el de hoy no sirve

El APK publicado (`public/downloads/TicoFinanza.apk`, 860 KB) **es un TWA** —
comprobado descomprimiéndolo: trae `androidx.browser.trusted`. O sea Chrome
en una caja con el ícono de la app. Pesa tan poco justamente porque no trae
app adentro.

Camil quiere reemplazarlo por un **APK nativo que siga cargando el sitio en
vivo** (así un cambio en la web sale en el Android sin recompilar). El motivo
de fondo es la sesión anterior: quiere que la app lea las notificaciones de
Google Wallet y de los bancos para registrar el gasto solo, y **un TWA no
puede** — no hay código nativo donde meter un `NotificationListenerService`.
El camino es Capacitor con `server.url` apuntando a producción.

**Decidido con Camil el 2026-11-19: Capacitor.** Su pedido textual fue "que no
dependa de ningún navegador", y tiene razón sobre el APK de hoy: un TWA abre
Chrome por dentro, así que si Chrome está deshabilitado o viejo la app no
abre, y la sesión es la de Chrome. Capacitor no hace eso — no abre ningún
navegador, no muestra barra de direcciones, tiene su propio proceso y su
propia sesión (consecuencia visible: **hay que volver a entrar dentro de la
app**, aunque en Chrome ya estés logueado) y funciona aunque Chrome no esté.

Por dentro dibuja con el **motor web del sistema** (Android System WebView),
que es un componente de Android y no la app de Chrome. Eso se le dijo
explícitamente: es el precio de que un cambio en la web salga en el Android
sin recompilar. **La alternativa de cero motor web es reescribir todo en
Kotlin**, y se descartó porque rompe justo lo que pidió —cada cambio exigiría
recompilar e instalar— y deja dos apps que mantener.

**Dos funciones que ya existen y hay que rehacer al pasar a Capacitor**
(avisado antes de decidir, no son bloqueos pero son trabajo):

- **Las notificaciones push.** Hoy van por el Service Worker (`web-push` +
  VAPID). Dentro de un WebView la API de push del navegador no está
  disponible, así que hay que pasarlas a **Firebase Cloud Messaging**.
- **El modo sin conexión.** El soporte de Service Worker dentro del WebView es
  limitado. Hay que comprobar si el caché de pantallas sigue sirviendo y, si
  no, rehacerlo del lado nativo. Es el mismo punto que la insignia "Funciona
  sin señal" de abajo.

**Se hace después**: primero se pule la web. Tres cosas anotadas para ese
momento:

1. **No va a pesar 150 MB.** Un envoltorio Capacitor que carga el sitio pesa
   del orden de 5–10 MB. El tamaño no es el objetivo; el envoltorio nativo sí.
2. **`public/.well-known/assetlinks.json` se queda por ahora**: es lo que hace
   que el TWA instalado abra sin barra de direcciones. Cuando el APK pase a
   Capacitor deja de hacer falta, pero borrarlo antes le rompe la app que
   Camil tiene instalada hoy.
3. **Revisar la insignia "Funciona sin señal"** de la portada: hoy es cierta
   (Service Worker + caché de pantallas). Dentro de un WebView de Capacitor
   hay que comprobar que el Service Worker siga sirviendo el caché; si no,
   la insignia pasa a ser falsa *para la app* aunque siga siendo cierta para
   la web.

**Estado**: `npm test` (185), `eslint`, `tsc` y `npm run build` limpios. QA con
Playwright contra el build de producción a 1440 oscuro y 768/390 claro: **58
comprobaciones** — la sección con su botón, el tamaño real y los tres pasos,
que no quede ningún enlace a `/descargar` ni mención de instalar en Windows,
que `/descargar` redirija y caiga en la portada, que el hero baje a la sección
en vez de descargar, y que ni Ajustes ni el menú de cuenta ofrezcan instalar.
Sin desborde ni errores de consola.

**Una trampa que volvió a morder**: `next start` en el 3100 **no falla
visiblemente** si ya hay otro escuchando — el viejo sigue sirviendo el build
anterior y la QA prueba código que ya no existe. Hay que matar el proceso por
PID (`netstat -ano | grep :3100`) antes de levantar el nuevo.

## Dónde quedamos (2026-11-19, segunda parte) — modo APK

### `0028_app_lock.sql` — ya corrida (2026-11-19)

Agrega `user_settings.app_lock_pin_hash` y `app_lock_when`. **Segura de
correr y segura de NO correr**: sin ella el bloque "Bloqueo" de Ajustes no
puede guardar nada y el cerrojo queda sin PIN, y nada más cambia. Por eso la
consulta de ajustes del layout pasó a `select("*")` — **nombrar las columnas
haría fallar la consulta entera, y con ella todo el dashboard**, en una base
sin la migración.

Camil pidió tres cosas para el APK de Capacitor, antes de armarlo: que pida
datos biométricos sin tener que cerrar sesión a cada rato, una bienvenida
deslizable que termine en el login con Google, y que **la portada no exista
dentro del APK**. Todo esto es trabajo de la web, hecho antes del envoltorio.

**Cómo sabe la web que está dentro del APK** (`lib/appMode.ts`)

De esto cuelga todo lo demás, porque el APK y la web sirven **el mismo
sitio**. La marca viaja en el identificador del navegador (`appendUserAgent`
de Capacitor, que hay que poner igual en `capacitor.config.ts`). Se eligió
eso y no una cookie ni un parámetro porque el encabezado llega en **toda**
petición: el servidor decide antes de dibujar y nunca se ve la portada
corrigiéndose sola. **No es un control de seguridad** — falsear el
identificador solo te muestra la bienvenida en vez de la portada.

El valor baja por contexto (`AppModeProvider`), nunca se lee
`navigator.userAgent` en el cliente: eso sería un error de hidratación.

**Qué cambia en modo APK**

- `/` **no muestra la portada**: con sesión va al resumen; sin sesión, a
  `/bienvenida` o a `/entrar` según la cookie `tf_intro`. La cookie es del
  dispositivo y no de la cuenta porque se ve **antes** de que haya cuenta
  (la guía de adentro, `onboarding_seen`, es otra cosa).
- **No corre `IdleLogout`.** Un teléfono propio no es una compu prestada. En
  la web se queda tal cual, a los 15 minutos.
- **Corre el cerrojo** (`AppLockGate`), que es lo que lo reemplaza.

**La bienvenida** (`/bienvenida` + `components/app/IntroCarousel.tsx`)

Cuatro láminas más la de entrar, con deslizar, puntos y "Saltar". La entrada
con Google va **en la última lámina y no en una pantalla aparte**: pasar las
láminas y tener que tocar "Entrar" otra vez es un paso de más en algo que se
hace una sola vez. Lleva el **mismo `GoogleSignIn`** que `/entrar`, con su
casilla de términos: el consentimiento explícito fue una decisión tomada
(2026-11-02) y una puerta de entrada nueva no puede saltárselo sin querer.
Quien llegue a `/bienvenida` desde un navegador va a la portada.

**El cerrojo** (`components/app/AppLockGate.tsx`)

- **Es un cerrojo de pantalla, no cifrado**, y se le dijo así a Camil. Frena
  a quien agarra el teléfono desbloqueado. Quien extraiga el almacenamiento
  no pasa por acá; para eso habría que guardar la sesión en el almacén
  seguro de Android y entregarla recién después de la huella.
- **Si no hay con qué abrir, no se cierra**: sin huella registrada y sin PIN
  puesto, deja pasar. Trabar a alguien afuera de sus propios datos es peor
  que el riesgo. Y siempre hay un "Cerrar sesión" en la pantalla de cerrojo,
  porque un PIN olvidado no puede ser el final del camino.
- **El contenido bloqueado va con `hidden` (`display: none`), no con
  `opacity-0`.** El primer intento usó opacidad y la QA leyó los montos del
  DOM: estaban dibujados debajo, transparentes. Con `display: none` no se
  dibuja ni sale en el árbol de accesibilidad, y el árbol de React sigue
  montado, así que no se pierde lo que estuvieras escribiendo.
- La cuenta del tiempo en segundo plano va contra el reloj (`visibilitychange`
  + marca de tiempo), no contra un `setTimeout`: Android congela la app y un
  temporizador se congelaría con ella.
- `lib/native.ts` es **el único punto** donde la web le habla al envoltorio
  nativo. Hoy contesta "no disponible" en todo y la app cae al PIN; el día
  que se arme Capacitor hay un archivo que tocar, no quince componentes.
  Distingue "canceló" de "no se puede" a propósito: si fuera un booleano,
  cancelar se vería igual que un teléfono sin huella.

**El PIN**

- Cinco dígitos (decisión mía, avisada: con dígitos sale el teclado numérico).
  Se guarda **hasheado con scrypt** (`lib/pin.ts`, sin dependencias nuevas) y
  **se verifica en el servidor**, con el límite de intentos que ya existía
  (10 cada 5 minutos). Un hash mandado al navegador se prueba contra las cien
  mil combinaciones en un suspiro. **Contra conocida: sin señal el PIN no
  funciona; la huella sí, porque la resuelve Android.**
- Al ponerlo se pide dos veces: un dígito mal tecleado acá es un cerrojo que
  no abre después, y enterarse el día que lo necesitás es el peor momento.
- Quitarlo **no** pide el PIN actual: para llegar a Ajustes ya hubo que pasar
  el cerrojo.
- El bloque "Bloqueo" de Ajustes **solo se dibuja en modo APK**, entre
  "Datos" y "Cuenta" (es lo mismo que Cuenta: quién puede entrar).

**Aflojar el cerrojo cuesta el PIN actual** (lo levantó la revisión
automática de seguridad del commit, y tenía razón). Quitarlo, cambiarlo o
bajar la exigencia se verifican **en el servidor** contra el hash antes de
escribir nada. Sin eso había una escalada real: a quien le agarran el
teléfono con la app ya abierta —justo el caso del que el cerrojo protege— le
bastaba entrar a Ajustes y ponerlo en "Nunca" para convertir un rato de
acceso prestado en acceso para siempre.

- Qué cuenta como aflojar lo define `weakensLock()`, con su orden explícito
  (`siempre > 1min > 5min > inicio > nunca`) y sus pruebas. **Apretarlo es
  gratis**: si costara, el trámite empujaría a dejarlo flojo. Ojo que
  `inicio` también afloja — deja de pedir al volver, así que con la app viva
  en segundo plano el cerrojo no se vuelve a interponer.
- Las comprobaciones **comparten la cuenta de intentos** con la pantalla de
  cerrojo (misma acción `verify_app_pin`): con una cuenta propia, probar PIN
  desde Ajustes sería la forma de esquivar el límite del cerrojo.
- **Sin PIN puesto solo queda la huella, y eso es más débil**, porque un
  control del lado del teléfono no se puede verificar desde el servidor. Es
  lo que permite la plataforma sin un intercambio de llaves nativo; queda
  anotado por si algún día se hace.
- El PIN actual **no se comprueba en un viaje aparte**: viaja con la
  operación. Comprobarlo antes sería un viaje de más y gastaría un intento
  del límite por gusto.

**`0029_pin_reset_code.sql` — ya corrida (2026-11-19).**
Agrega `purpose` a `account_deletion_codes`. Segura de correr y segura de no
correr: sin ella el borrado de cuenta sigue igual (se detecta y se cae al
camino viejo) y lo único que no anda es recuperar el PIN olvidado, que lo
dice en pantalla.

**El PIN actual se exige SIEMPRE, y la recuperación es por correo.** Esto
costó dos vueltas y la segunda fue un error mío que conviene no repetir:

- Primer intento: pedir el PIN solo cuando el pedido viene del APK, con la
  web como camino de recuperación. **Mal, y lo marcó la revisión de
  seguridad como HIGH.** Mi razonamiento era que falsear el identificador
  exige tener la sesión, y quien la tiene ya puede leer todo. Pero **no hace
  falta falsear nada**: a quien le agarran el teléfono desbloqueado le basta
  abrir Chrome en ese mismo teléfono, donde la sesión de Google suele estar
  viva, y quitar el PIN desde ahí. O sea que la puerta la abría exactamente
  el atacante del que el cerrojo protege. **Lección: "para explotarlo hace
  falta la sesión" no vale cuando el atacante tiene el dispositivo donde esa
  sesión vive.**
- Ahora: `requireCurrentPin` no mira de dónde viene el pedido. Quitar el
  PIN, cambiarlo y aflojar el cerrojo piden el actual en todos lados.
- La recuperación va por donde corresponde: **un código de 8 dígitos al
  correo verificado de la cuenta** (`ForgotPinDialog`,
  `requestPinResetCode`, `resetAppPinWithCode`). Reusa la maquinaria de
  códigos que ya existía para borrar la cuenta, ahora con `purpose` para que
  los dos no se crucen — sin esa columna, el código que pediste para quitar
  el PIN serviría para **borrar tu cuenta**.
- La salida vive **en la pantalla de cerrojo**, que es donde hace falta:
  estando trabado no se puede llegar a Ajustes. También está en Ajustes.
- **Lo que esto no resuelve, y está escrito en el componente**: quien tenga
  tu teléfono desbloqueado puede pedir el código y leerlo en tu propio
  correo. Es un escalón más alto que abrir Chrome y deja rastro en la
  bandeja; es el mismo compromiso que toman las apps que hacen esto. La
  defensa real contra ese caso es que el teléfono tenga su propio bloqueo.

**Capa nueva en `Dialog`: `layer="over"` (z-210).** La QA encontró que el
diálogo de recuperación se dibujaba **debajo** del cerrojo (que es una capa
fija a z-200, para tapar hasta los diálogos que hubieran quedado abiertos
antes de bloquear): se veía y no se podía tocar. Si se agrega algo que tenga
que salir encima del cerrojo, va con esa capa.

**Lo que la revisión marcó y NO se arregló, con su razón**: que con la
sesión del usuario se puede escribir `app_lock_*` directo por la API de
Supabase, saltándose la acción. Es cierto, y no agrega riesgo: la misma RLS
que permite ese UPDATE permite **leer todos los movimientos**. Quien pueda
hacer ese pedido ya tiene los datos, así que blindar las columnas con un
trigger y escrituras por service role defendería algo que ya está abierto
por un camino más corto. **El residuo real es otro y queda anotado**: el
hash del PIN se puede leer con la sesión, y cinco dígitos se revientan al
instante — o sea que quien llegue ahí también se entera del PIN, que la
gente reusa. No llega al navegador (el layout solo pasa `hasPin`), pero la
API lo devolvería. La solución de verdad es guardar el PIN del lado nativo,
y eso es trabajo del día de Capacitor.

**Un falso positivo del lint, documentado en el código**: el arranque en frío
llama a `runBiometrics()` desde un efecto y `react-hooks/set-state-in-effect`
lo marca porque sigue la llamada hacia adentro. No lo es: lo primero que hace
es esperar al diálogo del sistema, así que el estado cambia en otro tick, por
un gesto de la persona. Va con `eslint-disable-next-line` y su explicación.

**Service Worker a `v5`**, y `/` y `/bienvenida` entran en la lista de
páginas que **no** se guardan: deciden según la sesión y según si esto es el
APK o la web, así que una copia vieja podría mostrar la portada dentro de la
app.

### Lo que falta, y es del día de Capacitor

1. **La huella de verdad.** Se construyó todo lo que la rodea, pero no se
   puede probar sin el APK. El plugin previsto es `capacitor-native-biometric`
   y `lib/native.ts` ya está escrito contra su forma.
2. **El login con Google no va a funcionar tal cual dentro del APK.** Google
   bloquea su pantalla de inicio de sesión en vistas web embebidas
   ("disallowed_useragent"); no es un bug nuestro y no se esquiva. La salida
   sin navegador es el inicio de sesión nativo de Play Services. **Buena
   noticia: la app ya entra con `signInWithIdToken`** (`app/auth/callback`),
   no con el flujo alojado de Supabase, así que el plugin nativo devuelve
   exactamente el `id_token` que ya sabemos canjear. Es un agregado, no una
   reescritura.
3. **Ocultar la app en la lista de recientes** (`FLAG_SECURE`): Android
   muestra una miniatura de la última pantalla al cambiar de app, y eso el
   cerrojo web no lo tapa. Es una bandera nativa.
4. Lo ya anotado arriba: push a FCM y revisar el caché sin conexión.

**Estado**: `npm test` (197, 12 nuevas sobre el modo APK y el cerrojo),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright contra el build
de producción a 390, falseando el identificador para entrar en modo APK: **35
comprobaciones** — que la web no cambie, que la raíz del APK lleve a la
bienvenida, las cinco láminas, "Saltar", que la última traiga Google con su
casilla y que sin marcarla no entre, que quede la cookie y la raíz pase a ir
al login, que el cerrojo no trabe a quien no tiene con qué abrir, que con PIN
el contenido **no se vea ni se lea del DOM**, que los cinco dígitos lleguen a
la acción del servidor, y el bloque de Ajustes con sus cinco opciones y el
PIN en dos pasos. Más **13 comprobaciones** sobre la re-autenticación:
que cambiar el PIN pida primero el actual, que ponerlo de cero no pida nada,
que quitarlo lo exija, que apagar el cerrojo y bajarlo a "Solo al abrirla"
abran el pedido de PIN, que cancelar deje el control como estaba, y que
apretarlo pase derecho.

## Dónde quedamos (2026-11-19, tercera parte) — pulido, tanda 1

Camil: que los paneles de adentro se vean mejor, con microinteracciones, "a
detalle" y sin cosas vacías; y que el control de bloqueo use "el diseño de
siempre". Esta tanda cubre **Resumen, el cerrojo y Ajustes**; Fijos,
Movimientos y Plan quedan para la siguiente.

**Antes de planear se miraron las pantallas de verdad**, con una vista
temporal y datos de ejemplo. Vale la pena repetirlo: casi todo lo que se
arregló acá salió de mirar la captura, no de pensar en abstracto.

**La regla del movimiento** (nueva, y vale para la tanda 2): *cada efecto
responde a algo que la persona hace, ninguno se repite solo, y todos se
apagan con `prefers-reduced-motion`*. Dos utilidades nuevas en
`app/globals.css`: `.shake` (PIN rechazado) y `.rise-in` (entrada
escalonada, con el retraso en `--d`).

**El control de bloqueo, con el diseño de siempre**

- `Select` → `Segmented`, el mismo de "Tema" dos filas más arriba. Puestos
  uno sobre otro se notaba que venían de dos apps distintas. Comprobado que
  los dos miden igual (32px).
- **Se quitó la opción "Solo al abrirla"**, que no entraba en cuatro tramos
  y además se parecía demasiado a "Nunca": con la app viva en segundo plano
  el cerrojo no se volvía a interponer. La base sigue aceptando el valor
  (check de la 0028) y `parseLockWhen` lo cae al de por defecto.

**La pantalla de cerrojo**: era el logo flotando en negro con tres enlaces
grises casi del mismo peso. Ahora es un panel sobre superficie, como los
diálogos, con **una sola acción principal** y las salidas debajo y más
calladas. La casilla que sigue lleva el borde de acento (el campo es
invisible, así que sin eso no había ninguna señal de foco) y el PIN
rechazado sacude las casillas una vez.

**Resumen: lo que estaba vacío**

- La tarjeta **"Ingreso total" era la única sin segunda línea** y dejaba un
  hueco en la primera que uno mira. Ahora dice cuánto de lo esperado falta
  por entrar. Hay una comprobación de que las cuatro tienen la misma
  anatomía.
- **Las tarjetas de cuenta** eran nombre + monto y mucho aire: ahora llevan
  el ícono de su tipo, el saldo, y una barra con cuánto pesa dentro del
  total. `accountShare()` mide contra **lo que hay** y no contra el
  patrimonio neto: con una tarjeta en rojo, medir contra el neto hacía que
  una cuenta sola diera más de 100 %. Con pruebas.
- **"Próximos pagos" usa la marca de categoría**, la misma de Fijos y
  Movimientos. El ícono de urgencia se mudó a la columna "Vence", junto al
  plazo en rojo, que es donde está el dato. A 390 la columna del monto cede
  ancho (`w-[6rem] sm:w-[7rem]`): con la marca adelante, "Claude Code Pro"
  quedaba cortado.

**Dos bugs reales encontrados mirando, no reportados**

1. **La leyenda de la dona se desalineaba.** La columna de variación se
   omitía cuando una categoría no tenía con qué comparar, así que esa fila
   perdía una celda y el monto y el porcentaje se corrían a la derecha. Ahora
   la columna se dibuja siempre, vacía. *Para medirlo con Playwright hay que
   comparar el borde **derecho**: están alineados a la derecha y tienen
   anchos distintos, así que su `left` no coincide ni cuando está bien.*
2. **Tocar la dona en teléfono no hacía nada.** El `onClick` que alternaba
   llegaba después del `mouseenter` que ya había activado la porción, así
   que la apagaba al instante. Ahora va por `pointerdown` y **solo cuando
   `pointerType === "touch"`**; el mouse sigue con hover. *Para probarlo hace
   falta un contexto con `hasTouch: true` y `tap()`: un `click()` de mouse
   recorre el otro camino del código.*

**Microinteracciones agregadas**: entrada escalonada de los bloques del
resumen (una vez, al abrir), el saldo contando hacia arriba
(`MoneyCountUp`), hover en las tarjetas de resumen y de cuenta, hundido al
tocar una cuenta, y hover por fila en Próximos pagos.

**`MoneyCountUp` tiene dos trampas resueltas y comentadas**: el primer
render —servidor y cliente— devuelve el **valor final**, porque empezar en
cero sería un error de hidratación; y **todo el estado cambia dentro del
cuadro de animación**, nunca en el cuerpo del efecto (lo marca el compilador
de React). El cero no se ve porque para entonces el contenedor sigue en
opacidad cero por `rise-in`. Mientras cuenta usa cifras de ancho fijo: con
proporcionales el número cambia de largo en cada cuadro y se sacude.

**Algo que yo había dicho mal**: en el plan afirmé que los gráficos no
tenían tooltip. **Sí lo tenían, los dos.** Lo que faltaba era lo de arriba.

**Estado**: `npm test` (201, 4 nuevas sobre el reparto de cuentas), `eslint`,
`tsc` y `npm run build` limpios. QA con Playwright contra el build de
producción a 1440 y 390, más una pasada con movimiento reducido: **27
comprobaciones**.

## Dónde quedamos (2026-11-19, cuarta parte) — pulido, tanda 2

Fijos, Movimientos y Plan, con el mismo lenguaje de la tanda 1. Igual que
antes, se miraron las pantallas con datos de ejemplo antes de tocar nada.

**El hallazgo que vale para toda la app**: en Fijos, el botón del estado
**pagado** llevaba borde (`secondary`) y el de **marcar pagado** iba plano
(`ghost`). O sea que lo ya hecho se veía más accionable que lo que uno viene
a hacer. Se invirtió: la acción pendiente con borde, el estado hecho plano
con su check. *Si aparece otra lista con acción y estado, va así.*

**Fijos**: cada fila dice ahora **de qué cuenta sale** el cobro. El dato
estaba guardado (`account_id`) y no se mostraba en ningún lado; solo se
dibuja de `sm` para arriba, porque en teléfono esa línea ya va justa.

**Plan → Metas**, dos arreglos de lo que se veía vacío o torcido:
- La fila de acciones lleva `mt-auto`: las tarjetas de una hilera miden lo
  que mide la más alta, y sin eso los botones quedaban a distinta altura en
  cada una.
- Una meta **sin fecha objetivo** mostraba el porcentaje y nada más. Ahora
  dice cuánto falta, que es un número que siempre se puede calcular.

**La entrada escalonada vive en `SectionLead`**, no copiada en las tres
vistas: las tres usan ese componente para su cifra protagonista, así que
poniéndola ahí no se pueden desincronizar.

**Lo que NO se tocó, y por qué**: el botón "Saldar" de Deudas sigue plano.
Está posicionado en absoluto y la fila le reserva el ancho con `pr-*` (ver la
nota del 2026-11-01 sobre `md:pr-24`): darle borde lo ensancha y es
exactamente la forma de reabrir ese bug. En Deudas además no hay la
inconsistencia de Fijos — ahí todos los botones son planos.

**Un falso positivo para no repetir**: en la vista de prueba todos los
movimientos mostraban "06:00 p. m.". No es un bug de la app:
`transaction_date` es `timestamptz` y los datos reales traen hora de verdad;
lo que pasaba es que la vista de prueba usaba fechas sin hora, que se leen
como medianoche UTC = 6 p.m. de Costa Rica. **Antes de "arreglar" algo raro
en una vista de prueba, revisar si lo raro son los datos de prueba.**

**Otra vez la trampa del puerto**: `next start` en el 3100 no falla de forma
visible si ya hay otro escuchando — el viejo siguió sirviendo un build
anterior y la captura salió sin CSS y con la pantalla equivocada. Hay que
matar **todos** los procesos del puerto (`Get-NetTCPConnection -LocalPort
3100 | Stop-Process`) antes de levantar el nuevo.

**Estado**: `npm test` (201), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright a 1440 y 390 sobre las seis vistas (fijos, fijos→ingresos,
movimientos, plan→topes, plan→metas, plan→deudas), más una pasada con
movimiento reducido: **23 comprobaciones**.

## Dónde quedamos (2026-11-19, quinta parte) — el formulario de anotar

### `0030_account_icon.sql` — ya corrida (2026-11-19)

Agrega `accounts.icon`. **Segura de correr y segura de NO correrla**: sin
ella cada cuenta sigue con el ícono de su tipo y lo único que falla es
elegir otro, que lo dice en pantalla ("Falta correr la migración 0030").

Camil: que las categorías no salgan todas desparramadas, que estén las
recientes, que la lista completa viva en un modal, que el orden sea
**descripción → monto → categoría → cuenta**, que la fecha y el comprobante
queden como detalle, y que la cuenta pueda tener ícono propio como las
categorías. Lo mismo para ingreso (es el mismo formulario, con la pestaña).

**Las cuatro recientes, y el resto en su diálogo**

- `lib/recentCategories.ts`, con pruebas. **Recientes y no "las que más
  usás"**: la frecuencia se queda pegada al pasado —una categoría que usaste
  mucho en marzo seguiría primera en noviembre— y se mueve tan poco que la
  posición de cada chip cambiaría sin que se note por qué.
- Una categoría **borrada no vuelve por esta puerta**: se cruzan las
  recientes contra las disponibles.
- `visibleCategories()` agrega la elegida si no estuviera entre las cuatro.
  Importa al **editar** un movimiento viejo: su categoría puede no ser
  ninguna de las últimas, y sin eso el formulario abría sin nada marcado,
  como si no tuviera categoría.
- Sin historial (cuenta nueva) se ofrecen las primeras de la lista: cero
  chips y solo un botón sería peor que lo de antes.
- **Crear una categoría se mudó al diálogo.** En el formulario el campo de
  texto competía por el espacio con los chips, y crear es parte de elegir.

**El orden de los campos** quedó como lo pidió: descripción, monto,
categoría, cuenta. **La cuenta salió de "Más detalles"** — estaba escondida
ahí, así que quien no abría ese bloque anotaba todo sin cuenta y los saldos
no cuadraban nunca. Fecha y comprobante se quedan plegados: son los dos que
casi nunca se tocan.

**El foco automático se movió al primer campo** (la descripción). Antes
estaba en el monto; con la descripción arriba, el teclado abría en el
segundo campo y la pantalla arrancaba saltada. *Si resulta más cómodo
escribir el monto primero, se devuelve moviendo `data-autofocus`.*

**Ícono propio de cada cuenta** (migración 0030)

- `AccountMark` dibuja el elegido y cae al del tipo si no hay. Hace falta
  porque con dos cuentas del mismo tipo —la del banco y la de la planilla—
  el ícono del tipo las dibujaba iguales, que es justo lo contrario de para
  lo que está.
- Se ve en "Tus cuentas", en los chips del formulario y en la vista previa
  del diálogo de la cuenta.
- La grilla de íconos se extrajo a `components/ui/IconPicker.tsx`, que ahora
  comparten las categorías y las cuentas.
- El servidor **no confía en el nombre del símbolo** que manda el navegador
  (`isSymbolName`): uno inventado dibujaría una cuenta sin ícono y sin forma
  de darse cuenta.

**Estado**: `npm test` (209, 8 nuevas sobre las categorías recientes),
`eslint`, `tsc` y `npm run build` limpios. QA con Playwright a 1440 y 390:
**23 comprobaciones** — el orden de los cuatro campos, que la fecha no esté
a la vista, el foco en la descripción, los cuatro chips y que sean los
últimos usados, que "Ver todas" abra su diálogo con todas y el campo de
crear, que elegir una cierre y quede marcada, y que la cuenta ofrezca los 36
íconos con su vista previa.

## Dónde quedamos (2026-11-19, sexta parte) — carga, desplegable y el tope

**"Empezá por acá" se pliega.** Todo el encabezado es el disparador —no una
flecha chiquita al lado— y la flecha gira. Se despliega con la altura
animada por framer (`height: auto` medido por él) sobre un
`overflow-hidden`, que es lo que lo hace deslizar en vez de aparecer de
golpe. **Arranca abierto**: quien tiene pasos pendientes necesita verlos; lo
que el desplegable resuelve es poder sacarlos de en medio.

**La carga ahora es la marca, no un círculo** (`components/brand/BrandLoader.tsx`)

- Las cuatro piezas del símbolo se encienden en orden (`brand-load` en
  `app/globals.css`, el retraso de cada una en `--i`). Con
  `prefers-reduced-motion` se quedan quietas y **encendidas**, no a medio
  apagar.
- Es la geometría de `BrandMark` copiada, no el componente: cada pieza
  necesita su propio retraso. **Si cambia el símbolo, cambia en los dos
  archivos y en `public/brand/mark.svg`.**
- `LoadingBadge` es la pastilla fija que usan los cinco `loading.tsx`, sobre
  el esqueleto que cada pantalla ya tenía. El esqueleto dice *qué* se está
  cargando; la marca, que la app está trabajando.

**El caso que de verdad "se quedaba pegado" eran las pestañas.** Cambiar de
Gastos a Ingresos, de mes en Plan o de período en Movimientos es una
navegación que **solo cambia los parámetros de la URL**: no hay cambio de
segmento, así que Next no corta por ningún `loading.tsx` y no pasaba
absolutamente nada hasta que llegaba la respuesta. Se resolvió con
`useLinkStatus` (`components/ui/PendingMark.tsx`), que es justo para esto
según los docs de Next. **Tiene que ir dentro del `<Link>`**: el hook lee el
estado del enlace que lo envuelve. Es chico a propósito — la recomendación
es respuesta sutil y en línea; la pantalla entera se reserva para los
cambios de ruta.

**El tope de Plan dejó de abrir el menú del sistema.** Era el único lugar de
la app con un `<select>` nativo a la vista; ahora usa el mismo
`CategoryPicker` de los movimientos, con las marcas de color. Al **editar**
un tope la categoría no se cambia —sería borrar uno y crear otro— así que
ahí se muestra sola, sin control.

**Un bug que encontró la QA**, y que vale para el `CategoryPicker` entero:
el respaldo "si no hay recientes, mostrá las primeras" preguntaba si la
lista final estaba vacía, y nunca lo estaba (`visibleCategories` siempre
devuelve al menos la elegida). Resultado: en una cuenta sin historial, y en
el diálogo de topes —que no le pasa recientes—, se dibujaba **un solo chip**
y "Ver todas". Ahora el respaldo se mide sobre las recientes.

**Estado**: `npm test` (209), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright: **19 comprobaciones** — el desplegable abre, cierra y gira
la flecha; el tope sin `<select>` y con cuatro chips; la marca animada con
sus cuatro retrasos escalonados; y todo quieto con movimiento reducido.

## Dónde quedamos (2026-11-20) — las dos primeras automatizaciones

### `0031_recurring_movements.sql` — ya corrida (2026-11-20)

**Ojo: la primera versión no se podía correr.** La columna `weekday` tenía
un `check` en línea, y Postgres a esos les pone de nombre
`<tabla>_<columna>_check` — justo el que yo le había dado a mano a la
restricción de tabla de más abajo. Las dos chocaban dentro del mismo CREATE
TABLE y la migración entera fallaba con **42710: check constraint
"recurring_movements_weekday_check" already exists**, sin crear nada. Está
corregido (`recurring_movements_semanal_dia_check`) y hay una prueba en
`lib/supabase/policies.test.ts` que recorre todas las migraciones buscando
ese choque, porque el error solo aparece al correr la SQL contra la base y
desde acá no hay forma de hacerlo.

Crea la tabla de movimientos que se repiten. **Segura de correr y segura de
NO correrla**: sin ella el panel de "Lo que se repite hoy" no sale y el
botón "Repetir" del formulario avisa que falta la migración. Nada más
cambia.

De las tres automatizaciones que pidió Camil se hicieron **dos**. La tercera
—leer las notificaciones de Wallet y de los bancos— es la que necesita el
envoltorio nativo, y él mismo dejó Capacitor para después. **No se
escribieron parsers a ciegas**: inventar el formato de una notificación que
no se puede ver es exactamente cómo nació el bug de 2026-08-15 (compras del
Banco Popular registradas como BAC). El primer paso de esa función es
capturar texto real de notificaciones del teléfono de Camil.

**Gastos fijos que parecen ya pagados** (`lib/autoPayments.ts`, sin migración)

- Empareja un gasto fijo pendiente con un movimiento del **mismo monto, la
  misma cuenta y cerca del día de cobro** (3 días antes, 6 después) que no
  esté ya atado a ningún fijo. Lo propone en el resumen; un toque marca
  pagado **y ata el movimiento**.
- **Atar el movimiento importa tanto como marcar el estado**: sin
  `fixed_expense_id` ese gasto contaría como variable *además* de contar
  como fijo, y el mes cerraría con el alquiler sumado dos veces.
- **El monto tiene que coincidir exacto.** Con tolerancia, un recibo que
  varía mes a mes emparejaría con cualquier cosa. Cada movimiento se usa una
  sola vez y cada fijo se queda con el más cercano a su día.
- **Propone, no marca.** Un emparejamiento equivocado desarma el saldo
  proyectado sin que nadie se entere; con la propuesta, lo peor que pasa es
  decir que no. La fila muestra **el movimiento que lo prueba**, para poder
  decir que no con criterio.
- No hizo falta migración: `transactions.fixed_expense_id` existe desde la
  0022.

**Movimientos que se repiten y no son fijos** (`lib/recurring.ts`, migración 0031)

- El almuerzo de los días hábiles, el bus. Frecuencias: días hábiles, todos
  los días, una vez por semana. **No hay mensual a propósito**: eso es
  exactamente un gasto fijo, y tener las dos cosas es cómo se termina con el
  alquiler anotado dos veces.
- Se crean desde el formulario de movimiento con el botón **"Repetir"**, al
  lado de "Anotar en dólares" y "Dividir cuenta". Solo al registrar: un
  movimiento viejo no se convierte en recurrencia.
- **Solo se propone la de hoy, nunca las de días pasados.** Rellenar hacia
  atrás suena útil y no lo es: el monto del almuerzo del martes no se sabe
  hoy, y una lista de seis propuestas viejas se despacha con "no" sin
  mirarla — con lo cual la función deja de servir justo el día que importaba.
- **El monto es editable antes de confirmar, y ese es el punto.** Si la app
  insertara sola con el monto de la plantilla, el saldo se iría separando
  del real un poco cada día.
- `last_confirmed_date` evita repetir la propuesta el mismo día. Una fecha
  guardada **en el futuro** (reloj desajustado) se trata como confirmada:
  fallar hacia "no molestar" es mejor que proponer en bucle.
- La migración trae **las cuatro políticas de RLS**, la de UPDATE incluida:
  sin ella, confirmar no podría escribir `last_confirmed_date` y la app
  propondría para siempre, sin dar error (ver la 0027).

**Un desborde que encontró la QA**: la fila de "Lo que se repite hoy" tenía
el monto editable y los dos botones en un `shrink-0`, y a 390px se salía de
la pantalla. Ahora las acciones bajan a su propia línea en teléfono.

**Estado**: `npm test` (233, 24 nuevas entre el emparejamiento y las
recurrencias), `eslint`, `tsc` y `npm run build` limpios. QA con Playwright
contra el build de producción a 1280 y 390: **33 comprobaciones** — que la
propuesta muestre el movimiento que la justifica, que decir que no la saque
sin tocar el servidor, que el monto de una recurrencia se pueda cambiar,
que "Anotar" llegue a la acción, y que el formulario ofrezca las tres
frecuencias sin ninguna mensual.


## Estado al 2026-11-20 — todo al día antes de Capacitor

**No queda ninguna migración pendiente.** Camil corrió a mano las 31 en
Supabase Studio; las últimas (0027 a 0031) el 19 y el 20 de noviembre. Los
avisos de "MIGRACIÓN SIN CORRER" que quedan más arriba en este archivo son
**historia de la sesión en que se escribieron**, no tareas abiertas: se
dejaron con su explicación porque lo que cuentan —por qué existe cada
columna y qué se rompía sin ella— sigue valiendo.

**Todo lo commiteado está en producción**: `main` y el remoto en el mismo
commit, y `www.ticofinanza.com` sirviendo el despliegue de ese commit.
Humo verificado: portada, `/entrar`, `/privacidad`, `/terminos`,
`/sin-conexion`, `/sw.js` y el manifiesto en 200; `/dashboard` en 307 al
login y `/api/reminders` sin secreto en 401.

**Lo que NUNCA se ha podido probar desde este entorno**, y que sigue
pendiente de mirar en producción con la cuenta de verdad (el `.env.local`
trae marcadores en vez de las claves de Supabase, ver la nota del
2026-09-13):

- La subida real de un comprobante a Storage **sí se confirmó** (2026-11-02).
- El envío real de un push y la corrida del cron.
- El prorrateo de una meta anual y el panel de aguinaldo con datos reales.
- La salida de impresión del reporte mensual.
- Las dos automatizaciones nuevas: que un gasto fijo se empareje de verdad
  con su movimiento, y que una recurrencia vuelva a proponerse al día
  siguiente.

### Lo que falta del lado nativo, para cuando se arme el APK

Está todo escrito en las notas del 2026-11-19 (segunda parte). En orden:

1. **Envoltorio Capacitor** con `server.url` a producción y
   `appendUserAgent` con la marca `TicoFinanzaApp` — tiene que coincidir con
   `APP_UA_MARKER` en `lib/appMode.ts` o el APK se comporta como la web.
2. **Login nativo de Google** (Play Services). El flujo web no funciona
   dentro de una vista embebida; la buena noticia es que `/auth/callback` ya
   canjea un `id_token` con `signInWithIdToken`.
3. **Huella** con `capacitor-native-biometric`: `lib/native.ts` ya está
   escrito contra su forma y es el único archivo que hay que tocar.
4. **Push a FCM**: dentro de un WebView no existe la API de push del
   navegador.
5. **`FLAG_SECURE`**, para que los saldos no salgan en la miniatura de la
   lista de apps recientes.
6. **Revisar el caché sin conexión** dentro del WebView, y con él la
   insignia "Funciona sin señal" de la portada.
7. **Lector de notificaciones** (`NotificationListenerService`). El primer
   paso **no es escribir parsers**: es capturar texto real de notificaciones
   del teléfono de Camil. Inventar el formato es exactamente como nació el
   bug de 2026-08-15, con compras del Banco Popular registradas como BAC.

## Dónde quedamos (2026-11-20, segunda parte) — el ícono y el color, en su diálogo

Camil, viendo la app: en "Editar cuenta" y en el editor de categorías los
íconos salían "en la pura cara". Tenía razón, y en los dos lados: treinta y
siete íconos (más once colores en el de categoría) sueltos entre el nombre
y el botón de guardar. En el de la cuenta había que pasar la grilla entera
para llegar a "Guardar".

**`components/ui/StylePickerDialog.tsx`** es ahora el único lugar donde se
eligen ícono y color, y lo comparten la cuenta y la categoría. En el
formulario queda **una fila** (`StyleRow`): la vista previa, qué está
elegido en una palabra, y un botón "Cambiar". El formulario de la cuenta
pasó de un muro de cuadritos a **497px de contenido** — "Guardar" se ve sin
desplazarse.

- **Se guarda al confirmar, no al tocar cada cuadrito.** Cancelar deja todo
  como estaba, y hay una comprobación de eso: antes, al estar en línea, cada
  toque ya modificaba el formulario de atrás.
- El color es **opcional** en el componente (`value.color === undefined`):
  una cuenta no tiene color propio, su marca se tiñe sola. Si algún día se
  le quiere dar uno, es una columna y pasarle `color` — el diálogo ya lo
  dibuja.
- El `ToneButton` que vivía duplicado en `CategoryDialog` se mudó acá.

**Estado**: `npm test` (234), `eslint`, `tsc` y `npm run build` limpios. QA
con Playwright a 1280 y 390: **25 comprobaciones** — que no quede ninguna
grilla en los dos formularios, que el selector abra aparte con sus 37
íconos (y los 11 colores en el de categoría), que quede por encima, que
confirmar aplique y cancelar no, y que "Guardar" se vea sin desplazarse.

## Dónde quedamos (2026-11-20, tercera parte) — arrancó Capacitor

Primer paso del APK nativo. **Todavía no se compiló ninguno**: lo que hay es
el envoltorio, los íconos y la forma de construirlo sin instalar nada en la
máquina de Camil. Lo que falta está en `docs/android.md`, en orden.

**El envoltorio** (`capacitor.config.ts`, `android/`)

- **Carga el sitio en vivo** (`server.url` a `https://www.ticofinanza.com`),
  no una copia empacada: por eso un cambio en la web sale en el Android sin
  recompilar, que es lo que pidió Camil.
- **`appId: com.ticofinanza.app`, distinto del TWA viejo**
  (`com.ticofinanza.www.app`). Reusar el id haría que Android se negara a
  instalar encima por la firma distinta ("app no instalada"). Con uno propio
  el APK nuevo entra limpio; el viejo se desinstala aparte.
- **`webDir` apunta a `capacitor-web/`, no a `public/`.** Con `public/`,
  `cap sync` empacaba 1,2 MB de capturas **y el APK viejo dentro del APK
  nuevo**, sin que nada de eso se use. En esa carpeta solo vive la pantalla
  de "no se pudo conectar".
- **`appendUserAgent: "TicoFinanzaApp/1"`** es la pieza de la que cuelga todo
  el modo APK. `lib/appMode.test.ts` lo comprueba **leyendo
  `capacitor.config.ts`**, no una copia del texto, y el workflow lo vuelve a
  comprobar sobre el JSON ya generado. Está verificado que la prueba falla si
  se cambia la marca: si se desajustara, el APK se comportaría como la web
  —portada en vez de bienvenida, sin cerrojo, con cierre por inactividad— y
  **nada daría error**.

**Compilar sin Android Studio**: `.github/workflows/android.yml`, a mano
desde la pestaña Actions. Dos variantes: `debug` (se instala sin configurar
nada) y `release` (firmado, con cuatro secretos). **No corre en cada push a
propósito**: el contenido viene del sitio en vivo, así que un APK nuevo solo
hace falta cuando cambia el envoltorio.

La firma de release se arma sola **solo si existe `FIRMA_STORE`**
(`android/app/build.gradle`): sin esa variable el bloque no se declara, así
que compilar en local sigue funcionando sin tener la llave.

**Los íconos** salen de `node scripts/generate-android-icons.mjs`, con la
misma geometría del símbolo que el resto de la marca. Sin correrlo la app
queda con el logo de Capacitor. El `foreground` del ícono adaptativo va al
42 % del lienzo porque Android lo recorta con la forma del launcher y solo
garantiza el 66 % del centro; y el fondo pasó de blanco a `#0b0b0d`, que con
el símbolo en tinta clara era lo que lo hacía invisible.

**Un error mío, para no repetirlo**: truncando un archivo con
`open(dst,"w").write(open(src).read())`. Python evalúa el `open(...,"w")`
primero, así que **vacía el destino antes de leer el respaldo** — y si el
respaldo no existe, el archivo se pierde. `capacitor.config.ts` no estaba
versionado todavía, así que no había de dónde recuperarlo. Para probar algo
destructivo: `cp` al scratchpad primero, y recién después tocar.

**Endurecido tras la revisión de seguridad del commit**, y tenía razón: ese
job recibe la llave de firma del APK, así que `android-actions/setup-android`
quedó **fijada a un commit** (una etiqueta se puede mover), el workflow
declara `permissions: contents: read`, y el secreto de la llave entra por
`env` en vez de interpolado dentro del `run`. Las acciones `actions/*` se
quedan con etiqueta: son de GitHub.

**Estado**: `npm test` (236, 2 nuevas sobre el envoltorio), `eslint`, `tsc` y
`npm run build` limpios con `android/` en el árbol.

## Dónde quedamos (2026-11-21) — el APK nativo entra con Google

**Funciona de punta a punta.** Camil instaló el APK release firmado con su
llave, entró con el selector de cuentas de Android —sin que se abra ningún
navegador— y cayó en el resumen dentro de la app.

### La bienvenida del APK, rehecha

Camil: "se ve un poco vacía". Lo era: cada lámina era un ícono de 64px, un
título y una línea centrados con `flex-1`, o sea ~280px muertos arriba y
~230 abajo en un teléfono de 844. Ahora cada lámina **muestra la pantalla de
la que habla** (`components/app/IntroVisuals.tsx`: el saldo, el formulario
de anotar, los fijos con su día de cobro, un tope con una meta y una deuda)
más tres puntos concretos debajo del título.

- **Son maquetas dibujadas, no capturas.** Una captura envejece sola —ya
  pasó con la de `/entrar`, que seguía mostrando el rail lateral eliminado—
  y los componentes de verdad piden contexto, sesión y datos.
- **`h-full` no estira a un hijo de `AnimatePresence`**: se queda en la
  altura del contenido, así que el `justify-between` no tenía contra qué
  repartir y todo se apilaba arriba. Va `absolute inset-0`.
- Y con `justify-between` el vacío de los bordes aparecía **entero en el
  medio**: 500px entre el dibujo y su título, que separa dos cosas que se
  leen juntas. Va `justify-center`: lo que llena la pantalla es que el
  bloque ahora es grande, no que esté estirado.
- El movimiento va bajo `MotionConfig reducedMotion="user"`, así ninguna
  lámina tiene que acordarse de apagar su animación.

### El login nativo (`lib/googleNative.ts` + `/auth/nativo`)

El flujo web manda el navegador a `accounts.google.com`; adentro del APK ese
dominio no es el del sitio, así que Capacitor se lo entrega al navegador del
sistema y la sesión queda **en Brave**, no en la app. Forzarlo dentro del
WebView tampoco: Google lo rechaza a propósito (`disallowed_useragent`).

Ahora el token se le pide a Play Services y se canja en `/auth/nativo`, que
hace **lo mismo** que `/auth/callback`: `signInWithIdToken`. No se tocó nada
de Supabase. El correo de bienvenida se extrajo a `lib/auth/welcome.ts` para
que las dos puertas no diverjan.

**Costó cuatro intentos, y cada uno dejó una lección:**

1. **`scopes` rompe el login en Android.** Le pasaba
   `scopes: ["email","profile"]` y el plugin contesta *"You CANNOT use
   scopes without modifying the main activity"* — **cualquier** lista se
   interpreta como "quiero permisos extra" y exige tocar la `MainActivity`,
   sin importar que sean los básicos. Y no hacían falta: el plugin ya pide
   `openid`, `userinfo.email` y `userinfo.profile`, que son exactamente los
   de `LOGIN_SCOPE`. **No volver a nombrarlos.** El día que la app necesite
   un permiso de verdad sobre datos de Google, ahí sí hay que modificar el
   nativo y recompilar.
2. **La detección del puente va por `window.androidBridge`, no por
   `window.Capacitor`** (`lib/nativeBridge.ts`). Este último lo *crea* el JS
   de `@capacitor/core`, que en una app empacada viene en su `index.html`;
   la nuestra carga el sitio en vivo, así que la página es nuestro HTML de
   Next y no trae ese script. Por eso `@capacitor/core` reconoce la
   plataforma mirando `androidBridge`, y por eso nosotros también. El
   criterio vive en **un solo archivo** y lo comparte el cerrojo con huella,
   que tenía la misma copia mal.
3. **`useIsApp()` devolvía `false` justo donde importaba.**
   `AppModeProvider` solo está montado en `app/dashboard/layout.tsx`, y
   `/entrar` y `/bienvenida` quedan afuera. Se quitó esa dependencia en vez
   de subir el provider: **el servidor ya manda `googleClientId` solo en
   modo APK, así que su presencia ES la señal**. Una decisión tomada una vez
   en el servidor y entregada como dato, en lugar de dos fuentes que pueden
   discrepar.
4. **El error real tiene que verse en pantalla.** El motivo iba a
   `console.error` y dentro del APK no hay consola a la que asomarse: lo que
   se veía era un "no se pudo" que no dice nada, y diagnosticar así es
   adivinar. Ahora el detalle del plugin sale recortado a 160 caracteres —
   fue lo que resolvió el punto 1 en un intento. De paso: la lista de lo que
   cuenta como "canceló" incluía `16:`, que se come cualquier mensaje con
   ese número y convierte una falla real en silencio absoluto.

### Login CSRF en `/auth/nativo` — lo levantó la revisión y era real

El ataque no es robar la sesión: es **meter a la víctima en la cuenta del
atacante**, que después le lee los gastos. Lo permitía que un `<form>` de
otro sitio puede mandar `Content-Type: text/plain` con un cuerpo que es JSON
válido, y `request.json()` parsea igual sin mirar la cabecera: sin
preflight, sin CORS, con las cookies de la víctima. **Comprobado con curl
contra el build vulnerable: llegaba hasta Supabase.**

Tres cierres: mismo origen (`Origin` o `Sec-Fetch-Site`, y si no hay ninguna
de las dos se rechaza — falla cerrado), `Content-Type: application/json`
comprobado **antes** de parsear, y **el nonce lo pone el servidor** en una
cookie httpOnly SameSite=Strict, obligatorio y de un solo uso. Antes lo
generaba el navegador y lo mandaba junto al token, o sea que un atacante
mandaba los dos suyos y la comprobación no comprobaba nada.

### La firma, y por qué el `release` dejó de ser opcional

Google ata el login nativo a la huella SHA-1 de la llave que firma el APK
más el nombre del paquete. El debug se firma con una llave que **el runner
genera nueva en cada corrida**, así que ahí el login nativo no puede
funcionar nunca.

- La llave de Camil está en `Desktop\ticofinanza.jks` y en los cuatro
  secretos del repo. Su huella:
  `9A:A2:A9:5C:F7:3E:9B:D3:40:A6:04:B1:72:E4:D7:F5:18:9D:DF:66`, registrada
  en un cliente OAuth de tipo **Android** con el paquete
  `com.ticofinanza.app`. **Si se pierde la llave, además de no poder
  actualizar la app, el login deja de funcionar hasta registrar la nueva.**
- `Desktop\firma-ticofinanza.ps1` rehace los secretos: pide la contraseña,
  **la comprueba contra la llave antes de cargar nada** y escupe la huella.
- Al plugin se le pasa el ID del cliente **web**, no el de Android: es el
  público (`aud`) al que va dirigido el token y el que el backend ya valida.
  El de Android no se nombra en el código.
- **`keytool -printcert -jarfile` dice "no es un archivo jar firmado" y eso
  NO significa que el APK esté sin firmar**: solo entiende la firma v1
  (JAR), y los APK modernos usan v2/v3, que viven en el APK Signing Block.
  Se comprueba sacando el certificado de ahí.

### Lo que falta del lado nativo

1. **Huella.** `lib/native.ts` está escrito contra
   `capacitor-native-biometric`, que **peerea contra Capacitor 3 y está
   abandonado**; estamos en 8. El mantenido es
   `@aparajita/capacitor-biometric-auth` v10.
2. **Push a FCM**: dentro de un WebView no existe la API de push del
   navegador.
3. **`FLAG_SECURE`**, para que los saldos no salgan en la miniatura de
   recientes.
4. **Revisar el caché sin conexión** dentro del WebView, y con él la
   insignia "Funciona sin señal" de la portada.
5. **Lector de notificaciones.** El primer paso sigue siendo capturar texto
   real de notificaciones del teléfono, no escribir parsers.

**Recordar**: todo lo anterior es código web y sale sin recompilar el APK,
porque carga el sitio en vivo. Solo hace falta un APK nuevo cuando cambia el
envoltorio: el ícono, un permiso, un plugin nativo.

## Dónde quedamos (2026-11-21, segunda parte) — huella, recientes, y cinco fail-opens

Los dos pendientes nativos chicos. **Hay que recompilar el APK para que
tomen efecto** (son código nativo); el resto de los arreglos de esta nota
es web y sale solo.

### Huella

`capacitor-native-biometric` pedía `@capacitor/core` 3 y está abandonado;
vamos por el 8. Se cambió por **`@aparajita/capacitor-biometric-auth` v10**.
Nunca había llegado a correr, así que no arregló nada roto: habilitó algo
que no existía. El contrato de `lib/native.ts` no cambió, así que
`AppLockGate` no se tocó.

- **`allowDeviceCredential: false`.** Aceptar el desbloqueo del teléfono
  como alternativa volvería el cerrojo decorativo: existe justo para el
  caso de que alguien tenga el teléfono ya desbloqueado en la mano.
- **`@capacitor/app` entra como dependencia transitiva del plugin**, así
  que está en JS pero `cap sync` **no lo registra del lado nativo** (solo
  registra las directas). Hoy no molesta porque lo único que lo usa es
  `addResumeListener`, que no llamamos. Si algún día se usa: agregarlo al
  `package.json` y recompilar.

### Los saldos fuera de la lista de recientes

Android guarda una miniatura de la última pantalla, y acá esa foto es el
saldo — visible para quien agarre el teléfono y toque el botón de cambiar
de app, sin pasar por el cerrojo.

`FLAG_SECURE` lo evita, pero **puesta de forma permanente —como se explica
en todos lados— también prohíbe las capturas de pantalla**, y eso tiene un
costo real: es como se reportan los problemas. Toda esta app se depuró con
capturas. Así que se pone en `onPause` (**antes** de `super`, porque el
sistema puede tomar la miniatura apenas empieza la pausa) y se quita en
`onResume`.

### Cinco fail-opens en el cerrojo, todos míos, todos del mismo día

La revisión automática los levantó en cinco rondas. **El patrón: cada vez
arreglé el caso que tenía delante en vez de la regla.** Vale la pena
leerlos juntos, porque la causa es una sola.

`"no-disponible"` es el **único** valor con el que `AppLockGate` abre la app
sola cuando no hay PIN —decisión tomada: trabar a alguien afuera de sus
propios datos es peor que el riesgo—. Así que cualquier cosa que devuelva
ese valor **es una puerta**, y yo le fui metiendo significados de más:

1. **`biometryLockout`** (Android tras varios intentos fallidos). Mi
   razonamiento: "durante ese rato la huella no es un camino, al PIN".
   Correcto con PIN, catastrófico sin él: **fallar la huella cinco veces
   abría la app**, o sea que el ataque del que el cerrojo protege era
   también la forma de saltárselo.
2. **Un plugin que no carga, o `checkBiometry()` que tira.** Dentro del APK
   eso es un error nuestro, no ausencia de hardware. Ahora → `"error"`.
3. **`isAvailable: false` tomado como definitivo.** También sale así con la
   huella bloqueada. Se arregló `authenticate()` y quedó abierta esta otra
   puerta, que es por donde pasa el arranque en frío.
4. **`biometryNotAvailable` no significa lo que el nombre sugiere.**
   Leyendo el Android del plugin, ahí caen **tres** cosas:
   `ERROR_HW_NOT_PRESENT` (permanente), `ERROR_HW_UNAVAILABLE` ("el sensor
   existe pero ahora no está disponible") y `BIOMETRIC_STATUS_UNKNOWN`, que
   cae por el `default` del mapa. Abrir ante un "ahora no" es malo; ante un
   "no sé", peor.
5. **El orden de las comprobaciones.** La de hardware corría antes que la
   del sistema, y Android es inconsistente declarando características —hay
   teléfonos con reconocimiento facial que no declaran `FEATURE_FACE`—, así
   que ese teléfono abría la app **sin preguntar nada**.

**Cómo quedó**: `isAvailable` manda sobre todo; el hardware
(`biometryType`, que sale de `hasSystemFeature`) solo cuenta cuando las dos
señales están de acuerdo; y **tres** códigos pueden abrir sin PIN, fijados
por una prueba de lista cerrada. La decisión completa vive en
`decidirDisponibilidad()`, una función pura — **el orden quedaba fuera de
toda prueba, y ahí aparecieron los dos últimos fallos**.

De paso, uno sin reportar: en Ajustes, aflojar el cerrojo sin PIN solo se
bloqueaba si el resultado era `"cancelado"`, así que un error del lector lo
aflojaba sin que nadie confirmara nada.

### Tres bugs del cerrojo en producción, en orden

Encontrados uno tras otro con Camil probando en su teléfono.

1. **Se quedaba en "Esperando tu huella..." sin salida.** Lo peor no era
   colgarse: **"Usar el PIN" estaba `disabled={asking}`**, así que mientras
   esperaba una huella que no iba a llegar, el único camino alternativo
   estaba apagado. Ese enlace **nunca** va deshabilitado: el diálogo del
   sistema es modal —si aparece, lo tapa igual— y si no aparece, es la
   única salida.
2. **Bajaba el lector justo al desbloquear.** Estaba con `import()`
   dinámico "para que no entre en el bundle de la web". Bonito y mal: el
   momento de desbloquear es muchas veces sin señal, y si ese pedazo no
   estaba guardado, la pantalla esperaba una descarga que no llegaba. Ahora
   se importa arriba y viaja dentro de la página. **Un cerrojo que depende
   de la red para abrirse no es un cerrojo, es una tranca.**
3. **No pedía huella al volver a la app.** El único aviso era
   `visibilitychange`, y **dentro de un WebView de Android ese evento no es
   fiable**: cuando el sistema pausa la actividad, muchas veces nunca llega.
   Se agregó un detector que no depende de eventos: **un latido cada 2 s
   contra el reloj**; un hueco de 6 s o más quiere decir que congelaron la
   app. Mientras el cerrojo está en pantalla no mide, porque el propio
   diálogo de huella pausa la app y si no entraría en bucle.

### Y la causa de que nada de eso se notara

`revalidatePath("/dashboard")` **no alcanza un layout**, y el cerrojo lee
`app_lock_when` ahí. Se guardaba bien en la base y la app seguía con el
valor viejo. Peor: **Capacitor no recarga la página al volver desde la
lista de recientes** —el WebView sigue vivo con el mismo documento—, así
que ese valor viejo no se corregía ni "cerrando" la app, solo si Android
mataba el proceso.

Las nueve revalidaciones del archivo de ajustes pasaron a
`revalidatePath("/dashboard", "layout")`. **Regla para el futuro: si el
dato lo lee un layout, la revalidación va con `"layout"`.**

Consecuencia atendida: ahora que el valor llega en vivo, activar el cerrojo
desde Ajustes hacía saltar el diálogo de huella encima de esa pantalla. El
arranque en frío se guarda contra `lockedRef`, así que corre al montar y
nada más.

### Lecciones que se repitieron toda la sesión

- **El error real tiene que verse en pantalla.** Dentro del APK no hay
  consola a la que asomarse; un fallo en silencio no se puede arreglar.
  Costó cuatro rondas con el login de Google y se volvió a repetir con el
  cerrojo. Las dos veces, mostrar el motivo lo resolvió en un intento.
- **Decir el paso en curso** ("Abriendo el lector...", "Consultando...",
  "Esperando tu huella...") convirtió "no carga" en un diagnóstico exacto.
- **Ir a leer el código del plugin** en vez de razonar sobre los nombres de
  sus constantes. Eso resolvió lo de `scopes` y lo de
  `biometryNotAvailable`.

### Lo que falta del lado nativo

1. **Push a FCM**: dentro de un WebView no existe la API de push del
   navegador.
2. **Revisar el caché sin conexión** dentro del WebView, y con él la
   insignia "Funciona sin señal" de la portada.
3. **Leer las notificaciones de Wallet y de los bancos.** El primer paso
   sigue siendo capturar texto real de notificaciones del teléfono.
