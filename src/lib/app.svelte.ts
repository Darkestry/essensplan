// Reaktiver App-Zustand (Svelte 5 Runes) + Persistenz.
// Die Logik-Module in core/ lesen über ctx – innerhalb von $derived/Komponenten sind alle Zugriffe reaktiv.
import { setCtx } from './core/context.ts';
import { buildRecipes } from './core/recipes.ts';
import { defaultState, isV1, migrateV1, sanitize } from './core/state.ts';
import type { AppState, Recipe } from './core/types.ts';
import { BASE, BASE_IDS, F } from './data.ts';

const STORAGE_KEY = 'morgenwerk-v2';
const LEGACY_KEY = 'morgenwerk-fruehstueck-v1';

function load(): { state: AppState; ok: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { state: sanitize(JSON.parse(raw), F, BASE_IDS), ok: true };
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) return { state: sanitize(migrateV1(JSON.parse(old)), F, BASE_IDS), ok: true };
    return { state: defaultState(), ok: true };
  } catch {
    return { state: defaultState(), ok: false };
  }
}
const initial = load();

export const app: AppState = $state(initial.state);
export const storage = $state({ ok: initial.ok });

// Rezepte hängen nur von eigenen Rezepten und der Milchart ab → werden nur dann neu aufbereitet.
const recipes: Recipe[] = $derived(buildRecipes(BASE, app.custom, F, app.settings.milk));
const byId = $derived(new Map(recipes.map(r => [r.id, r])));

export const db = {
  F,
  get R(): Recipe[] { return recipes; },
  get byId(): Map<string, Recipe> { return byId; },
};
setCtx({ F, get R() { return recipes; }, get byId() { return byId; }, state: app });

/** Importierte Daten übernehmen (Backup-Datei, alte Frühstücksdatei) */
export function importState(obj: unknown): void {
  const src = isV1(obj) ? migrateV1(obj) : obj;
  if (!src || typeof src !== 'object' || !('weeks' in src)) throw new Error('Unbekanntes Format');
  Object.assign(app, sanitize(src, F, BASE_IDS));
}
export function resetAll(): void {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(app, defaultState());
}

// Speichern: entprellt, sobald sich irgendetwas am Zustand ändert.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify(app);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, json); storage.ok = true; } catch { storage.ok = false; }
    }, 150);
  });
});
try { void navigator.storage?.persist?.(); } catch { /* optional */ }
