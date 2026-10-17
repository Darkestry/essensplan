// Lädt die Rezeptbilder nach der Installation im Hintergrund in den Offline-Cache
// (zuerst alle Gerichtsbilder, dann die Schrittbilder; der Service Worker speichert sie).
import { BASE } from './data.ts';

const DONE_KEY = 'morgenwerk-art-warm';
const PARALLEL = 4;

export async function warmArtCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const version = String(BASE.length);
  try { if (localStorage.getItem(DONE_KEY) === version) return; } catch { /* egal */ }
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>(r => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }));
  }
  const urls = [
    ...BASE.map(r => `./art/${r.id}.webp`),
    ...BASE.flatMap(r => r.steps.map((_, i) => `./art/${r.id}-${i}.webp`)),
  ];
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let next = 0, failed = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (next < urls.length) {
      // Bei Datensparmodus oder ohne Netz nicht im Hintergrund laden
      if (conn?.saveData || !navigator.onLine) return;
      const u = urls[next++];
      try { const r = await fetch(u); if (!r.ok) failed++; } catch { failed++; }
    }
  }));
  if (!failed && next >= urls.length) { try { localStorage.setItem(DONE_KEY, version); } catch { /* egal */ } }
}
