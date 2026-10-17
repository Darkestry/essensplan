// Service Worker: App-Shell offline verfügbar machen. VERSION und FILES setzt tools/build.js.
const VERSION = 'f7813dca48';
const FILES = ["./","index.html","manifest.webmanifest","data/app-data.json","css/app.css","js/art.js","js/main.js","js/store.js","js/timer.js","js/util.js","js/views/common.js","js/views/editor.js","js/views/more.js","js/views/plan.js","js/views/recipes.js","js/views/shop.js","js/views/weight.js","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon.svg"];
const CACHE = 'morgenwerk-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('morgenwerk-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Cache first, dann Netz; Navigationen fallen offline auf die App-Shell zurück.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).catch(() => req.mode === 'navigate' ? caches.match('./') : Response.error())));
});
