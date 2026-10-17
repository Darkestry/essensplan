// Daten, Zustand und alle Berechnungen (Plan, Einkauf, Meal-Prep-Ablauf).
import { mondayOf, addDays, parseIso, dayIndex, todayIso, DAYS, DAYS_SHORT, roundQty, norm } from './util.js';

export let F = {};            // Zutaten
export let R = [];            // Rezepte
export const byId = new Map();
export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
export const SLOT_LABEL = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abendessen', snack: 'Snack' };
export const ALLERGENS = {
  gluten: 'Gluten', milch: 'Milch', schalenfruechte: 'Schalenfrüchte (Nüsse)', erdnuss: 'Erdnuss', sesam: 'Sesam', soja: 'Soja',
  fisch: 'Fisch', krebstiere: 'Krebstiere', sellerie: 'Sellerie', senf: 'Senf', sulfite: 'Sulfite', lupine: 'Lupine', weichtiere: 'Weichtiere', ei: 'Ei',
};
export const DIET_LABEL = { meat: 'mit Fleisch', fish: 'mit Fisch', veg: 'vegetarisch', vegan: 'vegan' };
export const GROUP_ORDER = ['Obst & Gemüse', 'Kühlregal', 'Fleisch & Fisch', 'Tiefkühlfach', 'Trockenwaren', 'Dosen & Gläser', 'Nüsse & Kerne', 'Vorrat & Gewürze'];
const COMPONENT = {
  'cooked-potato': { food: 'potato', label: 'Pellkartoffeln vorkochen', days: 3, how: 'In der Schale 20–25 Min. knapp gar kochen, ausdampfen lassen, flach ausgebreitet rasch abkühlen, abgedeckt kühlen.' },
  'cooked-rice': { food: 'rice', label: 'Reis vorkochen', days: 1, how: 'Nach Packung garen, sofort flach auf einem Teller verteilen, innerhalb von 1 Stunde in den Kühlschrank. Gekühlt spätestens am nächsten Tag essen.' },
  'cooked-sweetpotato': { food: 'sweetpotato', label: 'Süßkartoffeln vorgaren', days: 3, how: 'Würfeln, 10–12 Min. in Salzwasser garen oder 25 Min. bei 200 °C rösten, rasch abkühlen.' },
  'cooked-lentils': { food: 'lentils', label: 'Linsen vorkochen', days: 3, how: 'In ungesalzenem Wasser bissfest garen, abgießen, abkühlen, erst beim Verwenden salzen.' },
  'cooked-quinoa': { food: 'quinoa', label: 'Quinoa vorkochen', days: 3, how: 'Gründlich abspülen, 1 : 2 mit Wasser 15 Min. garen, 5 Min. ziehen lassen, auflockern, rasch abkühlen.' },
  'roasted-veg': { food: null, label: 'Ofengemüse vorrösten', days: 3, how: 'Auf zwei Blechen bei 220 °C Ober-/Unterhitze (200 °C Umluft) rösten, damit es röstet statt dämpft; abkühlen, kühlen.' },
};
const STORAGE_KEY = 'morgenwerk-v2';
const LEGACY_KEY = 'morgenwerk-fruehstueck-v1';

export const state = {
  version: 2,
  settings: { goalKcal: 3000, goalProtein: 140, pantry: ['salt', 'blackpepper'], milk: 'cow', persons: 1, appetite: 1, slots: { breakfast: true, lunch: true, dinner: true, snack: true }, thermosDays: [0, 1, 2, 3, 4], diet: 'all', exclude: [], theme: 'auto', shopDay: -2 },
  weeks: {},
  favorites: [],
  blocked: [],    // „nicht mehr vorschlagen“
  weights: [],    // [{ d: 'YYYY-MM-DD', kg }]
  custom: [],     // eigene Rezepte
};
export let storageOK = true;

export async function loadData() {
  const res = await fetch('data/app-data.json');
  if (!res.ok) throw new Error('Rezeptdaten nicht gefunden');
  const d = await res.json();
  F = d.foods; BASE = d.recipes;
  R = [...BASE];
  byId.clear(); R.forEach(r => { r._cow = { subtitle: r.subtitle, ingredients: r.ingredients, steps: r.steps, tips: r.tips, nutrition: r.nutrition }; byId.set(r.id, r); });
}
let BASE = [];

// ---------- Eigene Rezepte ----------
// Rechnet Nährwerte, Allergene und Ernährungsform wie tools/build.js.
export function enrich(r) {
  const n = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, g = { ...n };
  const allergens = new Set(), types = new Set();
  for (const i of r.ingredients) {
    const f = F[i.k], fg = F[f.goat || i.k];
    for (const key in n) { n[key] += (f[key] || 0) * i.q / 100; g[key] += (fg[key] || 0) * i.q / 100; }
    (f.allergens || []).forEach(a => allergens.add(a)); types.add(f.type);
  }
  const round = o => { for (const key in o) o[key] = key === 'kcal' ? Math.round(o[key]) : Math.round(o[key] * 10) / 10; return o; };
  const diet = types.has('meat') ? 'meat' : types.has('fish') ? 'fish' : (types.has('dairy') || types.has('animal')) ? 'veg' : 'vegan';
  return { ...r, nutrition: round(n), nutritionGoat: round(g), allergens: [...allergens].sort(), diet };
}
const MEAL_ART = { breakfast: { dish: 'plate', type: 'slices' }, lunch: { dish: 'jar', type: 'stew' }, dinner: { dish: 'plate', type: 'roastveg' }, snack: { dish: 'bowl', type: 'bites' } };
export function sanitizeCustom(list) {
  const out = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (!c || typeof c.id !== 'string' || !/^u\d{1,4}$/.test(c.id) || typeof c.title !== 'string' || !c.title.trim()) continue;
    const ingredients = (c.ingredients || []).filter(i => F[i.k] && Number.isFinite(i.q) && i.q > 0).map(i => ({ k: i.k, q: i.q, ...(i.note ? { note: String(i.note).slice(0, 80) } : {}) }));
    if (!ingredients.length) continue;
    const meals = (c.meals || []).filter(m => SLOTS.includes(m));
    const main = meals[0] || 'dinner';
    const num = (v, d, max) => Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(Number(v), max) : d;
    const tools = (c.tools || []).map(String).filter(Boolean).slice(0, 10);
    out.push({
      id: c.id, custom: true, ...(typeof c.basedOn === 'string' ? { basedOn: c.basedOn } : {}),
      meals: meals.length ? meals : ['dinner'], title: c.title.trim().slice(0, 80), subtitle: String(c.subtitle || '').slice(0, 140), origin: 'Eigenes Rezept',
      time: { active: num(c.time?.active, 15, 600), total: num(c.time?.total, 30, 900), quick: c.time?.quick ? num(c.time.quick, null, 900) : null },
      difficulty: [1, 2, 3].includes(c.difficulty) ? c.difficulty : 1,
      tags: (c.tags || []).filter(t => typeof t === 'string').slice(0, 8),
      storage: { fridgeDays: num(c.storage?.fridgeDays, 0, 7), freeze: !!c.storage?.freeze, thermos: !!c.storage?.thermos, note: String(c.storage?.note || '').slice(0, 200) },
      components: [], tools: tools.length ? tools : ['Edelstahlpfanne oder -topf'],
      ingredients,
      steps: (c.steps || []).filter(st => st && st.text).map(st => ({ title: String(st.title || '').slice(0, 80) || 'Schritt', text: String(st.text).slice(0, 1200), action: typeof st.action === 'string' ? st.action : 'mix', items: (st.items || []).filter(k => F[k]), ...(Number.isInteger(st.timer) && st.timer >= 10 ? { timer: st.timer } : {}) })),
      tips: (c.tips || []).map(String).filter(Boolean).slice(0, 6),
      art: c.art && c.art.base ? c.art : { dish: MEAL_ART[main].dish, base: { type: MEAL_ART[main].type, color: '#c9a46a' } },
    });
  }
  return out;
}
// Eigene Rezepte in die Rezeptliste einhängen (nach dem Laden und nach jeder Änderung).
export function registerCustom() {
  R = [...BASE, ...state.custom.map(c => { const r = enrich(c); r._cow = { subtitle: r.subtitle, ingredients: r.ingredients, steps: r.steps, tips: r.tips, nutrition: r.nutrition }; return r; })];
  byId.clear(); R.forEach(r => byId.set(r.id, r));
  applyMilk();
}
export function saveCustom(recipe) {
  const [clean] = sanitizeCustom([recipe]);
  if (!clean) throw new Error('Rezept unvollständig');
  const i = state.custom.findIndex(c => c.id === clean.id);
  if (i >= 0) state.custom[i] = clean; else state.custom.push(clean);
  registerCustom(); save();
  return clean.id;
}
export function deleteCustom(id) {
  state.custom = state.custom.filter(c => c.id !== id);
  for (const w of Object.values(state.weeks)) for (const d of w.days) for (const sl of SLOTS) if (d[sl]?.r === id) d[sl] = null;
  state.favorites = state.favorites.filter(x => x !== id);
  registerCustom(); save();
}
export function nextCustomId() { let n = 1; while (state.custom.some(c => c.id === 'u' + n)) n++; return 'u' + n; }

// ---------- Milchart: Kuh oder Ziege/Schaf ----------
const B = '(?<![A-Za-zÄÖÜäöüß-])', E = '(?![a-zäöüß])';
const GOAT_TEXT = [
  [new RegExp(B + 'Frischkäse' + E, 'g'), 'Ziegenfrischkäse'],
  [/Crème fraîche/g, 'Ziegenfrischkäse'],
  [new RegExp(B + 'Schmand' + E, 'g'), 'Ziegenfrischkäse'],
  [new RegExp('(?<!wie )' + B + '(Schlag)?[Ss]ahne' + E, 'g'), 'Ziegenfrischkäse'], // „fließt wie Sahne“ bleibt
  [new RegExp(B + '(Mager)?[Qq]uark' + E, 'g'), 'Ziegenquark'],
  [new RegExp(B + '(griechische[nmrs]? )?Joghurt' + E, 'g'), 'Ziegenjoghurt'],
  [new RegExp(B + '(Voll)?[Mm]ilch' + E, 'g'), 'Ziegenmilch'],
  [new RegExp(B + 'Butter' + E, 'g'), 'Ziegenbutter'],
  [new RegExp(B + '(Bergkäse|Emmentaler|Parmesan|Grana Padano)' + E, 'g'), 'Ziegen-Hartkäse'],
  [new RegExp(B + 'Mozzarella' + E, 'g'), 'Ziegenkäse'],
  [new RegExp(B + 'Hirtenkäse' + E, 'g'), 'Feta'],
];
export const goatText = s => GOAT_TEXT.reduce((t, [re, to]) => t.replace(re, to), s);
export const goatKey = k => (state.settings.milk === 'goat' && F[k]?.goat) || k;
// Tauscht Zutaten, Schritte, Tipps und Nährwerte aller Rezepte auf die gewählte Milchart.
export function applyMilk() {
  const goat = state.settings.milk === 'goat';
  for (const r of R) {
    const c = r._cow;
    const swaps = c.ingredients.filter(i => F[i.k].goat);
    if (!goat || !swaps.length) { Object.assign(r, { subtitle: c.subtitle, ingredients: c.ingredients, steps: c.steps, tips: c.tips, nutrition: c.nutrition, swaps: [] }); continue; }
    r.subtitle = goatText(c.subtitle);
    r.ingredients = c.ingredients.map(i => F[i.k].goat ? { ...i, k: F[i.k].goat, note: i.note ? goatText(i.note) : i.note } : i);
    r.steps = c.steps.map(s => ({ ...s, title: goatText(s.title), text: goatText(s.text), items: (s.items || []).map(k => F[k]?.goat || k) }));
    r.tips = (c.tips || []).map(goatText).filter(t => !/(\S+) statt \1\b/.test(t)); // Kuhmilch-Vergleichstipps ergeben keinen Sinn mehr
    r.nutrition = r.nutritionGoat || c.nutrition;
    r.swaps = [...new Set(swaps.map(i => i.k))].map(k => ({ from: k, to: F[k].goat }));
  }
}

// ---------- Persistenz ----------
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state, sanitize(JSON.parse(raw)));
    else {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old) Object.assign(state, sanitize(migrateV1(JSON.parse(old))));
    }
  } catch { storageOK = false; }
  try { navigator.storage?.persist?.(); } catch { /* optional */ }
}
let saveTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
  }, 120);
}
function validEntry(e) {
  if (!e || typeof e !== 'object') return null;
  if (typeof e.t === 'string') return { t: e.t.slice(0, 60) };
  if (typeof e.r === 'string' && byId.has(e.r)) return e.lo ? { r: e.r, lo: 1 } : { r: e.r };
  return null;
}
export function sanitize(s) {
  const out = { settings: { ...state.settings }, weeks: {}, favorites: [], blocked: [], weights: [], custom: [] };
  const st = s.settings || {};
  // Eigene Rezepte zuerst registrieren, damit Plan-Einträge darauf gültig bleiben.
  out.custom = sanitizeCustom(s.custom);
  state.custom = out.custom; registerCustom();
  if (Number.isFinite(st.goalKcal) && st.goalKcal >= 1200 && st.goalKcal <= 6000) out.settings.goalKcal = Math.round(st.goalKcal);
  if (Number.isFinite(st.goalProtein) && st.goalProtein >= 30 && st.goalProtein <= 400) out.settings.goalProtein = Math.round(st.goalProtein);
  if (Array.isArray(st.pantry)) out.settings.pantry = st.pantry.filter(k => F[k]);
  if ([1, 2, 3, 4, 5, 6].includes(st.persons)) out.settings.persons = st.persons;
  if ([0.8, 1, 1.25, 1.5].includes(st.appetite)) out.settings.appetite = st.appetite;
  if (st.slots && typeof st.slots === 'object') for (const k of SLOTS) if (typeof st.slots[k] === 'boolean') out.settings.slots[k] = st.slots[k];
  if (Array.isArray(st.thermosDays)) out.settings.thermosDays = st.thermosDays.filter(d => Number.isInteger(d) && d >= 0 && d < 7);
  if (['all', 'pesc', 'veg', 'vegan'].includes(st.diet)) out.settings.diet = st.diet;
  if (Array.isArray(st.exclude)) out.settings.exclude = st.exclude.filter(a => ALLERGENS[a]);
  if (['cow', 'goat'].includes(st.milk)) out.settings.milk = st.milk;
  if (['auto', 'light', 'dark'].includes(st.theme)) out.settings.theme = st.theme;
  if ([-3, -2, -1].includes(st.shopDay)) out.settings.shopDay = st.shopDay;
  for (const [k, w] of Object.entries(s.weeks || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !w || !Array.isArray(w.days)) continue;
    out.weeks[k] = {
      days: Array.from({ length: 7 }, (_, i) => Object.fromEntries(SLOTS.map(sl => [sl, validEntry(w.days[i]?.[sl])]))),
      have: Object.fromEntries(Object.entries(w.have || {}).filter(([f, q]) => F[f] && Number.isFinite(q))),
      done: Object.fromEntries(Object.entries(w.done || {}).filter(([, v]) => v === true)),
      boost: Object.fromEntries(Object.entries(w.boost || {}).filter(([d, l]) => /^[0-6]$/.test(d) && Array.isArray(l)).map(([d, l]) => [d, l.filter(b => BOOSTERS.some(x => x.id === b))])),
    };
  }
  out.favorites = Array.isArray(s.favorites) ? s.favorites.filter(id => byId.has(id)) : [];
  out.blocked = Array.isArray(s.blocked) ? s.blocked.filter(id => byId.has(id)) : [];
  out.weights = Array.isArray(s.weights) ? s.weights.filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(w.d) && Number.isFinite(w.kg) && w.kg > 20 && w.kg < 300).sort((a, b) => a.d.localeCompare(b.d)) : [];
  return out;
}
// Altes Frühstücks-Format (v1, eine Woche mit Nummern 1–20)
export function migrateV1(o) {
  const monday = /^\d{4}-\d{2}-\d{2}$/.test(o.weekStart || '') ? mondayOf(parseIso(o.weekStart)) : mondayOf();
  const id = n => 'b' + String(n).padStart(2, '0');
  const days = Array.from({ length: 7 }, (_, i) => ({ breakfast: o.week?.[i] ? { r: id(o.week[i]) } : null, lunch: null, dinner: null, snack: null }));
  return {
    settings: { ...state.settings, persons: [1, 2, 3, 4].includes(Number(o.portions)) ? Number(o.portions) : 1, slots: { breakfast: true, lunch: false, dinner: false, snack: false } },
    weeks: { [monday]: { days, have: {}, done: {} } },
    favorites: (o.favorites || []).map(id),
  };
}
export function importJSON(obj) {
  const s = obj && obj.version === 1 && Array.isArray(obj.week) ? migrateV1(obj) : obj;
  if (!s || typeof s !== 'object' || !s.weeks) throw new Error('Unbekanntes Format');
  Object.assign(state, sanitize(s));
  save();
}

// ---------- Plan ----------
export function week(monday, create = false) {
  if (!state.weeks[monday] && create) state.weeks[monday] = { days: Array.from({ length: 7 }, () => ({ breakfast: null, lunch: null, dinner: null, snack: null })), have: {}, done: {}, boost: {} };
  return state.weeks[monday];
}
export function getEntry(date, slot) { return state.weeks[mondayOf(parseIso(date))]?.days[dayIndex(date)]?.[slot] || null; }
export function setEntry(date, slot, entry) {
  const w = week(mondayOf(parseIso(date)), true);
  const prev = w.days[dayIndex(date)][slot];
  w.days[dayIndex(date)][slot] = entry;
  // Wird ein Abendessen geändert, verliert der daran hängende Reste-Mittag am Folgetag seine Quelle.
  if (slot === 'dinner' && prev?.r && prev.r !== entry?.r) {
    const next = addDays(date, 1), lo = getEntry(next, 'lunch');
    if (lo?.lo) setEntry(next, 'lunch', null);
  }
  save();
}
export const recipeOf = e => (e && e.r ? byId.get(e.r) : null);
export const portionsBase = () => state.settings.persons * state.settings.appetite;
export function hasLeftoverFrom(date) { const lo = getEntry(addDays(date, 1), 'lunch'); const d = getEntry(date, 'dinner'); return !!(lo?.lo && d?.r === lo.r); }
// Wie viele Portionen werden für diesen Eintrag tatsächlich gekocht?
export function cookPortions(date, slot) {
  const e = getEntry(date, slot);
  if (!e?.r || e.lo) return 0;
  return portionsBase() * (slot === 'dinner' && hasLeftoverFrom(date) ? 2 : 1);
}
export function weekDates(monday) { return Array.from({ length: 7 }, (_, i) => addDays(monday, i)); }
export function entriesOf(monday) {
  const out = [];
  for (const date of weekDates(monday)) for (const slot of SLOTS) {
    const e = getEntry(date, slot); if (!e) continue;
    out.push({ date, slot, entry: e, recipe: recipeOf(e) });
  }
  return out;
}
export function dayTotals(date) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, n: 0 };
  for (const slot of SLOTS) {
    const r = recipeOf(getEntry(date, slot)); if (!r) continue;
    for (const k in r.nutrition) t[k] += r.nutrition[k] * state.settings.appetite;
    t.n++;
  }
  t.boost = 0;
  for (const b of boostsOn(date)) { const n = boosterNutrition(b); for (const k in n) t[k] += n[k]; t.boost += n.kcal; }
  return t;
}

// ---------- Booster: kleine Extras, um das Tagesziel zu erreichen ----------
export const BOOSTERS = [
  { id: 'oil', label: '1 EL Olivenöl übers Essen', items: [['olive', 12]] },
  { id: 'nuts', label: 'Handvoll Walnüsse (30 g)', items: [['walnuts', 30]] },
  { id: 'almonds', label: 'Handvoll Mandeln (30 g)', items: [['almonds', 30]] },
  { id: 'pb', label: '2 EL Erdnussmus (30 g)', items: [['peanutbutter', 30]] },
  { id: 'milk', label: 'Großes Glas Milch (300 ml)', items: [['milk', 300]] },
  { id: 'yogurt', label: 'Joghurt mit Honig', items: [['yogurt', 200], ['honey', 15]] },
  { id: 'dates', label: '4 Datteln mit Mandeln', items: [['dates', 40], ['almonds', 15]] },
  { id: 'banana', label: 'Banane mit Erdnussmus', items: [['banana', 120], ['peanutbutter', 20]] },
  { id: 'cheese', label: 'Stück Käse (40 g)', items: [['cheese', 40]] },
  { id: 'tahini', label: '1 EL Tahin übers Essen', items: [['tahini', 15]] },
];
export function boosterItems(b) { return (BOOSTERS.find(x => x.id === b)?.items || []).filter(([k]) => F[k]).map(([k, q]) => [goatKey(k), q]); }
export function boosterNutrition(b) {
  const n = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const [k, q] of boosterItems(b)) for (const key in n) n[key] += (F[k][key] || 0) * q / 100;
  return n;
}
export function boosterLabel(b) { const l = BOOSTERS.find(x => x.id === b)?.label || ''; return state.settings.milk === 'goat' ? goatText(l.replace('Stück Käse', 'Stück Ziegenkäse')) : l; }
export function boostsOn(date) { return state.weeks[mondayOf(parseIso(date))]?.boost?.[dayIndex(date)] || []; }
export function toggleBoost(date, id) {
  const w = week(mondayOf(parseIso(date)), true);
  w.boost ||= {};
  const d = dayIndex(date), list = w.boost[d] || [];
  w.boost[d] = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  save();
}
const boosterOk = b => boosterItems(b.id).every(([k]) => !state.settings.exclude.some(a => F[k].allergens.includes(a)) && !(state.settings.diet === 'vegan' && F[k].type !== 'plant'));
// Vorschläge, die die Lücke zum Ziel am besten schließen
export function boosterSuggestions(date) {
  const t = dayTotals(date), gap = state.settings.goalKcal - t.kcal, pGap = state.settings.goalProtein - t.protein;
  const active = boostsOn(date);
  return BOOSTERS.filter(b => !active.includes(b.id) && boosterOk(b))
    .map(b => ({ ...b, n: boosterNutrition(b.id) }))
    .sort((a, b) => (pGap > 15 ? b.n.protein - a.n.protein : 0) || Math.abs(gap - a.n.kcal) - Math.abs(gap - b.n.kcal));
}

// ---------- Gewicht ----------
export function setWeight(d, kg) {
  state.weights = state.weights.filter(w => w.d !== d);
  if (Number.isFinite(kg)) state.weights.push({ d, kg: Math.round(kg * 10) / 10 });
  state.weights.sort((a, b) => a.d.localeCompare(b.d));
  save();
}
// Trend als lineare Regression über die letzten 6 Wochen (kg pro Woche)
export function weightTrend() {
  const w = state.weights;
  if (w.length < 2) return null;
  const last = parseIso(w[w.length - 1].d);
  const pts = w.filter(x => (last - parseIso(x.d)) / 864e5 <= 42).map(x => [(parseIso(x.d) - last) / 864e5 / 7, x.kg]);
  if (pts.length < 2) return null;
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  if (!sxx) return null;
  const slope = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx;
  return { perWeek: Math.round(slope * 100) / 100, weeks: -pts[0][0], n: pts.length };
}
export function filled(date) { return SLOTS.filter(s => state.settings.slots[s] && getEntry(date, s)).length; }
export const activeSlots = () => SLOTS.filter(s => state.settings.slots[s]);

// ---------- Filter ----------
export function allowed(r) {
  const s = state.settings;
  if (s.diet === 'vegan' && r.diet !== 'vegan') return false;
  if (s.diet === 'veg' && !['veg', 'vegan'].includes(r.diet)) return false;
  if (s.diet === 'pesc' && r.diet === 'meat') return false;
  if (s.exclude.some(a => r.allergens.includes(a))) return false;
  return true;
}
export function quickTime(r) { return r.time.quick ?? r.time.total; }
export const isBlocked = id => state.blocked.includes(id);
export function toggleBlocked(id) { state.blocked = isBlocked(id) ? state.blocked.filter(x => x !== id) : [...state.blocked, id]; save(); }

// ---------- Auto-Plan ----------
// Punktebasiert: Zeitbudget, Abwechslung (ähnliche Titel), Favoriten, gesperrte Rezepte,
// angebrochene Packungen weiterverwenden und – beim Zunehmen – energiereichere Gerichte bevorzugen.
const STOP = new Set(['mit', 'und', 'oder', 'vom', 'aus', 'auf', 'ohne', 'dazu', 'frisch', 'knusprige', 'knusprigen', 'warme', 'warmer', 'schnelle', 'schneller', 'herzhafte', 'herzhafter', 'cremige', 'cremiger']);
const titleWords = r => new Set(norm(r.title).split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w)));
export function autofill(monday, { overwrite = false } = {}) {
  const w = week(monday, true);
  const s = state.settings;
  const prev = state.weeks[addDays(monday, -7)];
  const usedBefore = new Set(prev ? prev.days.flatMap(d => SLOTS.map(sl => d[sl]?.r)).filter(Boolean) : []);
  const free = (i, slot) => overwrite || !w.days[i][slot];
  if (overwrite) for (const d of w.days) for (const sl of SLOTS) d[sl] = null;
  const chosen = [];       // bereits in der Woche
  const need = {};         // Bedarf an Packungsware → Reste
  const add = (r, portions) => {
    chosen.push(r);
    for (const i of r.ingredients) if (F[i.k].pack && !F[i.k].staple) need[i.k] = (need[i.k] || 0) + i.q * portions;
  };
  for (const d of w.days) for (const sl of SLOTS) { const r = recipeOf(d[sl]); if (r && !d[sl].lo) add(r, portionsBase()); }
  const rest = k => { const f = F[k]; if (!need[k]) return 0; return Math.ceil(need[k] / f.pack - 1e-6) * f.pack - need[k]; };
  const gain = s.goalKcal >= 2600;
  const score = (r, slot, portions) => {
    let sc = Math.random() * 2;
    if (state.favorites.includes(r.id)) sc += 3;
    if (usedBefore.has(r.id)) sc -= 2;
    const tw = titleWords(r);
    for (const c of chosen) { let o = 0; for (const x of titleWords(c)) if (tw.has(x)) o++; sc -= o * 2.5; }
    for (const i of r.ingredients) { const f = F[i.k]; if (!f.pack || f.staple) continue; const rs = rest(i.k); if (rs > 0) sc += Math.min(1, Math.min(i.q * portions, rs) / f.pack) * 4; }
    if (gain) sc += (r.nutrition.kcal - 700) / 250;
    return sc;
  };
  const best = (slot, filter, portions = portionsBase()) => {
    const ids = new Set(chosen.map(c => c.id));
    const cands = R.filter(r => r.meals.includes(slot) && allowed(r) && !isBlocked(r.id) && !ids.has(r.id) && filter(r));
    if (!cands.length) return null;
    return cands.map(r => [score(r, slot, portions), r]).sort((a, b) => b[0] - a[0])[0][1];
  };
  let count = 0;
  const put = (i, slot, r, portions = portionsBase()) => { if (!r || !free(i, slot)) return; w.days[i][slot] = { r: r.id }; add(r, portions); count++; };

  // 1) Thermobox-Mittag als Meal-Prep-Block (1–2 Gerichte)
  if (s.slots.lunch) {
    const td = s.thermosDays.filter(i => free(i, 'lunch')).sort();
    if (td.length) {
      const a = best('lunch', r => r.storage.thermos && r.meals[0] === 'lunch', td.length * portionsBase());
      const split = td.length > 3;
      const half = split ? Math.ceil(td.length / 2) : td.length;
      td.slice(0, half).forEach(i => put(i, 'lunch', a));
      if (split) { const b = best('lunch', r => r.storage.thermos && r.meals[0] === 'lunch', (td.length - half) * portionsBase()) || a; td.slice(half).forEach(i => put(i, 'lunch', b)); }
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
  save();
  return count;
}

// Hält geöffnet lange – kein Reste-Hinweis nötig
const LONG_KEEP = new Set(['butter', 'goatbutter', 'cheese', 'goatcheese', 'parmesan', 'carrot', 'potato', 'floury', 'paste']);
// Reste aus Packungen nach dieser Woche + Rezepte, die sie verwerten
export function packRests(monday) {
  const used = new Set(entriesOf(monday).map(x => x.recipe?.id).filter(Boolean));
  return shopping(monday).filter(i => F[i.k].pack && !F[i.k].staple).map(i => {
    const f = F[i.k], n = Math.ceil(i.q / f.pack - 1e-6), rest = n * f.pack - i.q;
    return { k: i.k, rest: roundQty(rest) };
  }).filter(x => x.rest >= F[x.k].pack * 0.25 && !LONG_KEEP.has(x.k) && ['Kühlregal', 'Dosen & Gläser', 'Obst & Gemüse', 'Fleisch & Fisch'].includes(F[x.k].group))
    .map(x => ({ ...x, recipes: R.filter(r => !used.has(r.id) && allowed(r) && !isBlocked(r.id) && r.ingredients.some(i => i.k === x.k)).sort((a, b) => Math.abs(a.ingredients.find(i => i.k === x.k).q * portionsBase() - x.rest) - Math.abs(b.ingredients.find(i => i.k === x.k).q * portionsBase() - x.rest)).slice(0, 3) }));
}
export function copyWeek(from, to) {
  const src = state.weeks[from]; if (!src) return false;
  state.weeks[to] = { days: src.days.map(d => ({ ...d })), have: {}, done: {} };
  save(); return true;
}
export function clearWeek(monday) { delete state.weeks[monday]; save(); }

// ---------- Einkauf ----------
export function shopping(monday) {
  const items = {};
  for (const { date, slot, recipe } of entriesOf(monday)) {
    if (!recipe) continue;
    const portions = cookPortions(date, slot);
    if (!portions) continue;
    for (const i of recipe.ingredients) {
      if (i.k === 'water') continue;
      const it = items[i.k] ||= { k: i.k, q: 0, recipes: new Set(), days: new Set() };
      it.q += i.q * portions;
      it.recipes.add(recipe.id);
      it.days.add(dayIndex(date));
    }
  }
  // Booster (pro Person) gehören mit in den Korb
  for (const date of weekDates(monday)) for (const b of boostsOn(date)) for (const [k, q] of boosterItems(b)) {
    const it = items[k] ||= { k, q: 0, recipes: new Set(), days: new Set() };
    it.q += q * state.settings.persons;
    it.recipes.add('extra');
    it.days.add(dayIndex(date));
  }
  return Object.values(items).map(i => ({ ...i, q: roundQty(i.q), pantry: state.settings.pantry.includes(i.k) }));
}
export const inPantry = k => state.settings.pantry.includes(k);
export function togglePantry(k) { const p = state.settings.pantry; state.settings.pantry = p.includes(k) ? p.filter(x => x !== k) : [...p, k]; save(); }
export function packHint(k, q) {
  const f = F[k];
  if (!f.pack || q <= 0) return '';
  const n = Math.ceil((q - 0.001) / f.pack);
  const unitWord = f.group === 'Dosen & Gläser' ? (n === 1 ? 'Dose/Glas' : 'Dosen/Gläser') : (n === 1 ? 'Packung' : 'Packungen');
  const rest = n * f.pack - q;
  return `${n} ${unitWord} à ${f.pack} ${f.unit}${rest >= f.pack * 0.25 ? ` · Rest ${roundQty(rest)} ${f.unit}` : ''}`;
}
export function shoppingText(monday) {
  const list = shopping(monday), w = week(monday) || { have: {} };
  const lines = [`Einkauf ${weekLabelShort(monday)}`];
  for (const g of GROUP_ORDER) {
    const items = list.filter(i => F[i.k].group === g && !F[i.k].staple && !i.pantry && !((w.have[i.k] || 0) >= i.q - 0.01));
    if (!items.length) continue;
    lines.push('', g.toUpperCase());
    for (const i of items) { const missing = i.q - (w.have[i.k] || 0); lines.push(`☐ ${fmtQty(i.k, missing)} ${F[i.k].name}`); }
  }
  const staples = list.filter(i => F[i.k].staple && !i.pantry && !w.have[i.k]);
  if (staples.length) lines.push('', 'VORRAT PRÜFEN', staples.map(i => F[i.k].name).join(', '));
  return lines.join('\n');
}
function weekLabelShort(monday) { return `${parseIso(monday).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}–${parseIso(addDays(monday, 6)).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}`; }
export function fmtQty(k, q) {
  const f = F[k];
  if (f.unit === 'g' && q >= 1000) return `${(roundQty(q) / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg`;
  if (f.unit === 'ml' && q >= 1000) return `${(roundQty(q) / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} l`;
  return `${roundQty(q).toLocaleString('de-DE')} ${f.unit}`;
}
export function openItems(monday) {
  const w = week(monday); if (!w) return 0;
  return shopping(monday).filter(i => !F[i.k].staple && !i.pantry && !((w.have[i.k] || 0) >= i.q - 0.01)).length;
}

// ---------- Meal-Prep-Ablauf ----------
// Liefert Aufgaben mit Datum (kann vor dem Montag liegen) und Tageszeit.
const SHELF = { fish: 1, mince: 1, meat: 2 };
export function prepTasks(monday) {
  const tasks = [];
  const s = state.settings;
  const shopDate = addDays(monday, s.shopDay);
  const diff = (a, b) => Math.round((parseIso(a) - parseIso(b)) / 864e5);
  const names = dates => dates.map(d => DAYS_SHORT[dayIndex(d)]).join(', ');
  const entries = entriesOf(monday).filter(x => x.recipe && !x.entry.lo);

  // 1) Box-Mittag als Meal-Prep-Block
  const lunchGroups = {};
  for (const x of entries) if (x.slot === 'lunch' && x.recipe.meals[0] === 'lunch') (lunchGroups[x.recipe.id] ||= []).push(x.date);
  for (const [rid, dates] of Object.entries(lunchGroups)) {
    const r = byId.get(rid); dates.sort();
    // Blöcke: neu kochen, wenn die Haltbarkeit (auch mit Einfrieren) nicht reicht – sonst einfrieren.
    let block = [];
    const flush = () => {
      if (!block.length) return;
      const cook = addDays(block[0], -1);
      const keep = Math.max(1, r.storage.fridgeDays);
      const frozen = block.filter(d => diff(d, cook) > keep);
      tasks.push({ id: `batch-${rid}-${cook}`, date: cook, when: 'abends', kind: 'batch', recipe: rid,
        title: `${r.title} vorkochen – ${block.length * portionsBase()} ${block.length * portionsBase() === 1 ? 'Portion' : 'Portionen'}`,
        detail: `Für ${names(block)}. Rasch abkühlen (flache Dosen, innerhalb von 2 Stunden in den Kühlschrank).${frozen.length ? ` Portion${frozen.length > 1 ? 'en' : ''} für ${names(frozen)} direkt einfrieren.` : ''}` });
      for (const d of frozen) tasks.push({ id: `thaw-${rid}-${d}`, date: addDays(d, -1), when: 'abends', kind: 'thaw', recipe: rid, title: `${r.title}: Portion für morgen auftauen`, detail: 'Aus dem Gefrierfach in den Kühlschrank stellen. Morgens sprudelnd aufkochen.' });
      block = [];
    };
    for (const d of dates) {
      if (block.length && (diff(d, addDays(block[0], -1)) > (r.storage.freeze ? 6 : Math.max(1, r.storage.fridgeDays)))) flush();
      block.push(d);
    }
    flush();
  }

  // 2) Thermobox-Morgen
  for (const date of weekDates(monday)) {
    const e = getEntry(date, 'lunch'); const r = recipeOf(e);
    if (!r || !s.thermosDays.includes(dayIndex(date))) continue;
    if (!r.storage.thermos) continue;
    tasks.push({ id: `jar-${date}`, date, when: 'morgens', kind: 'jar', recipe: r.id, title: `Thermobox: ${r.title}`,
      detail: 'Box 5–10 Min. mit kochendem Wasser vorheizen. Portion im Topf mit einem Schluck Wasser sprudelnd aufkochen, Wasser aus der Box gießen, randvoll füllen, sofort schließen. Toppings separat.' });
  }

  // 3) Reste: Abendessen doppelt
  for (const x of entries) if (x.slot === 'dinner' && hasLeftoverFrom(x.date)) {
    tasks.push({ id: `lo-${x.date}`, date: x.date, when: 'abends', kind: 'leftover', recipe: x.recipe.id, title: `${x.recipe.title} doppelt kochen`,
      detail: `${portionsBase()} ${portionsBase() === 1 ? 'Portion' : 'Portionen'} vor dem Essen abfüllen, abkühlen lassen und kühlen – für ${DAYS[dayIndex(addDays(x.date, 1))]} Mittag.` });
  }

  // 4) Bausteine (Kartoffeln, Reis …) aus Frühstück/Abendessen bündeln
  const comp = {};
  for (const x of entries) for (const c of x.recipe.components || []) {
    if (x.slot === 'lunch' && x.recipe.meals[0] === 'lunch') continue;
    (comp[c.key] ||= []).push({ date: x.date, q: c.q * cookPortions(x.date, x.slot), recipe: x.recipe, slot: x.slot });
  }
  for (const [key, uses] of Object.entries(comp)) {
    const def = COMPONENT[key]; if (!def) continue;
    uses.sort((a, b) => a.date.localeCompare(b.date));
    // Ein Baustein lohnt sich nur, wenn er bis zur Verwendung sicher hält.
    while (uses.length) {
      const cook = addDays(uses[0].date, -1);
      const group = uses.filter(u => diff(u.date, cook) <= def.days);
      uses.splice(0, group.length);
      // Nur vorkochen, wenn es morgens Zeit spart (Frühstück) oder mehrere Gerichte bündelt.
      if (!group.some(u => u.slot === 'breakfast') && group.length < 2) continue;
      const q = group.reduce((s, u) => s + u.q, 0);
      const qty = def.food ? fmtQty(def.food, q) : `${roundQty(q)} g Gemüse`;
      tasks.push({ id: `comp-${key}-${cook}`, date: cook, when: 'abends', kind: 'component', title: `${def.label}: ${qty}${def.food === 'rice' || def.food === 'lentils' || def.food === 'quinoa' ? ' (Trockengewicht)' : ''}`,
        detail: `Für ${[...new Set(group.map(u => `${u.recipe.title} (${DAYS_SHORT[dayIndex(u.date)]})`))].join(', ')}. ${def.how}` });
    }
  }

  // 5) Fleisch & Fisch: einfrieren nach dem Einkauf, am Vorabend auftauen (gebündelt pro Tag)
  const thaw = {}, freeze = [];
  const cookDateOf = x => (x.slot === 'lunch' && x.recipe.meals[0] === 'lunch') ? null : x.date; // Box-Gerichte: Fleisch wird beim Vorkochen verarbeitet
  const batchCook = {};
  for (const t of tasks) if (t.kind === 'batch') batchCook[t.recipe] = batchCook[t.recipe] ? (t.date < batchCook[t.recipe] ? t.date : batchCook[t.recipe]) : t.date;
  const seenMeat = new Set();
  for (const x of entries) {
    const date = cookDateOf(x) || batchCook[x.recipe.id];
    if (!date || seenMeat.has(x.recipe.id + date)) continue;
    seenMeat.add(x.recipe.id + date);
    for (const i of x.recipe.ingredients) {
      const f = F[i.k];
      if (f.type !== 'meat' && f.type !== 'fish') continue;
      const kind = f.type === 'fish' ? 'fish' : i.k === 'beefmince' ? 'mince' : 'meat';
      const name = f.name.split(',')[0].replace(/ \(.*\)$/, '');
      const tk = f.group === 'Tiefkühlfach';
      if (!tk && diff(date, shopDate) <= SHELF[kind]) continue;
      if (!tk) freeze.push(`${name} (${DAYS_SHORT[dayIndex(date)]})`);
      (thaw[addDays(date, -1)] ||= []).push(`${name} für ${x.recipe.title}`);
    }
  }
  if (freeze.length) tasks.push({ id: `freeze-${shopDate}`, date: shopDate, when: 'abends', kind: 'freeze', title: 'Nach dem Einkauf einfrieren', detail: `Hält frisch nicht bis zum Kochtag: ${[...new Set(freeze)].join(', ')}. Flach und portionsweise einfrieren, beschriften – oder gleich TK-Ware kaufen.` });
  for (const [d, list] of Object.entries(thaw)) tasks.push({ id: `thaw-${d}`, date: d, when: 'abends', kind: 'thaw', title: `Auftauen für morgen`, detail: `${[...new Set(list)].join('; ')}. Abgedeckt auf einem Teller über Nacht in den Kühlschrank (unteres Fach), Auftauwasser weggießen.` });
  const order = { morgens: 0, mittags: 1, abends: 2 };
  return tasks.sort((a, b) => a.date.localeCompare(b.date) || order[a.when] - order[b.when]);
}
// Aufgaben, die an einem Datum anstehen – inkl. der Vorbereitungen für die nächste Woche.
export function tasksOn(date) {
  const m = mondayOf(parseIso(date));
  const all = [...prepTasks(m), ...prepTasks(addDays(m, 7))];
  const seen = new Set();
  return all.filter(t => t.date === date && !seen.has(t.id) && seen.add(t.id));
}
export function taskDone(id, date) { const w = state.weeks[mondayOf(parseIso(date))]; return !!w?.done?.[id]; }
export function setTaskDone(id, date, v) {
  const w = week(mondayOf(parseIso(date)), true);
  if (v) w.done[id] = true; else delete w.done[id];
  save();
}
export function isToday(date) { return date === todayIso(); }
