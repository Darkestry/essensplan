import { esc, icon, $, DAYS, DAYS_SHORT, dayIndex, shortDate, addDays, mondayOf, parseIso, relDay, norm } from '../util.js';
import { R, F, state, SLOT_LABEL, DIET_LABEL, allowed, quickTime, getEntry, recipeOf, hasLeftoverFrom } from '../store.js';
import { dishArt } from '../art.js';

const artCache = new Map();
export function thumb(r) {
  if (!r) return '';
  if (!artCache.has(r.id)) artCache.set(r.id, dishArt(r, { label: false }));
  return artCache.get(r.id);
}
export const mealName = m => SLOT_LABEL[m] || m;
export function timeLabel(r) {
  const q = r.time.quick;
  return q && q < r.time.total ? `${q} Min. mit Vorrat · ${r.time.total} frisch` : `${r.time.total} Min.`;
}
export function shortTime(r) { return `${quickTime(r)} Min.`; }
export function dietLabel(r) { return DIET_LABEL[r.diet]; }

export function entryLine(date, slot, e) {
  const r = recipeOf(e);
  if (!e) return { title: '', sub: '' };
  if (e.t) return { title: e.t, sub: 'Eigener Eintrag' };
  if (!r) return { title: '–', sub: '' };
  const parts = [];
  if (e.lo) parts.push(`<span class="lo">Rest von gestern</span>`);
  else parts.push(shortTime(r));
  parts.push(`${Math.round(r.nutrition.kcal * state.settings.appetite)} kcal`);
  if (slot === 'lunch' && state.settings.thermosDays.includes(dayIndex(date)) && r.storage.thermos) parts.push('Thermobox');
  if (slot === 'dinner' && hasLeftoverFrom(date)) parts.push(`<span class="lo">+ Mittag morgen</span>`);
  return { title: r.title, sub: parts.join(' · ') };
}

// Rezept-Suche: alle Wörter müssen irgendwo vorkommen (Titel, Untertitel, Zutaten, Herkunft).
const searchIndex = new Map();
export function matches(r, q) {
  if (!q) return true;
  if (!searchIndex.has(r.id)) {
    searchIndex.set(r.id, norm([r.title, r.subtitle, r.origin, ...r.ingredients.map(i => i.k), ...r.tags].join(' ') + ' ' + r.ingredients.map(i => F[i.k]?.name || '').join(' ')));
  }
  const hay = searchIndex.get(r.id);
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w) || (w.length > 4 && hay.includes(w.slice(0, -1))));
}

export function recipeRow(r, attrs = '') {
  return `<button type="button" class="pickrow" ${attrs}><span class="thumb">${thumb(r)}</span><span><b>${esc(r.title)}</b><small>${shortTime(r)} · ${r.nutrition.kcal} kcal · ${Math.round(r.nutrition.protein)} g Eiweiß${r.storage.thermos ? ' · Thermobox' : ''}</small></span>${icon.chev}</button>`;
}

// ---------- Bottom-Sheet-Picker ----------
let pickerReturn = null;
export function openPicker(html, focusSel) {
  const p = $('#picker');
  pickerReturn = document.activeElement;
  $('#pickerCard').innerHTML = html;
  p.hidden = false;
  document.body.classList.add('locked');
  requestAnimationFrame(() => ($(focusSel || '#pickerCard button, #pickerCard input', p) || $('#pickerCard'))?.focus?.());
}
export function closePicker() {
  const p = $('#picker');
  if (p.hidden) return;
  p.hidden = true;
  $('#pickerCard').innerHTML = '';
  if ($('#sheet').hidden) document.body.classList.remove('locked');
  pickerReturn?.focus?.();
}
export const pickerOpen = () => !$('#picker').hidden;

export function confirmPicker(title, text, okLabel, onOk) {
  openPicker(`<div class="picker-head"><h2 id="pickerTitle">${esc(title)}</h2><p>${esc(text)}</p></div><div class="picker-foot btnrow"><button class="btn light" type="button" data-action="closePicker">Abbrechen</button><button class="btn orange" type="button" id="confirmOk">${esc(okLabel)}</button></div>`);
  $('#confirmOk').onclick = () => { closePicker(); onOk(); };
}

// Rezeptauswahl für einen Plan-Platz
export function chooserHTML(date, slot, query = '', onlyFav = false, all = false) {
  const meals = slot === 'lunch' ? ['lunch', 'dinner'] : [slot];
  let list = R.filter(r => r.meals.some(m => meals.includes(m)));
  const hidden = list.filter(r => !allowed(r)).length;
  if (!all) list = list.filter(allowed);
  if (onlyFav) list = list.filter(r => state.favorites.includes(r.id));
  list = list.filter(r => matches(r, query));
  // Für Box-Tage zuerst thermobox-taugliche Gerichte
  const box = slot === 'lunch' && state.settings.thermosDays.includes(dayIndex(date));
  if (box) list.sort((a, b) => (b.storage.thermos - a.storage.thermos) || (a.meals[0] === 'lunch' ? -1 : 1));
  const prevDinner = recipeOf(getEntry(addDays(date, -1), 'dinner'));
  const loOption = slot === 'lunch' && prevDinner && (prevDinner.storage.fridgeDays >= 1)
    ? `<button type="button" class="pickrow" data-action="pickLeftover" data-date="${date}"><span class="thumb">${thumb(prevDinner)}</span><span><b>Rest vom Vorabend</b><small>${esc(prevDinner.title)} – wird abends doppelt gekocht</small></span>${icon.chev}</button>` : '';
  return `<div class="picker-head"><h2 id="pickerTitle">${esc(mealName(slot))} · ${DAYS[dayIndex(date)]}</h2><p>${shortDate(date)}${box ? ' · Thermobox-Tag' : ''}</p></div>
  <div class="picker-body">
    <div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="chooserSearch" type="search" placeholder="Rezept oder Zutat suchen" value="${esc(query)}" autocomplete="off" aria-label="Rezept suchen" data-date="${date}" data-slot="${slot}"></div>
    <div class="chips" style="margin-bottom:8px"><button type="button" class="chip" data-action="chooserFav" aria-pressed="${onlyFav}">${onlyFav ? '♥' : '♡'} Favoriten</button>${hidden ? `<button type="button" class="chip" data-action="chooserAll" aria-pressed="${all}">Auch ausgeblendete (${hidden})</button>` : ''}<button type="button" class="chip" data-action="pickText" data-date="${date}" data-slot="${slot}">✎ Eigener Eintrag</button></div>
    ${loOption}
    <div id="chooserList">${list.map(r => recipeRow(r, `data-action="pickRecipe" data-id="${r.id}" data-date="${date}" data-slot="${slot}"`)).join('') || '<p class="muted pad">Nichts gefunden.</p>'}</div>
  </div>`;
}

export function weekDayButtons(monday, selected) {
  return `<div class="daygrid">${Array.from({ length: 7 }, (_, i) => { const d = addDays(monday, i); return `<button type="button" data-pickday="${d}" aria-pressed="${d === selected}">${DAYS_SHORT[i]}<small>${parseIso(d).getDate()}.</small></button>`; }).join('')}</div>`;
}
export { mondayOf, relDay };
