import { esc, icon, fmt, roundQty, DAYS, DAYS_SHORT, dayIndex, addDays, mondayOf, parseIso, todayIso, weekLabel } from '../util.js';
import { R, F, byId, state, SLOT_LABEL, ALLERGENS, DIET_LABEL, allowed, quickTime, portionsBase, getEntry, isBlocked } from '../store.js';
import { thumb, matches, mealName, timeLabel, shortTime } from './common.js';
import { dishArt, stepArt } from '../art.js';

export const listState = { q: '', meal: 'all', flags: new Set() };
const FLAGS = [
  ['fav', '♡ Favoriten', r => state.favorites.includes(r.id)],
  ['quick', 'Bis 20 Min.', r => quickTime(r) <= 20],
  ['veg', 'Vegetarisch', r => r.diet === 'veg' || r.diet === 'vegan'],
  ['vegan', 'Vegan', r => r.diet === 'vegan'],
  ['thermos', 'Thermobox', r => r.storage.thermos],
  ['prep', 'Meal-Prep', r => r.tags.includes('mealprep') || r.storage.freeze],
  ['protein', '30 g+ Eiweiß', r => r.nutrition.protein >= 30],
  ['oven', 'Ofen', r => r.tags.includes('ofen')],
  ['own', 'Eigene', r => r.custom],
  ['blocked', 'Ausgeblendet', r => isBlocked(r.id)],
];

export function filteredRecipes() {
  let list = R.filter(r => listState.meal === 'all' || r.meals.includes(listState.meal));
  const hidden = list.filter(r => !allowed(r)).length;
  list = list.filter(allowed);
  for (const f of listState.flags) { const def = FLAGS.find(x => x[0] === f); if (def) list = list.filter(def[2]); }
  list = list.filter(r => matches(r, listState.q));
  return { list, hidden };
}
export function renderRecipes() {
  return `<div class="view wide">
  <div class="vhead"><div class="eyebrow">Rezeptbuch</div><h1>Worauf hast du Lust?</h1><p class="lead">${R.length} Rezepte für Edelstahl-Küche – ohne Ei, Brot und Schwein.</p><a class="btn light sm" href="#/editor/neu" style="margin-top:10px">+ Eigenes Rezept</a></div>
  <div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="recipeSearch" type="search" placeholder="Suche: Linsen, Lachs, Curry …" value="${esc(listState.q)}" autocomplete="off" aria-label="Rezepte durchsuchen"></div>
  <div class="chips" role="group" aria-label="Mahlzeit">${[['all', 'Alle'], ['breakfast', 'Frühstück'], ['lunch', 'Mittag'], ['dinner', 'Abendessen'], ['snack', 'Snacks']].map(([k, l]) => `<button type="button" class="chip" data-meal="${k}" aria-pressed="${listState.meal === k}">${l}</button>`).join('')}</div>
  <div class="chips" role="group" aria-label="Filter" style="margin-top:6px">${FLAGS.map(([k, l]) => `<button type="button" class="chip" data-flag="${k}" aria-pressed="${listState.flags.has(k)}">${l}</button>`).join('')}</div>
  <div id="recipeResults">${resultsHTML()}</div>
  </div>`;
}
export function resultsHTML() {
  const { list, hidden } = filteredRecipes();
  return `<p class="count" aria-live="polite">${list.length} ${list.length === 1 ? 'Rezept' : 'Rezepte'}${hidden ? ` · ${hidden} wegen deiner <a href="#/mehr">Ernährungseinstellungen</a> ausgeblendet` : ''}</p>
  ${list.length ? `<div class="rgrid">${list.map(card).join('')}</div>` : `<div class="card emptybox"><p>Kein Rezept passt zu Suche und Filtern.</p><button class="btn light" type="button" data-action="resetFilters">Filter zurücksetzen</button></div>`}`;
}
function card(r) {
  const fav = state.favorites.includes(r.id);
  return `<a class="rcard" href="#/r/${r.id}"><div class="art">${thumb(r)}</div><span class="mealtag">${mealName(r.meals[0])}</span>
    <button type="button" class="fav" data-action="fav" data-id="${r.id}" aria-pressed="${fav}" aria-label="${esc(r.title)} ${fav ? 'aus Favoriten entfernen' : 'zu Favoriten'}">${icon.heart}</button>
    <div class="body"><h3>${esc(r.title)}</h3>${isBlocked(r.id) ? '<span class="tag warn" style="align-self:flex-start">wird nicht vorgeschlagen</span>' : ''}<div class="meta">${shortTime(r)} · ${r.nutrition.kcal} kcal · ${Math.round(r.nutrition.protein)} g Eiweiß${r.storage.thermos ? ' · Box' : ''}</div></div></a>`;
}

// ---------- Rezeptansicht ----------
export const sheetState = { id: null, portions: 1, cook: null, checked: new Set(), steps: new Set() };
function qty(k, q) {
  const f = F[k];
  if (f.staple && q < 5 && f.unit === 'g') {
    if (k === 'salt') return `${fmt(roundQty(q))} g`;
    const tsp = q / (k === 'olive' || k === 'rapeseed' ? 4.5 : 2.5);
    return tsp < .4 ? 'Prise' : `${fmt(Math.round(tsp * 2) / 2)} TL`;
  }
  if ((k === 'olive' || k === 'rapeseed' || k === 'sesameoil') && q >= 5) return `${fmt(Math.round(q / 12 * 2) / 2)} EL`;
  if (f.unit === 'g' && q >= 1000) return `${fmt(roundQty(q) / 1000)} kg`;
  if (f.unit === 'ml' && q >= 1000) return `${fmt(roundQty(q) / 1000)} l`;
  return `${fmt(roundQty(q))} ${f.unit}`;
}
export function renderRecipeSheet(id) {
  const r = byId.get(id);
  if (!r) return `<div class="sheettop"><button class="iconbtn" data-action="closeSheet" aria-label="Schließen">${icon.close}</button></div><div class="rhead"><h1 id="sheetTitle">Rezept nicht gefunden</h1></div>`;
  if (sheetState.id !== id) { sheetState.id = id; sheetState.portions = portionsBase(); sheetState.checked.clear(); sheetState.steps.clear(); }
  const p = sheetState.portions;
  const fav = state.favorites.includes(r.id);
  const n = r.nutrition;
  const store = r.storage;
  const main = r.ingredients.filter(i => !F[i.k].staple), staples = r.ingredients.filter(i => F[i.k].staple && i.k !== 'water'), water = r.ingredients.find(i => i.k === 'water');
  const ingRow = (i, idx) => `<label class="ing ${F[i.k].staple ? 'staple' : ''}"><input type="checkbox" data-ing="${idx}" ${sheetState.checked.has(idx) ? 'checked' : ''}><span class="q">${qty(i.k, i.q * p)}</span><span>${esc(F[i.k].name)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</span></label>`;
  return `<div class="sheettop" id="sheetTop"><button class="iconbtn" type="button" data-action="closeSheet" aria-label="Zurück">${icon.back}</button><span class="ttl">${esc(r.title)}</span>
    <button class="iconbtn" type="button" data-action="fav" data-id="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}" style="color:var(--orange)">${icon.heart.replace('<path', `<path fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"`)}</button>
    <button class="iconbtn" type="button" data-action="printRecipe" data-id="${r.id}" aria-label="Rezept drucken">${icon.print}</button></div>
  <div class="rhero">${dishArt(r)}</div>
  <div class="rhead"><div class="eyebrow">${mealName(r.meals[0])}${r.meals.length > 1 ? ' · auch ' + r.meals.slice(1).map(mealName).join(', ') : ''} · ${esc(r.origin)}</div><h1 id="sheetTitle">${esc(r.title)}</h1><p>${esc(r.subtitle)}</p>
  <div class="tags" style="margin-top:10px"><span class="tag">${DIET_LABEL[r.diet]}</span>${store.thermos ? '<span class="tag">Thermobox</span>' : ''}${store.freeze ? '<span class="tag">einfrierbar</span>' : ''}${r.tags.filter(t => !['thermobox', 'einfrieren'].includes(t)).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
  <div class="facts">
    <div class="fact"><b>${quickTime(r)}</b><span>Min.${r.time.quick && r.time.quick < r.time.total ? ' mit Vorrat' : ' gesamt'}</span></div>
    <div class="fact"><b>${r.time.active}</b><span>Min. aktiv</span></div>
    <div class="fact"><b>${'●'.repeat(r.difficulty)}${'○'.repeat(3 - r.difficulty)}</b><span>Aufwand</span></div>
  </div>
  ${r.time.quick && r.time.quick < r.time.total ? `<p class="small muted" style="margin:8px 16px 0">Ganz frisch zubereitet: ${r.time.total} Min.</p>` : ''}

  <section class="rsec"><h2>Zutaten</h2>
    <div class="card servings"><span><b>Portionen</b><br><span class="small muted">${p === portionsBase() ? 'aus deinen Einstellungen' : 'nur für diese Ansicht'}</span></span>
      <div class="stepper"><button type="button" data-action="portions" data-delta="-1" aria-label="Weniger Portionen">−</button><output aria-live="polite">${fmt(p)}</output><button type="button" data-action="portions" data-delta="1" aria-label="Mehr Portionen">+</button></div></div>
    <div class="card">${main.map(i => ingRow(i, r.ingredients.indexOf(i))).join('')}</div>
    ${staples.length ? `<div class="card" style="margin-top:10px"><div class="small muted" style="padding:10px 12px 0">Aus dem Vorrat</div>${staples.map(i => ingRow(i, r.ingredients.indexOf(i))).join('')}</div>` : ''}
    ${r.swaps?.length ? `<div class="infobox" style="margin-top:10px"><b>Mit Ziegen- & Schafsmilch</b>${r.swaps.map(x => `${esc(F[x.from].name.split(',')[0])} → ${esc(F[x.to].name.split(' (')[0])}`).join(' · ')}. ${r.swaps.some(x => x.to === 'goatyogurt' || x.to === 'goatquark') ? 'Ziegenjoghurt ist dünner – für Dips vorher abtropfen lassen. ' : ''}${r.swaps.some(x => x.to === 'goatcream') ? 'Ziegenfrischkäse erst am Ende bei kleiner Hitze einrühren. ' : ''}<a href="#/wissen/ziege">Mehr</a></div>` : ''}
    ${water ? `<p class="small muted" style="margin-top:8px">Dazu ${qty('water', water.q * p)} Wasser${water.note ? ` – ${esc(water.note)}` : ''}.</p>` : ''}
  </section>

  <section class="rsec"><h2>Nährwerte <span class="small muted" style="font-family:var(--sans);font-weight:500">pro Portion</span></h2>
    <div class="nutri"><div><b>${n.kcal}</b><span>kcal</span></div><div><b>${Math.round(n.protein)} g</b><span>Eiweiß</span></div><div><b>${Math.round(n.carbs)} g</b><span>Kohlenh.</span></div><div><b>${Math.round(n.fat)} g</b><span>Fett</span></div><div><b>${Math.round(n.fiber)} g</b><span>Ballastst.</span></div></div>
    <p class="small muted" style="margin-top:8px">Berechnet aus Durchschnittswerten der Zutaten; je nach Produkt ±10 %.</p>
    <div class="tags" style="margin-top:10px">${r.allergens.length ? r.allergens.map(a => `<span class="tag warn">${esc(ALLERGENS[a] || a)}</span>`).join('') : '<span class="tag">Keine der 14 Hauptallergene</span>'}</div>
    <p class="small muted" style="margin-top:6px">Allergene laut Zutatenliste; Produkte (z. B. Brühe, Currypulver) immer selbst prüfen.</p>
  </section>

  <section class="rsec"><h2>Lagern & Vorbereiten</h2>
    <div class="infobox"><b>${store.fridgeDays ? `Hält ${store.fridgeDays} ${store.fridgeDays === 1 ? 'Tag' : 'Tage'} im Kühlschrank` : 'Am besten frisch essen'}${store.freeze ? ' · einfrierbar' : ''}${store.thermos ? ' · Thermobox-tauglich' : ''}</b>${esc(store.note || '')}</div>
    ${store.thermos ? `<div class="infobox warm"><b>Für die Thermobox</b>Box 5–10 Min. mit kochendem Wasser vorheizen. Essen im Topf sprudelnd aufkochen (≥ 75 °C), randvoll füllen, sofort schließen und innerhalb von etwa 5 Stunden essen. <a href="#/wissen/thermobox">Mehr</a></div>` : ''}
    <p class="small" style="margin-top:10px"><b>Du brauchst:</b> ${esc(r.tools.join(' · '))}</p>
  </section>

  <section class="rsec"><h2>Zubereitung</h2>
    <div class="steps">${r.steps.map((s, i) => `<article class="card step"><div class="sart">${stepArt(r, s, i)}</div><div class="sbody"><div class="snum">Schritt ${i + 1} von ${r.steps.length}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.timer ? `<button class="btn soft sm" type="button" data-action="timer" data-seconds="${s.timer}" data-label="${esc(r.title + ': ' + s.title)}">⏱ ${timerLabel(s.timer)} starten</button>` : ''}</div></article>`).join('')}</div>
  </section>

  <section class="rsec"><div class="card"><ul class="menu" style="padding:4px 8px">${r.custom ? `<li><a href="#/editor/${r.id}"><span><span>Rezept bearbeiten</span><small>Mengen, Schritte, Zeiten ändern</small></span></a></li>` : `<li><a href="#/editor/kopie/${r.id}"><span><span>Eigene Version anlegen</span><small>Mengen oder Zutaten nach deinem Geschmack anpassen</small></span></a></li>`}<li><button type="button" data-action="block" data-id="${r.id}"><span><span>${isBlocked(r.id) ? 'Wieder vorschlagen' : 'Nicht mehr vorschlagen'}</span><small>${isBlocked(r.id) ? 'Taucht wieder im automatischen Wochenplan auf' : 'Wird beim automatischen Planen übersprungen'}</small></span></button></li></ul></div></section>

  ${r.tips?.length ? `<section class="rsec"><h2>Profi-Tipps</h2><div class="card pad"><ul class="tips">${r.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></section>` : ''}

  <div class="sheetbar"><div class="sheetbar-inner"><button class="btn light" type="button" data-action="addToPlan" data-id="${r.id}">In den Plan</button><button class="btn orange" type="button" data-action="cook" data-id="${r.id}">Kochmodus starten</button></div></div>`;
}
const timerLabel = s => s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} Min.` : `${s / 60} Min.`;

// ---------- Kochmodus ----------
export function renderCook(id, idx) {
  const r = byId.get(id); const s = r.steps[idx];
  const items = (s.items || []).filter(k => F[k] && k !== 'water').map(k => {
    const ing = r.ingredients.find(i => i.k === k);
    return ing ? `${qty(k, ing.q * sheetState.portions)} ${F[k].name.split(',')[0]}` : F[k].name.split(',')[0];
  });
  return `<div class="cook"><div class="sheettop scrolled"><button class="iconbtn" type="button" data-action="cookExit" aria-label="Kochmodus beenden">${icon.close}</button><span class="ttl" id="sheetTitle">${esc(r.title)}</span><span class="small muted" style="padding-right:10px">${idx + 1}/${r.steps.length}</span></div>
    <div class="cprog" aria-hidden="true">${r.steps.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>
    <div class="cart">${stepArt(r, s, idx)}</div>
    <div class="cbody"><div class="eyebrow">Schritt ${idx + 1} von ${r.steps.length}</div><h2>${esc(s.title)}</h2><p class="big">${esc(s.text)}</p>
      ${items.length ? `<p class="needs"><b>Dafür:</b> ${esc(items.join(' · '))}</p>` : ''}
      ${s.timer ? `<button class="btn soft" type="button" data-action="timer" data-seconds="${s.timer}" data-label="${esc(r.title + ': ' + s.title)}" style="margin-top:16px">⏱ Timer ${timerLabel(s.timer)}</button>` : ''}
    </div>
    <div class="cooknav"><button class="btn light" type="button" data-action="cookPrev" ${idx === 0 ? 'disabled' : ''}>Zurück</button><button class="btn orange" type="button" data-action="cookNext">${idx === r.steps.length - 1 ? 'Fertig – guten Appetit!' : 'Weiter'}</button></div></div>`;
}

// ---------- Zum Plan hinzufügen ----------
export const addState = { id: null, monday: null, date: null, slot: null };
export function addToPlanHTML(id) {
  const r = byId.get(id);
  if (addState.id !== id) {
    const m = mondayOf();
    const today = todayIso();
    const slot = r.meals[0] === 'lunch' ? 'lunch' : r.meals[0];
    // ersten freien Tag ab heute vorschlagen
    let date = today;
    for (let i = 0; i < 14; i++) { const d = addDays(today, i); if (!getEntry(d, slot)) { date = d; break; } }
    Object.assign(addState, { id, monday: mondayOf(parseIso(date)), date, slot });
    if (addState.monday < m) addState.monday = m;
  }
  const { monday, date, slot } = addState;
  const cur = getEntry(date, slot);
  const curR = cur?.r ? byId.get(cur.r) : null;
  return `<div class="picker-head"><h2 id="pickerTitle">In den Plan</h2><p>${esc(r.title)}</p></div><div class="picker-body">
    <div class="weeknav"><button class="iconbtn" type="button" data-action="addWeek" data-delta="-7" aria-label="Vorige Woche">${icon.back}</button><b>${weekLabel(monday)}</b><button class="iconbtn" type="button" data-action="addWeek" data-delta="7" aria-label="Nächste Woche">${icon.chev}</button></div>
    ${Array.from({ length: 1 }).map(() => `<div class="daygrid">${Array.from({ length: 7 }, (_, i) => { const d = addDays(monday, i); return `<button type="button" data-action="addDay" data-date="${d}" aria-pressed="${d === date}">${DAYS_SHORT[i]}<small>${parseIso(d).getDate()}.</small></button>`; }).join('')}</div>`).join('')}
    <div class="seg" style="margin-top:12px" role="group" aria-label="Mahlzeit">${['breakfast', 'lunch', 'dinner', 'snack'].map(s => `<button type="button" data-action="addSlot" data-slot="${s}" aria-pressed="${s === slot}">${SLOT_LABEL[s]}</button>`).join('')}</div>
    <p class="small muted" style="margin-top:12px">${DAYS[dayIndex(date)]}, ${SLOT_LABEL[slot]}: ${cur ? `ersetzt <b>${esc(curR ? curR.title : cur.t)}</b>` : 'noch frei'}</p>
  </div><div class="picker-foot"><button class="btn orange block" type="button" data-action="addConfirm">Einplanen</button></div>`;
}
