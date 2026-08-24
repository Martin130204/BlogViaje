/* sw.js — Service worker RED-PRIMERO (confiable): siempre trae lo último de la red
   y usa la caché sólo como respaldo offline. Se auto-repara al actualizar. */
const CACHE = "viaje-asia-v5";
const CORE = [
  "./", "./index.html", "./css/styles.css",
  "./js/config.js", "./js/backend.js", "./js/features.js", "./js/vendor/supabase.js",
  "./manifest.json", "./assets/icon-192.png", "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  // Cachear sin que un fallo puntual rompa la instalación.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Borra cachés viejas
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Recarga las pestañas abiertas para salir de cualquier estado roto anterior
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, tiles, fuentes → red directa

  // Red primero; si falla (offline), respaldo en caché.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
      )
  );
});
