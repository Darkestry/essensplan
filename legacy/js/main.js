import { norm, $, $$, esc, toast, buzz, mondayOf, todayIso, addDays, parseIso, DAYS, DAYS_SHORT, dayIndex, shortDate, weekLabel, iso } from './util.js';
import * as S from './store.js';
import { injectDefs } from './art.js';
import { startTimer, timerAction, render as renderTimers } from './timer.js';
import { openPicker, closePicker, pickerOpen, confirmPicker, chooserHTML } from './views/common.js';
import { renderToday, renderPlan, renderPrep, slotMenuHTML, weekMenuHTML } from './views/plan.js';
import { renderRecipes, resultsHTML, listState, renderRecipeSheet, renderCook, sheetState, addToPlanHTML, addState } from './views/recipes.js';
import { renderShopping, renderPantry } from './views/shop.js';
import { renderWeight } from './views/weight.js';
import { renderEditor, startDraft, editorInput, editorAction, previewHTML, ingResults, setIngQuery, draft } from './views/editor.js';
import { renderMore, renderGuide } from './views/more.js';

const view = $('#view');
let baseRoute = null;          // zuletzt gerenderte Hauptansicht
let overlayFromBase = false;   // Rezept wurde aus der App heraus geöffnet → "Zurück" = history.back()
let wakeLock = null;
let installPrompt = null;
const chooser = { q: '', fav: false, all: false, date: null, slot: null };

// ---------- Routing ----------
function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'heute', a: parts[1], b: parts[2] };
}
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const TITLES = { heute: 'Heute', plan: 'Wochenplan', rezepte: 'Rezepte', einkauf: 'Einkaufsliste', ablauf: 'Meal-Prep-Ablauf', mehr: 'Mehr', wissen: 'Wissen', gewicht: 'Gewicht', vorrat: 'Vorratsschrank', editor: 'Eigenes Rezept' };
const NAV = { heute: 'heute', plan: 'plan', ablauf: 'plan', rezepte: 'rezepte', einkauf: 'einkauf', mehr: 'mehr', wissen: 'mehr', gewicht: 'heute', vorrat: 'mehr', editor: 'rezepte' };
let draftKey = null;

function renderBase(route, keepScroll = false) {
  const y = window.scrollY;
  const { name, a } = route;
  let html;
  if (name === 'heute') html = renderToday(validDate(a) ? a : todayIso());
  else if (name === 'plan') html = renderPlan(validDate(a) ? mondayOf(parseIso(a)) : mondayOf());
  else if (name === 'ablauf') html = renderPrep(validDate(a) ? mondayOf(parseIso(a)) : mondayOf());
  else if (name === 'rezepte') html = renderRecipes();
  else if (name === 'einkauf') html = renderShopping(validDate(a) ? mondayOf(parseIso(a)) : mondayOf());
  else if (name === 'mehr') html = renderMore();
  else if (name === 'wissen') html = renderGuide(a);
  else if (name === 'gewicht') html = renderWeight();
  else if (name === 'vorrat') html = renderPantry();
  else if (name === 'editor') {
    // Entwurf nur beim Betreten neu anlegen, nicht bei jedem Neuzeichnen
    if (draftKey !== location.hash || !draft) { if (a === 'kopie') startDraft('copy', route.b); else if (a && a !== 'neu') startDraft('edit', a); else startDraft('new'); draftKey = location.hash; }
    html = renderEditor();
  }
  else { location.replace('#/heute'); return; }
  view.innerHTML = html;
  baseRoute = { ...route };
  $('#appbarTitle').textContent = TITLES[name] || '';
  document.title = `${TITLES[name] || 'Morgenwerk'} · Morgenwerk`;
  $$('.tabbar a').forEach(l => l.dataset.nav === NAV[name] ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current'));
  if (name === 'mehr' && installPrompt) $('#installBox').hidden = false;
  updateBadge();
  if (keepScroll) window.scrollTo(0, y);
  else {
    window.scrollTo(0, 0);
    if (name === 'plan' && !a) requestAnimationFrame(() => { const t = $('#day-' + todayIso()); if (t && dayIndex(todayIso()) > 0) window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 120); });
  }
}
function refresh() { if (baseRoute) renderBase(baseRoute, true); if (!$('#sheet').hidden) renderSheet(); }

function route() {
  const r = parse();
  closePicker();
  if (r.name === 'r') {
    if (!baseRoute) renderBase({ name: 'rezepte' });
    openSheet(r.a, r.b === 'kochen');
    return;
  }
  closeSheetUI();
  const same = baseRoute && baseRoute.name === r.name && baseRoute.a === r.a;
  renderBase(r, same);
  if (!same) view.focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => {
  const r = parse();
  if (r.name === 'r' && $('#sheet').hidden) overlayFromBase = !!baseRoute;
  route();
});

// ---------- Rezept-Sheet ----------
function openSheet(id, cook) {
  const sheet = $('#sheet');
  const wasHidden = sheet.hidden;
  if (cook) { if (sheetState.cook === null || sheetState.id !== id) { sheetState.id !== id && renderRecipeSheet(id); sheetState.cook = 0; } requestWake(); }
  else { sheetState.cook = null; releaseWake(); }
  sheet.hidden = false;
  document.body.classList.add('locked', 'sheet-open');
  renderSheet();
  if (wasHidden || cook) { sheet.scrollTop = 0; requestAnimationFrame(() => $('#sheetInner .iconbtn')?.focus()); }
}
function renderSheet() {
  const { a: id } = parse();
  if (!id) return;
  $('#sheetInner').innerHTML = sheetState.cook !== null ? renderCook(id, sheetState.cook) : renderRecipeSheet(id);
}
function closeSheetUI() {
  const sheet = $('#sheet');
  if (sheet.hidden) return;
  sheet.hidden = true;
  $('#sheetInner').innerHTML = '';
  sheetState.cook = null;
  releaseWake();
  document.body.classList.remove('locked', 'sheet-open');
}
function closeSheet() {
  if (overlayFromBase) { overlayFromBase = false; history.back(); }
  else location.hash = baseRoute ? `#/${baseRoute.name}${baseRoute.a ? '/' + baseRoute.a : ''}` : '#/rezepte';
}
$('#sheet').addEventListener('scroll', e => $('#sheetTop')?.classList.toggle('scrolled', e.target.scrollTop > 180), { passive: true });

async function requestWake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener?.('release', () => { wakeLock = null; }); } } catch { wakeLock = null; } }
function releaseWake() { try { wakeLock?.release(); } catch { /* egal */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden && sheetState.cook !== null && !$('#sheet').hidden) requestWake(); });

function cookStep(delta) {
  const r = S.byId.get(parse().a); if (!r || sheetState.cook === null) return;
  const n = sheetState.cook + delta;
  if (n >= r.steps.length) { buzz(30); history.back(); setTimeout(() => askRating(r), 350); return; }
  if (n < 0) return;
  sheetState.cook = n; buzz(); renderSheet(); $('#sheet').scrollTop = 0;
}
// Wischen im Kochmodus
let touchX = null, touchY = null;
$('#sheet').addEventListener('touchstart', e => { if (sheetState.cook !== null) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; } }, { passive: true });
$('#sheet').addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
  touchX = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) cookStep(dx < 0 ? 1 : -1);
}, { passive: true });

// ---------- Aktionen ----------
const actions = {
  closeSheet, closePicker,
  fav(b) {
    const id = b.dataset.id;
    S.state.favorites = S.state.favorites.includes(id) ? S.state.favorites.filter(x => x !== id) : [...S.state.favorites, id];
    S.save(); buzz();
    toast(S.state.favorites.includes(id) ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
    refresh();
  },
  cook(b) { location.hash = `#/r/${b.dataset.id}/kochen`; },
  cookExit() { history.back(); },
  cookNext() { cookStep(1); },
  cookPrev() { cookStep(-1); },
  portions(b) { sheetState.portions = Math.max(.5, Math.min(12, sheetState.portions + Number(b.dataset.delta) * (sheetState.portions <= 1 && Number(b.dataset.delta) < 0 ? .5 : 1))); renderSheet(); },
  timer(b) { startTimer(Number(b.dataset.seconds), b.dataset.label); buzz(); },
  timerToggle(b) { timerAction('timerToggle', b.dataset.id); },
  timerAdd(b) { timerAction('timerAdd', b.dataset.id); },
  timerStop(b) { timerAction('timerStop', b.dataset.id); },

  // Plan
  choose(b) { Object.assign(chooser, { q: '', fav: false, all: false, date: b.dataset.date, slot: b.dataset.slot }); openPicker(chooserHTML(chooser.date, chooser.slot), '#chooserSearch'); },
  chooserFav() { chooser.fav = !chooser.fav; openPicker(chooserHTML(chooser.date, chooser.slot, chooser.q, chooser.fav, chooser.all), '#chooserSearch'); },
  chooserAll() { chooser.all = !chooser.all; openPicker(chooserHTML(chooser.date, chooser.slot, chooser.q, chooser.fav, chooser.all), '#chooserSearch'); },
  pickRecipe(b) { S.setEntry(b.dataset.date, b.dataset.slot, { r: b.dataset.id }); closePicker(); buzz(); toast(`${S.byId.get(b.dataset.id).title} eingeplant`); refresh(); },
  pickLeftover(b) {
    const date = b.dataset.date, prev = addDays(date, -1), r = S.recipeOf(S.getEntry(prev, 'dinner'));
    S.setEntry(date, 'lunch', { r: r.id, lo: 1 }); closePicker(); toast('Reste-Mittag eingeplant – abends doppelt kochen'); refresh();
  },
  pickText(b) {
    const { date, slot } = b.dataset;
    openPicker(`<div class="picker-head"><h2 id="pickerTitle">Eigener Eintrag</h2><p>${S.SLOT_LABEL[slot]} · ${DAYS[dayIndex(date)]}</p></div><div class="picker-body"><label class="field"><span>Was gibt es?</span><input type="text" id="freeText" maxlength="60" placeholder="z. B. Kantine, Essen bei Freunden"></label><div class="chips">${['Auswärts', 'Kantine', 'Reste', 'Fasten'].map(t => `<button type="button" class="chip" data-fill="${t}">${t}</button>`).join('')}</div></div><div class="picker-foot"><button class="btn orange block" type="button" id="freeOk">Speichern</button></div>`, '#freeText');
    $$('[data-fill]').forEach(c => c.onclick = () => { $('#freeText').value = c.dataset.fill; });
    $('#freeOk').onclick = () => { const v = $('#freeText').value.trim(); if (!v) return; S.setEntry(date, slot, { t: v }); closePicker(); refresh(); };
  },
  slotMenu(b) { openPicker(slotMenuHTML(b.dataset.date, b.dataset.slot)); },
  clearSlot(b) {
    const { date, slot } = b.dataset, prev = S.getEntry(date, slot);
    S.setEntry(date, slot, null); closePicker(); refresh();
    toast('Entfernt', { label: 'Rückgängig', run: () => { S.setEntry(date, slot, prev); refresh(); } });
  },
  swapRandom(b) {
    const { date, slot } = b.dataset, cur = S.getEntry(date, slot);
    const monday = mondayOf(parseIso(date));
    const used = new Set(S.entriesOf(monday).map(x => x.entry.r));
    const box = slot === 'lunch' && S.state.settings.thermosDays.includes(dayIndex(date));
    const pool = S.R.filter(r => r.meals.includes(slot) && S.allowed(r) && !used.has(r.id) && (!box || r.storage.thermos));
    if (!pool.length) { toast('Kein weiteres passendes Rezept gefunden.'); return; }
    const r = pool[Math.floor(Math.random() * pool.length)];
    S.setEntry(date, slot, { r: r.id }); closePicker(); refresh();
    toast(`Getauscht: ${r.title}`, { label: 'Rückgängig', run: () => { S.setEntry(date, slot, cur); refresh(); } });
  },
  addLeftover(b) {
    const date = b.dataset.date, next = addDays(date, 1), r = S.recipeOf(S.getEntry(date, 'dinner'));
    const prev = S.getEntry(next, 'lunch');
    S.setEntry(next, 'lunch', { r: r.id, lo: 1 }); closePicker(); refresh();
    toast(`Mittag am ${DAYS[dayIndex(next)]}: Rest von ${r.title}`, prev ? { label: 'Rückgängig', run: () => { S.setEntry(next, 'lunch', prev); refresh(); } } : undefined);
  },
  removeLeftover(b) { S.setEntry(addDays(b.dataset.date, 1), 'lunch', null); closePicker(); refresh(); },
  moveEntry(b) {
    const { date, slot } = b.dataset, monday = mondayOf(parseIso(date));
    openPicker(`<div class="picker-head"><h2 id="pickerTitle">Verschieben auf …</h2><p>Mit dem Eintrag am Zieltag wird getauscht.</p></div><div class="picker-body"><div class="daygrid">${Array.from({ length: 7 }, (_, i) => { const d = addDays(monday, i); return `<button type="button" data-moveto="${d}" ${d === date ? 'disabled' : ''}>${DAYS_SHORT[i]}<small>${parseIso(d).getDate()}.</small></button>`; }).join('')}</div></div>`);
    $$('[data-moveto]').forEach(x => x.onclick = () => { const to = x.dataset.moveto, a = S.getEntry(date, slot), c = S.getEntry(to, slot); S.setEntry(to, slot, a?.lo ? { r: a.r } : a); S.setEntry(date, slot, c?.lo ? { r: c.r } : c); closePicker(); refresh(); toast(`Auf ${DAYS[dayIndex(to)]} verschoben`); });
  },
  weekMenu(b) { openPicker(weekMenuHTML(b.dataset.week)); },
  autofill(b) {
    const n = S.autofill(b.dataset.week); closePicker();
    toast(n ? `${n} Plätze gefüllt – tippe auf ⋯ zum Tauschen` : 'Alles schon verplant');
    if (parse().name === 'heute' || parse().name === 'plan') refresh(); else location.hash = `#/plan/${b.dataset.week}`;
  },
  autofillAll(b) { confirmPicker('Ganze Woche neu planen?', 'Alle Einträge dieser Woche werden ersetzt.', 'Neu planen', () => { S.autofill(b.dataset.week, { overwrite: true }); refresh(); toast('Neue Woche vorgeschlagen'); }); },
  copyPrev(b) { const m = b.dataset.week; const doIt = () => { S.copyWeek(addDays(m, -7), m); closePicker(); refresh(); toast('Vorwoche übernommen'); }; S.weekDates(m).some(d => S.filled(d)) ? confirmPicker('Vorwoche übernehmen?', 'Die aktuelle Woche wird überschrieben.', 'Übernehmen', doIt) : doIt(); },
  clearWeek(b) { const m = b.dataset.week, backup = S.state.weeks[m]; confirmPicker('Woche leeren?', 'Alle Mahlzeiten und Häkchen dieser Woche werden entfernt.', 'Leeren', () => { S.clearWeek(m); refresh(); toast('Woche geleert', { label: 'Rückgängig', run: () => { S.state.weeks[m] = backup; S.save(); refresh(); } }); }); },
  printWeek(b) { closePicker(); printWeek(b.dataset.week); },

  // Rezept → Plan
  addToPlan(b) { addState.id = null; openPicker(addToPlanHTML(b.dataset.id)); },
  addWeek(b) { addState.monday = addDays(addState.monday, Number(b.dataset.delta)); addState.date = addDays(addState.date, Number(b.dataset.delta)); openPicker(addToPlanHTML(addState.id)); },
  addDay(b) { addState.date = b.dataset.date; openPicker(addToPlanHTML(addState.id)); },
  addSlot(b) { addState.slot = b.dataset.slot; openPicker(addToPlanHTML(addState.id)); },
  addConfirm() {
    const { id, date, slot } = addState;
    S.setEntry(date, slot, { r: id });
    if (!S.state.settings.slots[slot]) { S.state.settings.slots[slot] = true; S.save(); }
    closePicker(); buzz(); refresh();
    toast(`Eingeplant: ${DAYS[dayIndex(date)]}, ${S.SLOT_LABEL[slot]}`, { label: 'Zum Plan', run: () => { location.hash = `#/plan/${mondayOf(parseIso(date))}`; } });
  },

  // Rezepte-Liste
  resetFilters() { listState.q = ''; listState.meal = 'all'; listState.flags.clear(); refresh(); },

  // Einkauf
  shareList(b) {
    const text = S.shoppingText(b.dataset.week);
    if (navigator.share) navigator.share({ title: 'Einkaufsliste', text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => toast('Liste kopiert – z. B. in WhatsApp einfügen'), () => toast('Kopieren nicht möglich'));
  },
  printShopping(b) { printShopping(b.dataset.week); },
  resetHave(b) { const w = S.week(b.dataset.week); if (w) { const prev = w.have; w.have = {}; S.save(); refresh(); toast('Häkchen zurückgesetzt', { label: 'Rückgängig', run: () => { w.have = prev; S.save(); refresh(); } }); } },

  // Einstellungen
  persons(b) { S.state.settings.persons = Math.max(1, Math.min(6, S.state.settings.persons + Number(b.dataset.delta))); S.save(); refresh(); },
  export() {
    const blob = new Blob([JSON.stringify({ ...S.state, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `morgenwerk-plan-${todayIso()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  import() { $('#importFile')?.click(); },
  resetAll() { confirmPicker('Wirklich alles löschen?', 'Pläne, Häkchen, Favoriten und Einstellungen werden auf diesem Gerät gelöscht. Sichere vorher, falls du etwas behalten willst.', 'Alles löschen', () => { localStorage.removeItem('morgenwerk-v2'); location.hash = '#/heute'; location.reload(); }); },
  async install() { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installBox').hidden = true; },
  printRecipe(b) { printRecipe(b.dataset.id); },

  // Ziel & Booster
  boost(b) { S.toggleBoost(b.dataset.date, b.dataset.boost); buzz(); refresh(); },
  goalDelta(b) { S.state.settings.goalKcal = Math.max(1200, Math.min(6000, S.state.settings.goalKcal + Number(b.dataset.delta))); S.save(); refresh(); if (Math.abs(Number(b.dataset.delta)) > 100) toast(`Tagesziel: ${S.state.settings.goalKcal} kcal`); },
  proteinDelta(b) { S.state.settings.goalProtein = Math.max(30, Math.min(400, S.state.settings.goalProtein + Number(b.dataset.delta))); S.save(); refresh(); },
  weightDel(b) { const prev = S.state.weights.find(w => w.d === b.dataset.d); S.setWeight(b.dataset.d, NaN); refresh(); toast('Eintrag gelöscht', { label: 'Rückgängig', run: () => { S.setWeight(prev.d, prev.kg); refresh(); } }); },
  // Vorrat & Bewertungen
  pantry(b) { S.togglePantry(b.dataset.k); refresh(); toast(`${S.F[b.dataset.k].name.split(',')[0]} ist jetzt „immer im Vorrat“`, { label: 'Rückgängig', run: () => { S.togglePantry(b.dataset.k); refresh(); } }); },
  block(b) { S.toggleBlocked(b.dataset.id); closePicker(); refresh(); toast(S.isBlocked(b.dataset.id) ? 'Wird nicht mehr vorgeschlagen' : 'Wird wieder vorgeschlagen'); },
  unblockAll() { S.state.blocked = []; S.save(); refresh(); },
  rateFav(b) { if (!S.state.favorites.includes(b.dataset.id)) S.state.favorites.push(b.dataset.id); S.save(); closePicker(); toast('Als Favorit gemerkt – kommt öfter in den Plan'); },
  // Editor
  edAddIng(b) { editorAction('edAddIng', b); refresh(); },
  edDelIng(b) { editorAction('edDelIng', b); refresh(); },
  edAddStep(b) { editorAction('edAddStep', b); refresh(); },
  edDelStep(b) { editorAction('edDelStep', b); refresh(); },
  edMeal(b) { editorAction('edMeal', b); refresh(); },
  edSave() {
    if (!draft.title.trim()) { toast('Bitte einen Namen eingeben.'); $('[data-ed=title]')?.focus(); return; }
    if (!draft.ingredients.length) { toast('Bitte mindestens eine Zutat hinzufügen.'); $('#ingSearch')?.focus(); return; }
    // Für die Zeichnung: Zutaten, die im Schritt erwähnt werden, als sichtbare Zutaten übernehmen
    for (const st of draft.steps) { const t = norm(st.text || ''); st.items = draft.ingredients.map(i => i.k).filter(k => norm(S.F[k].name).split(/[^a-z]+/).some(w => w.length > 3 && t.includes(w.slice(0, 6)))).slice(0, 3); }
    const id = S.saveCustom(draft); draftKey = null; toast('Rezept gespeichert'); location.hash = '#/r/' + id;
  },
  edDelete() { const id = draft.id; confirmPicker('Rezept löschen?', 'Es wird auch aus allen Plänen entfernt.', 'Löschen', () => { S.deleteCustom(id); draftKey = null; location.hash = '#/rezepte'; toast('Rezept gelöscht'); }); },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && actions[b.dataset.action] && !b.disabled) {
    if (b.tagName === 'A' && b.dataset.action === 'closePicker') { closePicker(); return; }
    e.preventDefault(); e.stopPropagation();
    actions[b.dataset.action](b);
    return;
  }
  const chip = e.target.closest('[data-meal],[data-flag],[data-seg],[data-thermosday],[data-exclude]');
  if (!chip) return;
  const s = S.state.settings;
  if (chip.dataset.meal) { listState.meal = chip.dataset.meal; $$('[data-meal]').forEach(c => c.setAttribute('aria-pressed', c === chip)); $('#recipeResults').innerHTML = resultsHTML(); }
  else if (chip.dataset.flag) { const f = chip.dataset.flag; listState.flags.has(f) ? listState.flags.delete(f) : listState.flags.add(f); chip.setAttribute('aria-pressed', listState.flags.has(f)); $('#recipeResults').innerHTML = resultsHTML(); }
  else if (chip.dataset.seg) { const k = chip.dataset.seg, v = chip.dataset.value; s[k] = ['appetite', 'shopDay'].includes(k) ? Number(v) : v; S.save(); if (k === 'theme') applyTheme(); if (k === 'milk') { S.applyMilk(); toast(v === 'goat' ? 'Rezepte nutzen jetzt Ziegen- & Schafsmilchprodukte' : 'Rezepte nutzen jetzt Kuhmilchprodukte'); } refresh(); }
  else if (chip.dataset.thermosday !== undefined) { const d = Number(chip.dataset.thermosday); s.thermosDays = s.thermosDays.includes(d) ? s.thermosDays.filter(x => x !== d) : [...s.thermosDays, d].sort(); S.save(); refresh(); }
  else if (chip.dataset.exclude) { const a = chip.dataset.exclude; s.exclude = s.exclude.includes(a) ? s.exclude.filter(x => x !== a) : [...s.exclude, a]; S.save(); refresh(); }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.grocery) {
    const monday = mondayOf(parseIso(parse().a && validDate(parse().a) ? parse().a : todayIso()));
    const item = S.shopping(monday).find(i => i.k === el.dataset.grocery);
    const w = S.week(monday, true);
    if (el.checked && item) w.have[item.k] = item.q; else delete w.have[el.dataset.grocery];
    S.save(); buzz(8); refresh();
  } else if (el.dataset.task) { S.setTaskDone(el.dataset.task, el.dataset.date, el.checked); buzz(8); el.closest('.task')?.classList.toggle('done', el.checked); }
  else if (el.dataset.ing !== undefined) { const i = Number(el.dataset.ing); el.checked ? sheetState.checked.add(i) : sheetState.checked.delete(i); }
  else if (el.dataset.pantry) { S.togglePantry(el.dataset.pantry); }
  else if (el.dataset.edBool !== undefined || el.matches?.('select[data-step]')) { editorInput(el); }
  else if (el.dataset.setting?.startsWith('slot-')) { S.state.settings.slots[el.dataset.setting.slice(5)] = el.checked; S.save(); }
  else if (el.id === 'importFile') importFile(el.files[0]);
});

let searchTimer;
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'recipeSearch') { clearTimeout(searchTimer); searchTimer = setTimeout(() => { listState.q = el.value; $('#recipeResults').innerHTML = resultsHTML(); }, 120); }
  if (el.id === 'ingSearch') { setIngQuery(el.value); $('#ingResults').innerHTML = ingResults(); }
  else if (editorInput(el) === 'preview') $('#edPreview').innerHTML = previewHTML();
  if (el.id === 'chooserSearch') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      chooser.q = el.value;
      const tmp = document.createElement('div'); tmp.innerHTML = chooserHTML(chooser.date, chooser.slot, chooser.q, chooser.fav, chooser.all);
      $('#chooserList').innerHTML = tmp.querySelector('#chooserList').innerHTML;
    }, 120);
  }
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'weightForm') return;
  e.preventDefault();
  const d = $('#wDate').value, kg = Number(String($('#wKg').value).replace(',', '.'));
  if (!validDate(d) || !(kg > 20 && kg < 300)) { toast('Bitte ein gültiges Gewicht eingeben.'); return; }
  S.setWeight(d, kg); buzz(); refresh(); toast('Gewicht gespeichert');
});
// Tooltip in der Gewichtskurve (Tippen oder Hover)
function showTip(el) {
  const tip = $('#ctip'); if (!tip) return;
  const svg = el.ownerSVGElement, box = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  tip.textContent = el.dataset.tip; tip.hidden = false;
  // am Rand nicht abschneiden
  tip.style.left = Math.max(70, Math.min(box.width - 70, Number(el.dataset.x) / vb.width * box.width)) + 'px';
  tip.style.top = (Number(el.dataset.y) / vb.height * box.height) + 'px';
}
document.addEventListener('pointerover', e => { if (e.target.classList?.contains('chit')) showTip(e.target); });
document.addEventListener('click', e => { if (e.target.classList?.contains('chit')) showTip(e.target); else if ($('#ctip') && !e.target.closest('.chart')) $('#ctip').hidden = true; });
function askRating(r) {
  openPicker(`<div class="picker-head"><h2 id="pickerTitle">Guten Appetit!</h2><p>Wie war ${esc(r.title)}?</p></div><div class="picker-body"><ul class="menu">
    <li><button type="button" data-action="rateFav" data-id="${r.id}"><span><span>♥ Lecker – öfter einplanen</span><small>Als Favorit merken</small></span></button></li>
    <li><button type="button" data-action="closePicker"><span><span>Passt</span></span></button></li>
    <li><button type="button" data-action="block" data-id="${r.id}"><span><span>Nicht mehr vorschlagen</span><small>Bleibt im Rezeptbuch, kommt aber nicht mehr automatisch in den Plan</small></span></button></li>
    ${r.custom ? '' : `<li><a href="#/editor/kopie/${r.id}" data-action="closePicker"><span><span>Anpassen</span><small>Eigene Version mit anderen Mengen anlegen</small></span></a></li>`}
  </ul></div>`);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (pickerOpen()) closePicker(); else if (!$('#sheet').hidden) closeSheet(); }
  if (sheetState.cook !== null && !$('#sheet').hidden && !pickerOpen()) { if (e.key === 'ArrowRight') cookStep(1); if (e.key === 'ArrowLeft') cookStep(-1); }
});
window.addEventListener('scroll', () => $('.appbar').classList.toggle('scrolled', window.scrollY > 70), { passive: true });

async function importFile(file) {
  if (!file) return;
  if (file.size > 2_000_000) { toast('Datei ist zu groß.'); return; }
  try { S.importJSON(JSON.parse(await file.text())); S.applyMilk(); applyTheme(); refresh(); toast('Plan geladen'); }
  catch { toast('Diese Datei konnte nicht gelesen werden.'); }
}

// ---------- Theme ----------
function applyTheme() {
  const t = S.state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name=theme-color]').forEach(m => m.setAttribute('content', dark ? '#121a16' : '#243e33'));
}
$('#themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  S.state.settings.theme = dark ? 'light' : 'dark'; S.save(); applyTheme(); if (baseRoute?.name === 'mehr') refresh();
});
function updateBadge() { const n = S.openItems(mondayOf()); const b = $('#shopBadge'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; }

// ---------- Drucken ----------
function printHTML(html) { $('#printArea').innerHTML = html; setTimeout(() => window.print(), 50); }
function shoppingPrint(monday) {
  const list = S.shopping(monday);
  return S.GROUP_ORDER.map(g => { const items = list.filter(i => S.F[i.k].group === g); return items.length ? `<div class="pg"><h3>${esc(g)}</h3>${items.map(i => `<div><span class="box"></span>${S.fmtQty(i.k, i.q)} ${esc(S.F[i.k].name)}${S.packHint(i.k, i.q) ? ` <small>(${esc(S.packHint(i.k, i.q))})</small>` : ''}</div>`).join('')}</div>` : ''; }).join('');
}
function printWeek(monday) {
  const slots = S.activeSlots();
  const rows = S.weekDates(monday).map((d, i) => `<tr><th>${DAYS[i]}<br><small>${shortDate(d)}</small></th>${slots.map(sl => { const e = S.getEntry(d, sl), r = S.recipeOf(e); return `<td>${e ? esc(r ? r.title : e.t) + (e.lo ? ' <small>(Rest)</small>' : '') : '–'}</td>`; }).join('')}</tr>`).join('');
  const tasks = S.prepTasks(monday);
  printHTML(`<h1>Morgenwerk · Woche ${weekLabel(monday)}</h1><p>${S.state.settings.persons} ${S.state.settings.persons === 1 ? 'Person' : 'Personen'}</p>
  <h2>Plan</h2><table><thead><tr><th></th>${slots.map(s => `<th>${S.SLOT_LABEL[s]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
  ${tasks.length ? `<h2>Vorbereitung</h2>${tasks.map(t => `<div class="pg"><span class="box"></span><b>${DAYS_SHORT[dayIndex(t.date)]} ${t.when}:</b> ${esc(t.title)}</div>`).join('')}` : ''}
  <h2>Einkauf</h2><div class="cols">${shoppingPrint(monday)}</div>`);
}
function printShopping(monday) { printHTML(`<h1>Einkaufsliste ${weekLabel(monday)}</h1><div class="cols">${shoppingPrint(monday)}</div>`); }
function printRecipe(id) {
  const r = S.byId.get(id), p = sheetState.portions;
  printHTML(`<h1>${esc(r.title)}</h1><p>${esc(r.subtitle)} · ${r.time.total} Min. · ${p} ${p === 1 ? 'Portion' : 'Portionen'} · ${r.nutrition.kcal} kcal / ${Math.round(r.nutrition.protein)} g Eiweiß pro Portion</p>
  <h2>Zutaten</h2><div class="cols">${r.ingredients.map(i => `<div><span class="box"></span>${S.fmtQty(i.k, i.q * p)} ${esc(S.F[i.k].name)}</div>`).join('')}</div>
  <h2>Zubereitung</h2><ol>${r.steps.map(s => `<li class="pg"><b>${esc(s.title)}.</b> ${esc(s.text)}</li>`).join('')}</ol>
  ${r.tips?.length ? `<h2>Tipps</h2><ul>${r.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p><small>Geräte: ${esc(r.tools.join(', '))}. Lagerung: ${esc(r.storage.note || '')}</small></p>`);
}

// ---------- Start ----------
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (baseRoute?.name === 'mehr') $('#installBox').hidden = false; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller; // Erstinstallation ist kein Update
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => { if (nw.state === 'activated' && hadController) toast('Neue Version verfügbar', { label: 'Neu laden', run: () => location.reload() }); });
    });
  }).catch(() => {});
}

(async function start() {
  try {
    await S.loadData();
  } catch (err) {
    view.innerHTML = `<div class="view"><div class="card emptybox section"><h2>Daten konnten nicht geladen werden</h2><p>${location.protocol === 'file:' ? 'Die App muss über einen Webserver geöffnet werden (z. B. GitHub Pages oder lokal mit „npx serve“).' : 'Bitte prüfe deine Verbindung und lade neu.'}</p><button class="btn" onclick="location.reload()">Neu laden</button></div></div>`;
    return;
  }
  S.loadState();
  S.applyMilk();
  injectDefs();
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  renderTimers();
  if (location.hash.startsWith('#/r/')) overlayFromBase = false;
  route();
})();
