// Prüft data/recipes-*.json gegen data/foods.json (+ data/foods-new-*.json) und das Schema.
// Aufruf: node tools/validate.js [--quiet]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'data');
const quiet = process.argv.includes('--quiet');

const foods = JSON.parse(fs.readFileSync(path.join(root, 'foods.json'), 'utf8'));
delete foods._doc;
for (const f of fs.readdirSync(root).filter(f => /^foods-new-.*\.json$/.test(f))) {
  const extra = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  for (const [k, v] of Object.entries(extra)) {
    if (k === '_doc') continue;
    if (foods[k]) console.log(`WARN ${f}: Zutat "${k}" existiert bereits in foods.json`);
    foods[k] = v;
  }
}

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const TAGS = ['schnell', 'mealprep', 'thermobox', 'ofen', 'onepot', 'einfrieren', 'proteinreich', 'wochenende'];
const ACTIONS = ['cut', 'grate', 'squeeze', 'shape', 'mix', 'mash', 'blend', 'pan', 'flip', 'toast', 'pot', 'oven', 'deglaze', 'jar', 'plate'];
const DISHES = ['plate', 'bowl', 'jar', 'pan', 'tray'];
const TYPES = ['slices', 'cubes', 'patties', 'pancakes', 'porridge', 'soup', 'stew', 'curry', 'mash', 'rice', 'grain', 'pasta', 'fillet', 'strips', 'beans', 'salad', 'roastveg', 'gratin', 'bites', 'dip', 'fruit'];
const COMPONENTS = ['cooked-potato', 'cooked-rice', 'cooked-sweetpotato', 'cooked-lentils', 'cooked-quinoa', 'roasted-veg'];
const FORBIDDEN = /beschicht|antihaft|teflon|waffeleisen|gusseisen|\bbrot\b|brötchen|toast(?!en)|tortilla|wrap|\bei\b|eier|speck|schinken|wurst|salami|schwein|chorizo|gelatine|mayonnaise/i;

const KCAL_RANGE = { breakfast: [920, 1200], lunch: [500, 900], dinner: [550, 1000], snack: [450, 850] };

let errors = 0, warnings = 0;
const err = (id, m) => { errors++; console.log(`FEHLER ${id}: ${m}`); };
const warn = (id, m) => { warnings++; console.log(`WARN   ${id}: ${m}`); };

const ids = new Set();
const files = fs.readdirSync(root).filter(f => /^recipes-.*\.json$/.test(f)).sort();
for (const file of files) {
  let list;
  try { list = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
  catch (e) { err(file, 'kein gültiges JSON: ' + e.message); continue; }
  if (!Array.isArray(list)) { err(file, 'muss ein Array sein'); continue; }
  if (!quiet) console.log(`\n== ${file} (${list.length} Rezepte)`);
  for (const r of list) {
    const id = r.id || '(ohne id)';
    if (!/^[blds]\d{2}$/.test(id)) err(id, 'id-Format b01/l01/d01/s01');
    if (ids.has(id)) err(id, 'doppelte id'); ids.add(id);
    for (const k of ['title', 'subtitle', 'origin']) if (typeof r[k] !== 'string' || !r[k]) err(id, `${k} fehlt`);
    if (!Array.isArray(r.meals) || !r.meals.length || r.meals.some(m => !MEALS.includes(m))) err(id, 'meals ungültig');
    if (!r.time || !Number.isFinite(r.time.active) || !Number.isFinite(r.time.total) || !(r.time.quick === null || Number.isFinite(r.time.quick))) err(id, 'time ungültig');
    else if (r.time.active > r.time.total) err(id, 'active > total');
    if (![1, 2, 3].includes(r.difficulty)) err(id, 'difficulty 1–3');
    if (!Array.isArray(r.tags) || r.tags.some(t => !TAGS.includes(t))) err(id, 'tags ungültig: ' + JSON.stringify(r.tags));
    if (!r.storage || !Number.isFinite(r.storage.fridgeDays) || typeof r.storage.freeze !== 'boolean' || typeof r.storage.thermos !== 'boolean') err(id, 'storage ungültig');
    if (r.meals?.includes('lunch') && !r.storage?.thermos && !r.meals.includes('dinner')) warn(id, 'Mittag ohne thermos:true');
    if (r.storage?.thermos && !(r.tags || []).includes('thermobox')) warn(id, 'thermos:true, aber Tag "thermobox" fehlt');
    for (const c of r.components || []) if (!COMPONENTS.includes(c.key) || !Number.isFinite(c.q)) err(id, 'component ungültig: ' + JSON.stringify(c));
    if (!Array.isArray(r.tools) || !r.tools.length) err(id, 'tools fehlen');
    if (!Array.isArray(r.ingredients) || r.ingredients.length < 3) err(id, 'zu wenige Zutaten');
    let n = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (const i of r.ingredients || []) {
      const f = foods[i.k];
      if (!f) { err(id, `unbekannte Zutat "${i.k}"`); continue; }
      if (!Number.isFinite(i.q) || i.q <= 0) err(id, `Menge ungültig bei ${i.k}`);
      for (const key in n) n[key] += (f[key] || 0) * i.q / 100;
    }
    if (!Array.isArray(r.steps) || r.steps.length < 3 || r.steps.length > 7) err(id, 'steps: 3–7 erwartet');
    for (const [si, s] of (r.steps || []).entries()) {
      if (!s.title || !s.text) err(id, `Schritt ${si + 1} ohne title/text`);
      if (!ACTIONS.includes(s.action)) err(id, `Schritt ${si + 1} action "${s.action}"`);
      if (!Array.isArray(s.items) || s.items.some(k => !foods[k])) err(id, `Schritt ${si + 1} items ungültig: ${JSON.stringify(s.items)}`);
      if (s.timer !== undefined && (!Number.isInteger(s.timer) || s.timer < 10)) err(id, `Schritt ${si + 1} timer ungültig`);
    }
    const a = r.art;
    if (!a || !DISHES.includes(a.dish) || !a.base || !TYPES.includes(a.base.type) || !/^#[0-9a-f]{6}$/i.test(a.base.color || '')) err(id, 'art ungültig');
    else {
      if (a.side && (!TYPES.includes(a.side.type) || !/^#[0-9a-f]{6}$/i.test(a.side.color || ''))) err(id, 'art.side ungültig');
      if (a.sauce && (!['dollop', 'drizzle', 'pool'].includes(a.sauce.style) || !/^#[0-9a-f]{6}$/i.test(a.sauce.color || ''))) err(id, 'art.sauce ungültig');
      if ((a.garnish || []).some(k => !foods[k])) err(id, 'art.garnish ungültig');
    }
    // Haltbarkeit konservativ (BfR: vorgekocht 2–3 Tage → 2, rohe Bestandteile 1; FSA/NHS: Reis 1; Fleisch/Fisch 1)
    if (r.storage && Array.isArray(r.ingredients)) {
      const types = new Set(r.ingredients.map(i => foods[i.k]?.type));
      const keys = r.ingredients.map(i => i.k);
      const rice = keys.some(k => ['rice', 'risotto'].includes(k));
      const dry = (r.meals || []).includes('snack') && !types.has('meat') && !types.has('fish') && !keys.some(k => ['milk', 'yogurt', 'quark', 'cream', 'creme', 'schmand', 'creamcheese', 'feta'].includes(k)) && !keys.some(k => foods[k]?.group === 'Obst & Gemüse' && k !== 'dates');
      const limit = (types.has('fish') || types.has('meat')) ? 1 : (dry ? 5 : 2);
      if (r.storage.fridgeDays > limit) err(id, `fridgeDays ${r.storage.fridgeDays} > ${limit} (BfR/FSA)`);
      if (rice && r.storage.fridgeDays > 1 && !/Reis[^.;]*nächsten Tag/.test(r.storage.note)) err(id, 'enthält Reis, hält länger als 1 Tag – Hinweis "Reis … nur bis zum nächsten Tag" fehlt');
      const days = [...r.storage.note.matchAll(/\b(\d) Tage/g)].map(m => Number(m[1]));
      if (days.some(d => d > (dry ? 5 : 2))) err(id, 'Notiz nennt mehr Tage als erlaubt: ' + r.storage.note.slice(0, 80));
      if (/\b[3-9] Monate/.test(r.storage.note)) err(id, 'Gefrierdauer höchstens 2 Monate');
      if (r.storage.thermos && /5 Stunden/.test(JSON.stringify(r))) err(id, 'Thermobox: innerhalb von 4 Stunden essen');
    }
    const text = [r.title, r.subtitle, ...(r.tools || []), ...(r.steps || []).flatMap(s => [s.title, s.text]), ...(r.tips || []), r.storage?.note].join(' \n ');
    const bad = text.match(FORBIDDEN);
    if (bad) warn(id, `verdächtiges Wort "${bad[0]}" – Regeln prüfen`);
    const main = (r.meals || [])[0];
    const range = KCAL_RANGE[main];
    if (range && (n.kcal < range[0] || n.kcal > range[1])) warn(id, `${Math.round(n.kcal)} kcal außerhalb ${range.join('–')} für ${main}`);
    if (main !== 'snack' && n.protein < 20) warn(id, `nur ${Math.round(n.protein)} g Eiweiß`);
    if (!quiet) console.log(`${id.padEnd(4)} ${String(Math.round(n.kcal)).padStart(4)} kcal ${String(Math.round(n.protein)).padStart(3)} P ${String(Math.round(n.carbs)).padStart(3)} KH ${String(Math.round(n.fat)).padStart(3)} F ${String(Math.round(n.fiber)).padStart(2)} Bal  ${r.title}`);
  }
}
console.log(`\n${ids.size} Rezepte · ${errors} Fehler · ${warnings} Warnungen`);
process.exit(errors ? 1 : 0);
