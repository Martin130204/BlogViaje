/* sw.js — Service worker: cachea el "cascarón" para que el sitio abra offline.
   Los datos en vivo (Supabase, tiles del mapa, fotos) siempre van a la red. */
const CACHE = "viaje-asia-v2";
const CORE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/config.js",
  "./js/backend.js",
  "./js/features.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Sólo gestionamos peticiones de nuestro propio origen; el resto (Supabase, tiles,
  // fotos externas, fuentes) va directo a la red.
  if (url.origin !== self.location.origin) return;

  // Red primero (así siempre ves lo último al actualizar); la caché es el
  // respaldo cuando estás sin conexión.
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() =>
      caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});
