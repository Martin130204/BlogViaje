/* sw.js — Desactivado a propósito.
   El service worker causaba estados de caché rotos (páginas en blanco, versiones viejas).
   Esta versión se AUTO-ELIMINA: borra las cachés, se desregistra y recarga la pestaña,
   dejando el sitio cargando siempre fresco desde la red (GitHub Pages + CDN). */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
    } catch (_) {}
  })());
});
/* Sin handler de 'fetch': todas las peticiones van directo a la red. */
