// Lädt die Rezeptbilder nach der Installation im Leerlauf nacheinander in den Offline-Cache.
// (Der Service Worker cacht sie über seine Laufzeit-Regel; hier wird nur nacheinander angefragt.)
import { BASE } from './data.ts';

const DONE_KEY = 'morgenwerk-art-warm';

function idle(): Promise<void> {
  return new Promise(r => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 2000 }) : setTimeout(r, 200)));
}
export async function warmArtCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const version = String(BASE.length);
  try { if (localStorage.getItem(DONE_KEY) === version) return; } catch { /* egal */ }
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>(r => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }));
  }
  const urls = BASE.flatMap(r => [`./art/${r.id}.webp`, ...r.steps.map((_, i) => `./art/${r.id}-${i}.webp`)]);
  for (const u of urls) {
    // Bei schlechter Verbindung oder Datensparmodus nicht im Hintergrund laden
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData || !navigator.onLine) return;
    await idle();
    try { await fetch(u); } catch { return; }
  }
  try { localStorage.setItem(DONE_KEY, version); } catch { /* egal */ }
}
