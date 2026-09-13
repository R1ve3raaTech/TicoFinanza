// Passthrough sin caché: no cambia cómo carga la app, pero un listener de
// "fetch" es parte de lo que algunos navegadores revisan para decidir si
// ofrecer el prompt de instalación (el resto del criterio — manifest válido,
// íconos, HTTPS — ya estaba).
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "finanzascr", {
      body: data.body,
      icon: "/icon-192.png",
      // Android usa solo el canal alfa del badge: tiene que ser una silueta
      // sin fondo, si no se ve un cuadrado blanco.
      badge: "/badge-96.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/dashboard"));
});
