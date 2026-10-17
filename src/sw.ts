/// <reference lib="webworker" />
// Eigener, robuster Service Worker (statt Workbox-Automatik):
// - Installation lädt die App-Hülle mit Wiederholungen; nur Code/Styles/HTML sind Pflicht.
// - Rezeptbilder werden beim ersten Abruf gecacht (und von der App im Leerlauf vorgeladen).
// - Updates: neue Version wartet, bis die App „Neu laden“ bestätigt (SKIP_WAITING).
export {};
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };

const MANIFEST = self.__WB_MANIFEST;
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const APP_CACHE = 'morgenwerk-app-' + hash(JSON.stringify(MANIFEST));
const ART_CACHE = 'morgenwerk-art';
const scope = new URL(self.registration.scope);
const abs = (u: string) => new URL(u, scope).href;
const APP_URLS = new Set(MANIFEST.map(e => abs(e.url)));
const INDEX = abs('index.html');
const critical = (u: string) => /\.(js|css|html)$/.test(new URL(u).pathname);

async function fetchWithRetry(url: string, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 300 * (i + 1)));
  }
  throw last;
}
async function cacheOne(cache: Cache, url: string): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try { await cache.put(url, await fetchWithRetry(url)); return true; }
    catch { await new Promise(r => setTimeout(r, 300 * (i + 1))); }
  }
  return false;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const urls = [...APP_URLS];
    // Höchstens 4 gleichzeitig – schont die Verbindung
    const failed: string[] = [];
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < urls.length) { const u = urls[next++]; if (!(await cacheOne(cache, u))) failed.push(u); }
    }));
    const missingCritical = failed.filter(critical);
    if (missingCritical.length) throw new Error('Pflichtdateien fehlen: ' + missingCritical.join(', '));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('morgenwerk-app-') && name !== APP_CACHE) await caches.delete(name);
    // Reste der früheren Workbox-Version entfernen
    for (const name of await caches.keys()) if (name.startsWith('workbox-') || name === 'recipe-art' || name === 'step-art') await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) void cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // Seitenaufrufe: App-Hülle aus dem Cache (Single-Page-App mit Hash-Routing)
  if (req.mode === 'navigate') {
    event.respondWith(caches.match(INDEX).then(hit => hit || fetch(req)).catch(() => fetch(req)));
    return;
  }
  const clean = url.origin + url.pathname;
  if (APP_URLS.has(clean)) { event.respondWith(cacheFirst(req, APP_CACHE)); return; }
  if (/\/art\/[a-z]\d+(-\d+)?\.webp$/.test(url.pathname)) { event.respondWith(cacheFirst(req, ART_CACHE)); return; }
});
