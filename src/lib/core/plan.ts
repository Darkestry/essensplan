// Wochenplan: Einträge, Portionen, Tagessummen, Booster, Gewicht, automatischer Wochenvorschlag.
import { ctx } from './context.ts';
import type { Entry, Nutrition, Recipe, Slot, Week } from './types.ts';
import { SLOTS, goatText } from './recipes.ts';
import { BOOSTERS } from './boosters.ts';
import { emptyWeek } from './state.ts';
import { addDays, dayIndex, mondayOfIso, norm, parseIso, weekDates } from './util.ts';

export { BOOSTERS };

// ---------- Einträge ----------
export function week(monday: string, create = false): Week | undefined {
  const s = ctx.state;
  if (!s.weeks[monday] && create) s.weeks[monday] = emptyWeek();
  return s.weeks[monday];
}
export const getEntry = (date: string, slot: Slot): Entry | null => ctx.state.weeks[mondayOfIso(date)]?.days[dayIndex(date)]?.[slot] ?? null;
export const recipeOf = (e: Entry | null | undefined): Recipe | undefined => (e && 'r' in e ? ctx.byId.get(e.r) : undefined);
export const isLeftover = (e: Entry | null | undefined): boolean => !!(e && 'r' in e && e.lo);
export function setEntry(date: string, slot: Slot, entry: Entry | null): void {
  const w = week(mondayOfIso(date), true)!;
  const day = w.days[dayIndex(date)];
  const prev = day[slot];
  day[slot] = entry;
  // Wird ein Abendessen geändert, verliert der daran hängende Reste-Mittag am Folgetag seine Quelle.
  if (slot === 'dinner' && prev && 'r' in prev && (!entry || !('r' in entry) || prev.r !== entry.r)) {
    const next = addDays(date, 1);
    if (isLeftover(getEntry(next, 'lunch'))) setEntry(next, 'lunch', null);
  }
}
export const portionsBase = (): number => ctx.state.settings.persons * ctx.state.settings.appetite;
export function hasLeftoverFrom(date: string): boolean {
  const lo = getEntry(addDays(date, 1), 'lunch'), d = getEntry(date, 'dinner');
  return !!(lo && 'r' in lo && lo.lo && d && 'r' in d && d.r === lo.r);
}
/** Wie viele Portionen werden für diesen Eintrag tatsächlich gekocht? */
export function cookPortions(date: string, slot: Slot): number {
  const e = getEntry(date, slot);
  if (!e || !('r' in e) || e.lo) return 0;
  return portionsBase() * (slot === 'dinner' && hasLeftoverFrom(date) ? 2 : 1);
}
export interface PlanItem { date: string; slot: Slot; entry: Entry; recipe?: Recipe }
export function entriesOf(monday: string): PlanItem[] {
  const out: PlanItem[] = [];
  for (const date of weekDates(monday)) for (const slot of SLOTS) {
    const e = getEntry(date, slot); if (!e) continue;
    out.push({ date, slot, entry: e, recipe: recipeOf(e) });
  }
  return out;
}
export const activeSlots = (): Slot[] => SLOTS.filter(s => ctx.state.settings.slots[s]);
export const filled = (date: string): number => activeSlots().filter(s => getEntry(date, s)).length;
export function copyWeek(from: string, to: string): boolean {
  const src = ctx.state.weeks[from]; if (!src) return false;
  ctx.state.weeks[to] = { days: src.days.map(d => ({ ...d })), have: {}, done: {}, boost: { ...src.boost } };
  return true;
}
export function clearWeek(monday: string): void { delete ctx.state.weeks[monday]; }

// ---------- Filter & Vorlieben ----------
export function allowed(r: Recipe): boolean {
  const s = ctx.state.settings;
  if (s.diet === 'vegan' && r.diet !== 'vegan') return false;
  if (s.diet === 'veg' && !['veg', 'vegan'].includes(r.diet)) return false;
  if (s.diet === 'pesc' && r.diet === 'meat') return false;
  return !s.exclude.some(a => r.allergens.includes(a));
}
export const quickTime = (r: Recipe): number => r.time.quick ?? r.time.total;
export const isBlocked = (id: string): boolean => ctx.state.blocked.includes(id);
export const isFavorite = (id: string): boolean => ctx.state.favorites.includes(id);
export function toggleIn(list: 'blocked' | 'favorites', id: string): void {
  const s = ctx.state; s[list] = s[list].includes(id) ? s[list].filter(x => x !== id) : [...s[list], id];
}

// ---------- Tagessummen & Booster ----------
export const goatKey = (k: string): string => (ctx.state.settings.milk === 'goat' && ctx.F[k]?.goat) || k;
export const boosterItems = (b: string): [string, number][] =>
  (BOOSTERS.find(x => x.id === b)?.items || []).filter(([k]) => ctx.F[k]).map(([k, q]) => [goatKey(k), q]);
export function boosterNutrition(b: string): Nutrition {
  const n: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const [k, q] of boosterItems(b)) for (const key of Object.keys(n) as (keyof Nutrition)[]) n[key] += (ctx.F[k][key] || 0) * q / 100;
  return n;
}
export function boosterLabel(b: string): string {
  const l = BOOSTERS.find(x => x.id === b)?.label || '';
  return ctx.state.settings.milk === 'goat' ? goatText(l.replace('Stück Käse', 'Stück Ziegenkäse')) : l;
}
export const boostsOn = (date: string): string[] => ctx.state.weeks[mondayOfIso(date)]?.boost?.[dayIndex(date)] || [];
export function toggleBoost(date: string, id: string): void {
  const w = week(mondayOfIso(date), true)!;
  const d = String(dayIndex(date)), list = w.boost[d] || [];
  w.boost[d] = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}
export interface DayTotals extends Nutrition { n: number; boost: number }
export function dayTotals(date: string): DayTotals {
  const t: DayTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, n: 0, boost: 0 };
  const keys = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
  for (const slot of SLOTS) {
    const r = recipeOf(getEntry(date, slot)); if (!r) continue;
    for (const k of keys) t[k] += r.nutrition[k] * ctx.state.settings.appetite;
    t.n++;
  }
  for (const b of boostsOn(date)) { const n = boosterNutrition(b); for (const k of keys) t[k] += n[k]; t.boost += n.kcal; }
  return t;
}
/** Vorschläge, die die Lücke zum Tagesziel am besten schließen */
export function boosterSuggestions(date: string) {
  const s = ctx.state.settings, t = dayTotals(date);
  const gap = s.goalKcal - t.kcal, pGap = s.goalProtein - t.protein;
  const active = boostsOn(date);
  const ok = (id: string) => boosterItems(id).every(([k]) => !s.exclude.some(a => ctx.F[k].allergens.includes(a)) && !(s.diet === 'vegan' && ctx.F[k].type !== 'plant'));
  return BOOSTERS.filter(b => !active.includes(b.id) && ok(b.id))
    .map(b => ({ ...b, n: boosterNutrition(b.id) }))
    .sort((a, b) => (pGap > 15 ? b.n.protein - a.n.protein : 0) || Math.abs(gap - a.n.kcal) - Math.abs(gap - b.n.kcal));
}

// ---------- Gewicht ----------
export function setWeight(d: string, kg: number): void {
  const s = ctx.state;
  const list = s.weights.filter(w => w.d !== d);
  if (Number.isFinite(kg)) list.push({ d, kg: Math.round(kg * 10) / 10 });
  s.weights = list.sort((a, b) => a.d.localeCompare(b.d));
}
/** Trend als lineare Regression über die letzten 6 Wochen (kg pro Woche) */
export function weightTrend(): { perWeek: number; weeks: number; n: number } | null {
  const w = ctx.state.weights;
  if (w.length < 2) return null;
  const last = parseIso(w[w.length - 1].d).getTime();
  const pts = w.filter(x => (last - parseIso(x.d).getTime()) / 864e5 <= 42).map(x => [(parseIso(x.d).getTime() - last) / 864e5 / 7, x.kg]);
  if (pts.length < 2) return null;
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  if (!sxx) return null;
  const slope = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx;
  return { perWeek: Math.round(slope * 100) / 100, weeks: -pts[0][0], n: pts.length };
}

// ---------- Automatischer Wochenvorschlag ----------
// Punktebasiert: Zeitbudget, Abwechslung (ähnliche Titel), Favoriten, gesperrte Rezepte,
// angebrochene Packungen weiterverwenden und – beim Zunehmen – energiereichere Gerichte bevorzugen.
const STOP = new Set(['mit', 'und', 'oder', 'vom', 'aus', 'auf', 'ohne', 'dazu', 'frisch', 'knusprige', 'knusprigen', 'warme', 'warmer', 'schnelle', 'schneller', 'herzhafte', 'herzhafter', 'cremige', 'cremiger']);
const titleWords = (r: Recipe) => new Set(norm(r.title).split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w)));
export function autofill(monday: string, { overwrite = false, random = Math.random } = {}): number {
  const { F, R, state } = ctx;
  const s = state.settings;
  const w = week(monday, true)!;
  const prev = state.weeks[addDays(monday, -7)];
  const usedBefore = new Set(prev ? prev.days.flatMap(d => SLOTS.map(sl => { const e = d[sl]; return e && 'r' in e ? e.r : null; })).filter(Boolean) : []);
  if (overwrite) w.days = w.days.map(() => ({ breakfast: null, lunch: null, dinner: null, snack: null }));
  const free = (i: number, slot: Slot) => !w.days[i][slot];
  const chosen: Recipe[] = [];
  const need: Record<string, number> = {};
  const add = (r: Recipe, portions: number) => {
    chosen.push(r);
    for (const i of r.ingredients) if (F[i.k]?.pack && !F[i.k].staple) need[i.k] = (need[i.k] || 0) + i.q * portions;
  };
  for (const d of w.days) for (const sl of SLOTS) { const r = recipeOf(d[sl]); if (r && !isLeftover(d[sl])) add(r, portionsBase()); }
  const rest = (k: string) => { const f = F[k]; if (!need[k]) return 0; return Math.ceil(need[k] / f.pack - 1e-6) * f.pack - need[k]; };
  const gain = s.goalKcal >= 2600;
  const score = (r: Recipe, portions: number) => {
    let sc = random() * 2;
    if (state.favorites.includes(r.id)) sc += 3;
    if (usedBefore.has(r.id)) sc -= 2;
    const tw = titleWords(r);
    for (const c of chosen) { let o = 0; for (const x of titleWords(c)) if (tw.has(x)) o++; sc -= o * 2.5; }
    for (const i of r.ingredients) { const f = F[i.k]; if (!f?.pack || f.staple) continue; const rs = rest(i.k); if (rs > 0) sc += Math.min(1, Math.min(i.q * portions, rs) / f.pack) * 4; }
    if (gain) sc += (r.nutrition.kcal - 700) / 250;
    return sc;
  };
  const best = (slot: Slot, filter: (r: Recipe) => boolean, portions = portionsBase()) => {
    const ids = new Set(chosen.map(c => c.id));
    const cands = R.filter(r => r.meals.includes(slot) && allowed(r) && !isBlocked(r.id) && !ids.has(r.id) && filter(r));
    if (!cands.length) return null;
    return cands.map(r => [score(r, portions), r] as const).sort((a, b) => b[0] - a[0])[0][1];
  };
  let count = 0;
  const put = (i: number, slot: Slot, r: Recipe | null, portions = portionsBase()) => {
    if (!r || !free(i, slot)) return;
    w.days[i][slot] = { r: r.id }; add(r, portions); count++;
  };
  // 1) Thermobox-Mittag als Meal-Prep-Block (1–2 Gerichte)
  if (s.slots.lunch) {
    const td = s.thermosDays.filter(i => free(i, 'lunch')).sort();
    if (td.length) {
      const box = (r: Recipe) => r.storage.thermos && r.meals[0] === 'lunch';
      const split = td.length > 3, half = split ? Math.ceil(td.length / 2) : td.length;
      const a = best('lunch', box, half * portionsBase());
      td.slice(0, half).forEach(i => put(i, 'lunch', a));
      if (split) { const b = best('lunch', box, (td.length - half) * portionsBase()) || a; td.slice(half).forEach(i => put(i, 'lunch', b)); }
    }
  }
  // 2) Abendessen: unter der Woche und am Sonntag (Meal-Prep-Tag) höchstens 45 Min.
  if (s.slots.dinner) for (let i = 0; i < 7; i++) if (free(i, 'dinner')) {
    const limit = i === 5 ? 120 : 45;
    put(i, 'dinner', best('dinner', r => r.meals[0] === 'dinner' && r.time.total <= limit) || best('dinner', r => r.meals[0] === 'dinner'));
  }
  // 3) Frühstück: werktags schnell (mit Vorrat)
  if (s.slots.breakfast) for (let i = 0; i < 7; i++) if (free(i, 'breakfast')) {
    put(i, 'breakfast', best('breakfast', r => i >= 5 || quickTime(r) <= 25) || best('breakfast', () => true));
  }
  // 4) Mittag an freien Tagen: frisch, höchstens 60 Min.
  if (s.slots.lunch) for (let i = 0; i < 7; i++) if (!s.thermosDays.includes(i) && free(i, 'lunch')) {
    put(i, 'lunch', best('lunch', r => r.time.total <= 60 && !(r.meals[0] === 'lunch' && r.storage.thermos)) || best('lunch', r => r.time.total <= 60));
  }
  // 5) Snacks: zwei gut vorzubereitende im Wechsel
  if (s.slots.snack) {
    const a = best('snack', r => r.storage.fridgeDays >= 3 || r.tags.includes('mealprep'));
    if (a) chosen.push(a);
    const b = best('snack', () => true) || a;
    if (a) chosen.pop();
    for (let i = 0; i < 7; i++) if (free(i, 'snack')) put(i, 'snack', i % 2 ? b : a);
  }
  return count;
}
