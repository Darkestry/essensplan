// Zustand: Standardwerte, Validierung importierter/gespeicherter Daten, Migration alter Formate.
import type { AppState, Entry, Foods, RecipeSource, Settings, Slot, Week } from './types.ts';
import { ALLERGENS, SLOTS, sanitizeCustom } from './recipes.ts';
import { isDate, mondayOf, mondayOfIso } from './util.ts';
import { BOOSTERS } from './boosters.ts';

export const defaultSettings = (): Settings => ({
  goalKcal: 3000, goalProtein: 140, pantry: ['salt', 'blackpepper'], milk: 'cow', persons: 1, appetite: 1,
  slots: { breakfast: true, lunch: true, dinner: true, snack: true }, thermosDays: [0, 1, 2, 3, 4], boxMl: 650,
  diet: 'all', exclude: [], theme: 'auto', shopDay: -2,
});
export const defaultState = (): AppState => ({ version: 3, settings: defaultSettings(), weeks: {}, favorites: [], blocked: [], weights: [], custom: [] });
export const emptyDay = () => ({ breakfast: null, lunch: null, dinner: null, snack: null }) as Record<Slot, Entry | null>;
export const emptyWeek = (): Week => ({ days: Array.from({ length: 7 }, emptyDay), have: {}, done: {}, boost: {} });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
/** Validiert beliebige Eingaben (localStorage, Import) zu einem gültigen Zustand. */
export function sanitize(raw: unknown, F: Foods, baseIds: Set<string>): AppState {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Loose;
  const out = defaultState();
  out.custom = sanitizeCustom(s.custom, F);
  const ids = new Set([...baseIds, ...out.custom.map((c: RecipeSource) => c.id)]);
  const st = (s.settings || {}) as Loose, o = out.settings;
  if (Number.isFinite(st.goalKcal) && st.goalKcal >= 1200 && st.goalKcal <= 6000) o.goalKcal = Math.round(st.goalKcal);
  if (Number.isFinite(st.goalProtein) && st.goalProtein >= 30 && st.goalProtein <= 400) o.goalProtein = Math.round(st.goalProtein);
  if (Array.isArray(st.pantry)) o.pantry = st.pantry.filter((k: string) => F[k]);
  if (['cow', 'goat'].includes(st.milk)) o.milk = st.milk;
  if ([1, 2, 3, 4, 5, 6].includes(st.persons)) o.persons = st.persons;
  if ([0.8, 1, 1.25, 1.5].includes(st.appetite)) o.appetite = st.appetite;
  if (st.slots && typeof st.slots === 'object') for (const k of SLOTS) if (typeof st.slots[k] === 'boolean') o.slots[k] = st.slots[k];
  if (Array.isArray(st.thermosDays)) o.thermosDays = st.thermosDays.filter((d: number) => Number.isInteger(d) && d >= 0 && d < 7);
  if ([400, 500, 650, 750, 1000].includes(st.boxMl)) o.boxMl = st.boxMl;
  if (['all', 'pesc', 'veg', 'vegan'].includes(st.diet)) o.diet = st.diet;
  if (Array.isArray(st.exclude)) o.exclude = st.exclude.filter((a: string) => ALLERGENS[a]);
  if (['auto', 'light', 'dark'].includes(st.theme)) o.theme = st.theme;
  if ([-3, -2, -1].includes(st.shopDay)) o.shopDay = st.shopDay;
  const entry = (e: Loose): Entry | null => {
    if (!e || typeof e !== 'object') return null;
    if (typeof e.t === 'string') return { t: e.t.slice(0, 60) };
    if (typeof e.r === 'string' && ids.has(e.r)) return e.lo ? { r: e.r, lo: 1 } : { r: e.r };
    return null;
  };
  for (const [k, w] of Object.entries((s.weeks || {}) as Record<string, Loose>)) {
    if (!isDate(k) || !w || !Array.isArray(w.days)) continue;
    out.weeks[k] = {
      days: Array.from({ length: 7 }, (_, i) => Object.fromEntries(SLOTS.map(sl => [sl, entry(w.days[i]?.[sl])])) as Record<Slot, Entry | null>),
      have: Object.fromEntries(Object.entries(w.have || {}).filter(([f, q]) => F[f] && Number.isFinite(q))) as Record<string, number>,
      done: Object.fromEntries(Object.entries(w.done || {}).filter(([, v]) => v === true)) as Record<string, true>,
      boost: Object.fromEntries(Object.entries(w.boost || {}).filter(([d, l]) => /^[0-6]$/.test(d) && Array.isArray(l))
        .map(([d, l]) => [d, (l as string[]).filter(b => BOOSTERS.some(x => x.id === b))])),
    };
  }
  out.favorites = Array.isArray(s.favorites) ? s.favorites.filter((id: string) => ids.has(id)) : [];
  out.blocked = Array.isArray(s.blocked) ? s.blocked.filter((id: string) => ids.has(id)) : [];
  out.weights = Array.isArray(s.weights)
    ? s.weights.filter((w: Loose) => w && isDate(w.d) && Number.isFinite(w.kg) && w.kg > 20 && w.kg < 300).map((w: Loose) => ({ d: w.d, kg: w.kg }))
      .sort((a: { d: string }, b: { d: string }) => a.d.localeCompare(b.d))
    : [];
  return out;
}

/** Altes Frühstücks-Format (v1: eine Woche mit Rezeptnummern 1–20) */
export function migrateV1(o: Loose): Loose {
  const monday = isDate(o.weekStart) ? mondayOfIso(o.weekStart) : mondayOf();
  const id = (n: number) => 'b' + String(n).padStart(2, '0');
  const days = Array.from({ length: 7 }, (_, i) => ({ breakfast: o.week?.[i] ? { r: id(o.week[i]) } : null, lunch: null, dinner: null, snack: null }));
  return {
    settings: { persons: [1, 2, 3, 4].includes(Number(o.portions)) ? Number(o.portions) : 1, slots: { breakfast: true, lunch: false, dinner: false, snack: false } },
    weeks: { [monday]: { days, have: {}, done: {} } },
    favorites: (o.favorites || []).map(id),
  };
}
export const isV1 = (o: Loose): boolean => !!o && o.version === 1 && Array.isArray(o.week);
