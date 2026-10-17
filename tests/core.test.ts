// Tests der Kernlogik: node --experimental-strip-types --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { setCtx } from '../src/lib/core/context.ts';
import type { AppState, Foods, Recipe, RecipeSource } from '../src/lib/core/types.ts';
import { buildRecipes, goatText } from '../src/lib/core/recipes.ts';
import { defaultState, isV1, migrateV1, sanitize } from '../src/lib/core/state.ts';
import { autofill, cookPortions, dayTotals, entriesOf, getEntry, setEntry, toggleBoost } from '../src/lib/core/plan.ts';
import { openItems, packRests, shopping, shoppingText, toggleHave } from '../src/lib/core/shopping.ts';
import { prepTasks } from '../src/lib/core/prep.ts';
import { addDays } from '../src/lib/core/util.ts';

const DATA = new URL('../data/', import.meta.url);
const F: Foods = JSON.parse(readFileSync(new URL('foods.json', DATA), 'utf8'));
delete (F as Record<string, unknown>)._doc;
for (const f of readdirSync(DATA).filter(f => /^foods-new-.*\.json$/.test(f))) Object.assign(F, JSON.parse(readFileSync(new URL(f, DATA), 'utf8')));
const BASE: RecipeSource[] = readdirSync(DATA).filter(f => /^recipes-.*\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(new URL(f, DATA), 'utf8')));

function makeCtx(state: AppState) {
  let R: Recipe[] = [], byId = new Map<string, Recipe>();
  const rebuild = () => { R = buildRecipes(BASE, state.custom, F, state.settings.milk); byId = new Map(R.map(r => [r.id, r])); };
  rebuild();
  setCtx({ F, get R() { return R; }, get byId() { return byId; }, state });
  return rebuild;
}
const MONDAY = '2026-10-19';

test('alle Rezepte verwenden bekannte Zutaten und haben Nährwerte', () => {
  const R = buildRecipes(BASE, [], F, 'cow');
  assert.ok(R.length >= 60);
  for (const r of R) { assert.ok(r.nutrition.kcal > 100, r.id); for (const i of r.ingredients) assert.ok(F[i.k], `${r.id}: ${i.k}`); }
  const b = R.filter(r => r.meals[0] === 'breakfast').map(r => r.nutrition.kcal);
  assert.ok(Math.min(...b) >= 900, 'Frühstücke sollen zum Zunehmen ~1000 kcal haben');
});

test('Ziegenmilch tauscht Zutaten, Texte und Nährwerte', () => {
  const [cow] = buildRecipes(BASE.filter(r => r.id === 'b05'), [], F, 'cow');
  const [goat] = buildRecipes(BASE.filter(r => r.id === 'b05'), [], F, 'goat');
  assert.ok(cow.ingredients.some(i => i.k === 'quark'));
  assert.ok(goat.ingredients.some(i => i.k === 'goatquark') && !goat.ingredients.some(i => i.k === 'quark'));
  assert.notEqual(cow.nutrition.kcal, goat.nutrition.kcal);
  assert.equal(goat.source, cow.source, 'Kuhmilch-Fassung bleibt als Quelle erhalten');
  assert.equal(goatText('Der Teig soll wie Sahne fließen'), 'Der Teig soll wie Sahne fließen');
  assert.equal(goatText('Kokosmilch und Milch'), 'Kokosmilch und Ziegenmilch');
});

test('Wochenvorschlag füllt alle Plätze ohne gesperrte Rezepte', () => {
  const state = defaultState();
  state.blocked = ['d01', 'd02'];
  makeCtx(state);
  const n = autofill(MONDAY, { random: () => 0.5 });
  assert.equal(n, 28);
  const ids = entriesOf(MONDAY).map(x => 'r' in x.entry ? x.entry.r : '');
  assert.ok(!ids.includes('d01') && !ids.includes('d02'));
  // Thermobox-Tage bekommen Box-Gerichte
  for (let i = 0; i < 5; i++) assert.ok(entriesOf(MONDAY).find(x => x.slot === 'lunch' && x.date === addDays(MONDAY, i))?.recipe?.storage.thermos);
});

test('Reste-Mittag verdoppelt das Abendessen im Einkauf', () => {
  const state = defaultState();
  makeCtx(state);
  setEntry(MONDAY, 'dinner', { r: 'd04' });
  const before = shopping(MONDAY).find(i => i.k === 'beefmince')!.q;
  setEntry(addDays(MONDAY, 1), 'lunch', { r: 'd04', lo: 1 });
  assert.equal(cookPortions(MONDAY, 'dinner'), 2);
  assert.equal(shopping(MONDAY).find(i => i.k === 'beefmince')!.q, before * 2);
  // Abendessen tauschen entfernt den Reste-Mittag
  setEntry(MONDAY, 'dinner', { r: 'd06' });
  assert.equal(getEntry(addDays(MONDAY, 1), 'lunch'), null);
});

test('Einkauf: Haken, Vorrat, Booster, Reste und Teilen-Text', () => {
  const state = defaultState();
  makeCtx(state);
  autofill(MONDAY, { random: () => 0.3 });
  const open = openItems(MONDAY);
  const first = shopping(MONDAY).find(i => !F[i.k].staple && !i.pantry)!;
  toggleHave(MONDAY, first.k, true);
  assert.equal(openItems(MONDAY), open - 1);
  assert.ok(shopping(MONDAY).find(i => i.k === 'salt')?.pantry, 'Salz ist standardmäßig im Vorrat');
  toggleBoost(MONDAY, 'pb');
  assert.ok(shopping(MONDAY).find(i => i.k === 'peanutbutter')?.recipes.has('extra'));
  assert.ok(dayTotals(MONDAY).boost > 150);
  for (const r of packRests(MONDAY)) assert.ok(r.rest > 0 && !['butter', 'carrot'].includes(r.k));
  assert.match(shoppingText(MONDAY), /^Einkauf /);
});

test('Meal-Prep-Ablauf: Box-Gericht wird am Vortag vorgekocht', () => {
  const state = defaultState();
  makeCtx(state);
  for (let i = 0; i < 3; i++) setEntry(addDays(MONDAY, i), 'lunch', { r: 'l01' });
  const tasks = prepTasks(MONDAY);
  const batch = tasks.find(t => t.kind === 'batch');
  assert.equal(batch?.date, addDays(MONDAY, -1));
  assert.equal(tasks.filter(t => t.kind === 'jar').length, 3);
});

test('Import: v1-Frühstücksplan und kaputte Daten', () => {
  const ids = new Set(BASE.map(r => r.id));
  const v1 = { version: 1, portions: 2, week: [1, 9, 2, 15, 17, 20, 6], weekStart: '2026-10-26', favorites: [3], have: {} };
  assert.ok(isV1(v1));
  const s = sanitize(migrateV1(v1), F, ids);
  assert.equal(s.settings.persons, 2);
  assert.deepEqual(s.weeks['2026-10-26'].days.map(d => d.breakfast && 'r' in d.breakfast ? d.breakfast.r : null), ['b01', 'b09', 'b02', 'b15', 'b17', 'b20', 'b06']);
  const junk = sanitize({ settings: { persons: 99, goalKcal: 'x' }, weeks: { bad: 1, '2026-10-19': { days: [{ breakfast: { r: 'nope' } }] } }, weights: [{ d: '2026-10-01', kg: 5 }] }, F, ids);
  assert.equal(junk.settings.persons, 1);
  assert.equal(junk.weeks['2026-10-19'].days[0].breakfast, null);
  assert.equal(junk.weights.length, 0);
});

test('Eigene Rezepte bleiben beim Import gültig', () => {
  const ids = new Set(BASE.map(r => r.id));
  const s = sanitize({ custom: [{ id: 'u1', title: 'Testbrei', meals: ['breakfast'], ingredients: [{ k: 'oats', q: 100 }], steps: [{ text: 'Kochen' }] }], weeks: { [MONDAY]: { days: [{ breakfast: { r: 'u1' } }] } } }, F, ids);
  assert.equal(s.custom[0].title, 'Testbrei');
  assert.deepEqual(s.weeks[MONDAY].days[0].breakfast, { r: 'u1' });
});

test('Suche verzeiht einen Tippfehler', async () => {
  const { fuzzyMatch, norm } = await import('../src/lib/core/util.ts');
  const hay = norm('Bratkartoffeln mit Kräuterquark Zwiebeln');
  assert.ok(fuzzyMatch(hay, 'kartofel'));
  assert.ok(fuzzyMatch(hay, 'Kräuterqurk'));
  assert.ok(fuzzyMatch(hay, 'krauter'));
  assert.ok(!fuzzyMatch(hay, 'linsen'));
  assert.ok(!fuzzyMatch(hay, 'karotten'));
});

test('Haltbarkeit konservativ: vegetarisch 2 Tage, Fleisch/Fisch/Reis/roh 1 Tag (BfR/FSA)', () => {
  const R = buildRecipes(BASE, [], F, 'cow');
  for (const r of R) {
    const types = new Set(r.ingredients.map(i => F[i.k].type));
    const rice = r.ingredients.some(i => ['rice', 'risotto'].includes(i.k));
    const isDrySnack = r.meals[0] === 'snack' && r.storage.fridgeDays === 5;
    if (!isDrySnack) assert.ok(r.storage.fridgeDays <= 2, `${r.id}: ${r.storage.fridgeDays} Tage`);
    if (types.has('meat') || types.has('fish')) assert.ok(r.storage.fridgeDays <= 1, `${r.id} Fleisch/Fisch`);
    if (rice && !/Reis[^.;]*nächsten Tag/.test(r.storage.note)) assert.ok(r.storage.fridgeDays <= 1, `${r.id} Reis`);
    assert.ok(!/[3-9] Monate/.test(r.storage.note), `${r.id} Gefrierdauer`);
  }
});

// Richtwert: randvoll ~600 g; bis zum Box-Volumen ok (Rest wird abends gegessen)
test('Thermobox-Gerichte passen (ungefähr) in eine 650-ml-Box', async () => {
  const { cookedWeight, boxCapacity } = await import('../src/lib/core/recipes.ts');
  const cap = 650; void boxCapacity;
  const R = buildRecipes(BASE, [], F, 'cow');
  for (const r of R.filter(r => r.storage.thermos)) {
    const g = cookedWeight(r.ingredients, F);
    assert.ok(g <= cap, `${r.id} ${r.title}: ca. ${g} g > ${cap} g`);
    assert.ok(r.nutrition.kcal >= 700, `${r.id}: nur ${r.nutrition.kcal} kcal`);
  }
});

test('Meal-Prep: Box-Gericht mit Reis über mehrere Tage → Hinweis zum Einfrieren', () => {
  const state = defaultState();
  makeCtx(state);
  for (let i = 0; i < 2; i++) setEntry(addDays(MONDAY, i), 'lunch', { r: 'l11' });
  const tasks = prepTasks(MONDAY);
  // l11 hält nur 1 Tag, ist aber einfrierbar → einmal kochen, Dienstag sofort einfrieren, Montagabend auftauen
  const batch = tasks.filter(t => t.kind === 'batch');
  assert.equal(batch.length, 1);
  assert.match(batch[0].detail, /für Di direkt einfrieren/);
  assert.match(batch[0].detail, /Reis nur für den ersten Tag/);
  assert.ok(tasks.some(t => t.kind === 'thaw' && t.date === MONDAY));
});
