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
- Deploy manual siempre: `git push origin main` + `npx vercel --prod` (no
  hay auto-deploy conectado a GitHub). Dominio de producción actual:
  `www.ticofinanza.com`.

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
