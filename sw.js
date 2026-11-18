// Service worker: guarda la app para usarla sin conexión (el mapa necesita internet).
const CACHE = 'escalera-mba-v2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/store.js', './js/engine.js', './js/practice.js', './js/quant.js', './js/gamify.js', './js/charts.js',
  './data/schools.js', './data/verbal.js', './data/vocab.js', './data/quant-extra.js', './data/issues.js', './data/guide.js',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './fonts/barlow-condensed-latin-500-normal.woff2', './fonts/barlow-condensed-latin-600-normal.woff2', './fonts/barlow-condensed-latin-700-normal.woff2',
  './fonts/ibm-plex-sans-latin-400-normal.woff2', './fonts/ibm-plex-sans-latin-700-normal.woff2', './fonts/ibm-plex-sans-latin-400-italic.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Red primero para tener siempre la versión nueva; caché si no hay conexión.
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
