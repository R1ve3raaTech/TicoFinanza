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
const VERSION = "v1";
const STATIC_CACHE = `tf-static-${VERSION}`;
const PAGES_CACHE = `tf-pages-${VERSION}`;
const OFFLINE_URL = "/sin-conexion";

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
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
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
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES_CACHE);
          return (
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match(OFFLINE_URL)) ||
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
 * Borrar lo guardado cuando alguien cierra sesión a propósito.
 *
 * El HTML guardado trae los montos de esa persona. En una compu compartida
 * quedaría al alcance de quien entre después, con solo navegar sin señal.
 * El cierre por inactividad NO borra: ahí vuelve la misma persona, y
 * perder el modo sin conexión cada quince minutos lo volvería inútil.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "tf-clear-pages") return;
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n.startsWith("tf-pages-")).map((n) => caches.delete(n)))
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
