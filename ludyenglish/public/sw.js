const CACHE = "ludy-v2";
const ASSETS = ["/", "/manifest.json"]; // on évite d’épingler index.html pour ne pas figer les anciens bundles

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Pour les navigations (HTML / SPA), on privilégie le réseau
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // Pour le reste (manifest, icônes, etc.) : cache-then-network simple
  event.respondWith(caches.match(request).then((response) => response || fetch(request)));
});
