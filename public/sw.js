// ---------------------------------------------------------------------------
// Caché para que la app abra sin señal
// ---------------------------------------------------------------------------
//
// Hasta acá, sin datos la app no abría: cualquier navegación pedía al
// servidor y caía en la pantalla del dinosaurio. Ahora se guarda el último
// HTML de cada pantalla y se sirve cuando la red falla.
//
// Lo que se muestra así son números viejos, y eso en una app de plata no se
// puede esconder: la app avisa en pantalla desde dónde viene lo que estás
// viendo (ver components/offline/OfflineBanner.tsx).
//
// Subir VERSION invalida todo lo guardado. Hay que hacerlo cuando cambie
// algo que deje el HTML viejo incompatible con el código nuevo.
// v3 (2026-11-07): Ajustes dejó de ser pantalla y pasó a ser un diálogo.
// Sin subir la versión, quien tuviera /dashboard/ajustes en el caché seguiría
// abriendo la pantalla vieja sin señal, y las píldoras de navegación nuevas
// convivirían con HTML guardado que todavía dibujaba el rail.
const VERSION = "v3";
const STATIC_CACHE = `tf-static-${VERSION}`;
const PAGES_PREFIX = "tf-pages-";
const OFFLINE_URL = "/sin-conexion";
/** Lo guardado deja de servirse a los siete días: ver pagesCacheFor(). */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STAMP_HEADER = "x-tf-cached-at";
/**
 * Cuánto vale la marca de sesión sin refrescarse. Igual que en
 * lib/pageCache.ts, que es quien la escribe.
 *
 * La marca dice "hubo sesión viva hace poco", no "hay sesión ahora":
 * quien cierra el navegador sin salir no pasa por ningún borrado. Sin
 * esto quedaría viva para siempre, autorizando a leer el caché mucho
 * después de que la sesión murió.
 */
const MARK_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Quién puede ver lo guardado
// ---------------------------------------------------------------------------
//
// El servidor manda las pantallas con `Cache-Control: private, no-store`.
// La Cache Storage API no respeta esa cabecera, así que guardarlas acá es
// pasarle por encima a propósito, y eso solo vale si lo guardado deja de
// estar disponible apenas termina la sesión.
//
// Por eso cada caché de pantallas lleva el id de su dueño en el nombre, y
// solo se sirve si la marca de sesión —que la página escribe al abrir y
// borra al salir, ver lib/pageCache.ts— dice que esa misma persona tiene
// sesión abierta. Sin marca no se sirve nada: falla cerrado.
function readActiveOwner() {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open("ticofinanza-sesion", 1);
    } catch {
      resolve(null);
      return;
    }
    // Si la base no existe todavía, no hay sesión que valga.
    req.onupgradeneeded = () => req.transaction?.abort();
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("marca")) {
        resolve(null);
        return;
      }
      const get = db.transaction("marca", "readonly").objectStore("marca").get("duenio-activo");
      get.onsuccess = () => {
        const mark = get.result;
        // Cualquier forma inesperada (una marca vieja, guardada como
        // texto suelto) cuenta como que no hay sesión: falla cerrado.
        if (!mark || !mark.userId || typeof mark.userId !== "string" || !Number.isFinite(mark.at)) {
          resolve(null);
          return;
        }
        const age = Date.now() - mark.at;
        // Con fecha futura es un reloj desajustado, no una sesión fresca.
        resolve(age >= 0 && age <= MARK_MAX_AGE_MS ? mark.userId : null);
      };
      get.onerror = () => resolve(null);
    };
  });
}

function pagesCacheFor(owner) {
  return `${PAGES_PREFIX}${VERSION}-${owner}`;
}

async function dropAllPages() {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name.startsWith(PAGES_PREFIX)).map((name) => caches.delete(name))
  );
}

/** Guarda la respuesta con la hora, para poder vencerla después. */
async function putStamped(cacheName, request, response) {
  const body = await response.blob();
  const headers = new Headers(response.headers);
  headers.set(STAMP_HEADER, String(Date.now()));
  const cache = await caches.open(cacheName);
  await cache.put(
    request,
    new Response(body, { status: response.status, statusText: response.statusText, headers })
  );
}

function isTooOld(response) {
  const stamp = Number(response.headers.get(STAMP_HEADER));
  return !Number.isFinite(stamp) || Date.now() - stamp > MAX_AGE_MS;
}

/** Archivos con hash en el nombre: su contenido nunca cambia. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    /^\/(icon|badge|apple-touch)-[\w-]+\.(png|ico|svg)$/.test(url.pathname)
  );
}

/**
 * Páginas que NO se guardan.
 *
 * `/entrar` y `/auth/*` deciden a dónde mandarte según la sesión: servir
 * una copia vieja puede dejarte mirando una pantalla de login cuando ya
 * entraste, o al revés. Y `/api/*` son datos, no pantallas.
 */
function isUncacheablePage(url) {
  return (
    url.pathname === "/entrar" ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/api/")
  );
}

self.addEventListener("install", (event) => {
  // La pantalla de respaldo no lleva datos de nadie, así que va en el
  // caché de estáticos y sobrevive al cierre de sesión.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
  // Sin esperar a que se cierren las pestañas viejas: una versión nueva del
  // caché no sirve de nada si tarda días en activarse.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("tf-") && !name.endsWith(VERSION))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Inmutables: del caché directo, y si no están se bajan y se guardan.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pantallas: primero la red, y el caché solo cuando la red falla. Al
  // revés mostraría datos viejos a alguien que tiene señal, que es
  // exactamente lo que no queremos.
  if (request.mode === "navigate" && !isUncacheablePage(url)) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok && res.type === "basic") {
            const owner = await readActiveOwner();
            // Sin sesión no se guarda: una pantalla pública no necesita
            // caché con dueño, y una con datos no debería existir acá.
            if (owner) await putStamped(pagesCacheFor(owner), request, res.clone());
          }
          return res;
        })
        .catch(async () => {
          const owner = await readActiveOwner();
          // Sin dueño vigente no se sirve nada, y además se borra: si la
          // marca venció, lo guardado ya no tiene a quién pertenecer.
          if (!owner) await dropAllPages();
          if (owner) {
            const cache = await caches.open(pagesCacheFor(owner));
            const hit = await cache.match(request, { ignoreSearch: true });
            // Vencida: se borra en vez de mostrar números de hace semanas.
            if (hit && isTooOld(hit)) await cache.delete(request, { ignoreSearch: true });
            else if (hit) return hit;
          }
          return (
            (await caches.match(OFFLINE_URL)) ||
            new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        })
    );
  }

  // Todo lo demás (incluidos los pedidos `?_rsc=` de Next) va a la red sin
  // tocar el caché. Guardarlos sería una segunda copia de los datos que
  // podría no coincidir con el HTML guardado.
});

/**
 * Borrado de respaldo, por si alguna pantalla lo pide por mensaje.
 *
 * El camino principal es `endSession()` en lib/pageCache.ts, que borra
 * directo desde la página con `caches.delete`: se puede esperar y
 * funciona aunque no haya un worker activo. Un mensaje sin respuesta se
 * perdía en silencio si el worker no estaba listo.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "tf-clear-pages") return;
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n.startsWith(PAGES_PREFIX)).map((n) => caches.delete(n)))
      )
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "TicoFinanza", {
      body: data.body,
      icon: "/icon-192.png",
      // Android usa solo el canal alfa del badge: tiene que ser una silueta
      // sin fondo, si no se ve un cuadrado blanco.
      badge: "/badge-96.png",
      // Con tag, el aviso de "mañana se cobra" reemplaza al de "pasado
      // mañana" en vez de apilarse: dos avisos del mismo recibo en la
      // bandeja se leen como un error de la app.
      tag: data.tag,
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  // Si la app ya está abierta se la enfoca en vez de abrir otra pestaña:
  // tocar el aviso tres veces no debería dejar tres TicoFinanza abiertas.
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
