// Passthrough sin caché: no cambia cómo carga la app, pero un listener de
// "fetch" es parte de lo que algunos navegadores revisan para decidir si
// ofrecer el prompt de instalación (el resto del criterio — manifest válido,
// íconos, HTTPS — ya estaba).
self.addEventListener("fetch", () => {});

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
