import { esc, icon, DAYS, DAYS_SHORT, dayIndex, shortDate, addDays, mondayOf, parseIso, todayIso, weekLabel, weekNumber, relDay, longDate } from '../util.js';
import { state, SLOTS, SLOT_LABEL, activeSlots, getEntry, recipeOf, dayTotals, filled, weekDates, tasksOn, taskDone, openItems, prepTasks, week, hasLeftoverFrom, boostsOn, boosterSuggestions, boosterLabel, weightTrend } from '../store.js';
import { thumb, entryLine } from './common.js';
import { heroArt } from '../art.js';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
}

// ---------- Heute ----------
export function renderToday(date = todayIso()) {
  const monday = mondayOf(parseIso(date));
  const slots = activeSlots();
  const total = dayTotals(date);
  const tasks = tasksOn(date);
  const tomorrow = addDays(date, 1);
  const empty = !week(monday) || weekDates(monday).every(d => !filled(d));
  const open = openItems(monday);
  const isToday = date === todayIso();
  return `<div class="view">
  <section class="hero">
    <div><div class="eyebrow">${isToday ? greeting() : relDay(date)}</div><h1>${isToday ? 'Heute' : DAYS[dayIndex(date)]}<br><em>${parseIso(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</em></h1></div>
    <div class="art">${heroArt()}</div>
  </section>
  <nav class="daystrip" aria-label="Tage dieser Woche">${weekDates(monday).map((d, i) => {
    const f = filled(d), n = slots.length;
    return `<a class="daypill" href="#/heute/${d}" ${d === date ? 'aria-current="date"' : ''}><small>${DAYS_SHORT[i]}</small><b>${parseIso(d).getDate()}</b><i class="${f >= n ? 'full' : f ? 'part' : ''}"></i></a>`;
  }).join('')}</nav>

  ${empty ? `<div class="card emptybox section"><h2>Noch nichts geplant</h2><p>Lass dir eine ausgewogene Woche vorschlagen – mit Meal-Prep für die Thermobox – und tausche danach einzelne Gerichte.</p><div class="btnrow"><button class="btn orange" type="button" data-action="autofill" data-week="${monday}">Woche vorschlagen</button><a class="btn light" href="#/plan/${monday}">Selbst planen</a></div></div>` : ''}

  <section class="section">
    <div class="shead"><h2>Mahlzeiten</h2><a href="#/plan/${monday}">Woche ›</a></div>
    <div class="card">${slots.map(slot => mealRow(date, slot)).join('')}</div>
  </section>
  ${total.n ? goalCard(date, total) : ''}
  ${weightCard()}

  <section class="section">
    <div class="shead"><h2>Zu tun</h2><a href="#/ablauf/${monday}">Ablauf ›</a></div>
    ${tasks.length ? `<ul class="card tasks">${tasks.map(t => taskItem(t, date)).join('')}</ul>` : `<div class="card pad muted small">Heute steht keine Vorbereitung an.${filled(tomorrow) ? ' Morgen ist alles frisch zu kochen.' : ''}</div>`}
  </section>

  ${open ? `<section class="section"><a class="card pad row" href="#/einkauf/${monday}" style="text-decoration:none"><div class="grow"><b>Einkaufsliste</b><div class="small muted">${open} Artikel offen für diese Woche</div></div>${icon.chev}</a></section>` : ''}
  </div>`;
}
// Tagesziel: Fortschritt + Booster, um die Lücke zu schließen
const bar = (val, goal, label, unit) => {
  const pct = Math.min(100, Math.round(val / goal * 100)), ok = val >= goal * 0.95;
  return `<div class="goalrow"><div class="row"><b class="grow">${label}</b><span class="small"><b>${Math.round(val).toLocaleString('de-DE')}</b> / ${goal.toLocaleString('de-DE')} ${unit}${ok ? ' <span class="okmark">✓</span>' : ''}</span></div><div class="progress ${ok ? '' : 'warn'}" role="progressbar" aria-label="${label}" aria-valuenow="${Math.round(val)}" aria-valuemin="0" aria-valuemax="${goal}"><span style="width:${pct}%"></span></div></div>`;
};
export function goalCard(date, total = dayTotals(date)) {
  const s = state.settings;
  const gap = Math.round(s.goalKcal - total.kcal), pGap = Math.round(s.goalProtein - total.protein);
  const active = boostsOn(date);
  const sugg = gap > 80 || pGap > 10 ? boosterSuggestions(date).slice(0, 4) : [];
  return `<section class="section"><div class="shead"><h2>Tagesziel</h2><a href="#/mehr">Ziel ändern ›</a></div>
  <div class="card pad">
    ${bar(total.kcal, s.goalKcal, 'Energie', 'kcal')}
    ${bar(total.protein, s.goalProtein, 'Eiweiß', 'g')}
    <p class="small muted" style="margin-top:8px">${gap > 80 ? `Es fehlen noch <b>${gap} kcal</b>${pGap > 10 ? ` und <b>${pGap} g Eiweiß</b>` : ''}.` : pGap > 10 ? `Energie passt – es fehlen noch <b>${pGap} g Eiweiß</b>.` : 'Ziel erreicht – gut gemacht.'} Pro Person${s.appetite !== 1 ? ', mit deiner Portionsgröße' : ''}.</p>
    ${active.length ? `<div class="tags" style="margin-top:10px">${active.map(b => `<button type="button" class="chip" aria-pressed="true" data-action="boost" data-date="${date}" data-boost="${b}">✓ ${esc(boosterLabel(b))}</button>`).join('')}</div>` : ''}
    ${sugg.length ? `<div class="small" style="margin-top:12px;font-weight:650">Schnelle Extras</div><div class="tags" style="margin-top:6px">${sugg.map(b => `<button type="button" class="chip" aria-pressed="false" data-action="boost" data-date="${date}" data-boost="${b.id}">+ ${esc(boosterLabel(b.id))} <span class="muted">${Math.round(b.n.kcal)} kcal</span></button>`).join('')}</div>` : ''}
  </div></section>`;
}
function weightCard() {
  const w = state.weights, last = w[w.length - 1], t = weightTrend();
  const due = !last || (parseIso(todayIso()) - parseIso(last.d)) / 864e5 >= 7;
  return `<section class="section"><a class="card pad row" href="#/gewicht" style="text-decoration:none"><div class="grow"><b>Gewicht</b><div class="small muted">${last ? `${last.kg.toLocaleString('de-DE')} kg${t ? ` · ${t.perWeek > 0 ? '+' : ''}${t.perWeek.toLocaleString('de-DE')} kg/Woche` : ''}` : 'Noch kein Eintrag'}${due ? ' · <b style="color:var(--orange)">Zeit zum Wiegen</b>' : ''}</div></div>${icon.chev}</a></section>`;
}
function mealRow(date, slot) {
  const e = getEntry(date, slot), r = recipeOf(e);
  if (!e) return `<button type="button" class="meal empty" data-action="choose" data-date="${date}" data-slot="${slot}" style="width:100%;border:0;background:none;text-align:left"><span class="thumb">+</span><span><span class="mslot">${SLOT_LABEL[slot]}</span><h3>Gericht wählen</h3><p>Noch frei</p></span><span></span></button>`;
  const { title, sub } = entryLine(date, slot, e);
  return `<a class="meal" href="${r ? `#/r/${r.id}` : '#'}" ${r ? '' : `data-action="slotMenu" data-date="${date}" data-slot="${slot}"`}><span class="thumb">${r ? thumb(r) : ''}</span><span><span class="mslot">${SLOT_LABEL[slot]}</span><h3>${esc(title)}</h3><p>${sub}</p></span>${r ? `<span class="go" aria-hidden="true">${icon.chev}</span>` : ''}</a>`;
}
export function taskItem(t, date) {
  const done = taskDone(t.id, t.date);
  return `<li class="task ${done ? 'done' : ''}"><input type="checkbox" id="t-${esc(t.id)}" data-task="${esc(t.id)}" data-date="${t.date}" ${done ? 'checked' : ''}><label for="t-${esc(t.id)}"><span class="when">${esc(t.when)}${date && t.date !== date ? ' · ' + relDay(t.date) : ''}</span><b>${esc(t.title)}</b><span>${esc(t.detail)}</span>${t.recipe ? `<a href="#/r/${t.recipe}" class="linkbtn">Rezept ›</a>` : ''}</label></li>`;
}

// ---------- Wochenplan ----------
export function renderPlan(monday) {
  const slots = activeSlots();
  const today = todayIso();
  const thisWeek = mondayOf();
  const nWeek = weekNumber(monday);
  const any = weekDates(monday).some(d => filled(d));
  return `<div class="view wide">
  <div class="vhead"><div class="eyebrow">Wochenplan</div>
    <div class="weeknav">
      <a class="iconbtn" href="#/plan/${addDays(monday, -7)}" aria-label="Vorige Woche">${icon.back}</a>
      <b>KW ${nWeek}<small>${weekLabel(monday)}${monday === thisWeek ? ' · diese Woche' : monday === addDays(thisWeek, 7) ? ' · nächste Woche' : ''}</small></b>
      <a class="iconbtn" href="#/plan/${addDays(monday, 7)}" aria-label="Nächste Woche">${icon.chev}</a>
    </div>
  </div>
  <div class="plantools">
    <button class="btn orange sm" type="button" data-action="autofill" data-week="${monday}">✦ Lücken füllen</button>
    <a class="btn light sm" href="#/einkauf/${monday}">Einkaufsliste</a>
    <a class="btn light sm" href="#/ablauf/${monday}">Meal-Prep-Ablauf</a>
    <button class="btn light sm" type="button" data-action="weekMenu" data-week="${monday}">Mehr …</button>
  </div>
  ${any ? '' : `<div class="card emptybox" style="margin-bottom:14px"><h2>Leere Woche</h2><p>„Lücken füllen“ schlägt passende Gerichte vor: schnelle Frühstücke unter der Woche, zwei Meal-Prep-Gerichte für die Thermobox und abwechslungsreiche Abendessen.</p>${state.weeks[addDays(monday, -7)] ? `<button class="btn light" type="button" data-action="copyPrev" data-week="${monday}">Vorwoche übernehmen</button>` : ''}</div>`}
  <div class="plandays">${weekDates(monday).map((d, i) => {
    const t = dayTotals(d);
    return `<article class="card planday ${d === today ? 'today' : ''}" id="day-${d}"><header><b>${DAYS[i]}</b><span>${shortDate(d)}</span><span class="kc">${t.n ? `<span class="${t.kcal >= state.settings.goalKcal * .95 ? 'okmark' : 'lowmark'}">${Math.round(t.kcal)}</span> / ${state.settings.goalKcal} kcal<br>${Math.round(t.protein)} g Eiweiß${t.boost ? ` · +${Math.round(t.boost)} Extras` : ''}` : ''}</span></header>
      ${slots.map(slot => slotRow(d, slot)).join('')}</article>`;
  }).join('')}</div>
  <p class="small muted" style="margin-top:12px">Nährwerte pro Person. Tippe auf ⋯ für Tauschen, Reste-Mittag oder Entfernen.</p>
  </div>`;
}
function slotRow(date, slot) {
  const e = getEntry(date, slot), r = recipeOf(e);
  const box = slot === 'lunch' && state.settings.thermosDays.includes(dayIndex(date));
  if (!e) return `<div class="slot empty"><span class="thumb">+</span><span><span class="lbl">${SLOT_LABEL[slot]}${box ? ' · Box' : ''}</span><br><button class="addbtn" type="button" data-action="choose" data-date="${date}" data-slot="${slot}">Gericht wählen</button></span><span></span></div>`;
  const { title, sub } = entryLine(date, slot, e);
  return `<div class="slot"><span class="thumb">${r ? thumb(r) : ''}</span><span class="grow"><span class="lbl">${SLOT_LABEL[slot]}</span>${r ? `<a class="name" href="#/r/${r.id}">${esc(title)}</a>` : `<span class="name">${esc(title)}</span>`}<span class="sub">${sub}</span></span><button class="more" type="button" data-action="slotMenu" data-date="${date}" data-slot="${slot}" aria-label="${SLOT_LABEL[slot]} am ${DAYS[dayIndex(date)]}: Optionen">${icon.dots}</button></div>`;
}

export function slotMenuHTML(date, slot) {
  const e = getEntry(date, slot), r = recipeOf(e);
  const next = addDays(date, 1);
  const canLeftover = slot === 'dinner' && r && r.storage.fridgeDays >= 1 && state.settings.slots.lunch;
  const hasLo = slot === 'dinner' && hasLeftoverFrom(date);
  const li = (action, label, sub = '', extra = '', cls = '') => `<li><button type="button" class="${cls}" data-action="${action}" data-date="${date}" data-slot="${slot}" ${extra}><span><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</span></button></li>`;
  return `<div class="picker-head"><h2 id="pickerTitle">${esc(r ? r.title : e?.t || SLOT_LABEL[slot])}</h2><p>${SLOT_LABEL[slot]} · ${DAYS[dayIndex(date)]}, ${shortDate(date)}</p></div>
  <div class="picker-body"><ul class="menu">
    ${r ? `<li><a href="#/r/${r.id}" data-action="closePicker"><span>Rezept öffnen</span></a></li>` : ''}
    ${li('choose', 'Anderes Gericht wählen')}
    ${li('swapRandom', 'Zufällig tauschen', 'Passendes Gericht, das diese Woche noch nicht vorkommt')}
    ${canLeftover ? (hasLo ? li('removeLeftover', 'Nicht mehr doppelt kochen', `Mittag am ${DAYS[dayIndex(next)]} wird wieder frei`) : li('addLeftover', 'Doppelt kochen → Mittag morgen', r.storage.thermos ? `Rest kommt am ${DAYS[dayIndex(next)]} in die Thermobox` : `Rest gibt es am ${DAYS[dayIndex(next)]} mittags`)) : ''}
    ${li('moveEntry', 'Auf anderen Tag verschieben')}
    ${li('clearSlot', 'Entfernen', '', '', 'danger')}
  </ul></div>`;
}
export function weekMenuHTML(monday) {
  const prev = addDays(monday, -7);
  return `<div class="picker-head"><h2 id="pickerTitle">Woche ${weekLabel(monday)}</h2></div><div class="picker-body"><ul class="menu">
    <li><button type="button" data-action="autofill" data-week="${monday}"><span><span>Leere Plätze automatisch füllen</span><small>Bestehende Einträge bleiben</small></span></button></li>
    <li><button type="button" data-action="autofillAll" data-week="${monday}"><span><span>Ganze Woche neu vorschlagen</span><small>Überschreibt alle Einträge</small></span></button></li>
    ${state.weeks[prev] ? `<li><button type="button" data-action="copyPrev" data-week="${monday}"><span><span>Vorwoche übernehmen</span><small>${weekLabel(prev)}</small></span></button></li>` : ''}
    <li><button type="button" data-action="printWeek" data-week="${monday}"><span><span>Plan & Einkaufsliste drucken</span><small>Oder im Druckdialog als PDF speichern</small></span></button></li>
    <li><button type="button" class="danger" data-action="clearWeek" data-week="${monday}"><span><span>Woche leeren</span></span></button></li>
  </ul></div>`;
}

// ---------- Meal-Prep-Ablauf ----------
export function renderPrep(monday) {
  const tasks = prepTasks(monday);
  const byDate = {};
  for (const t of tasks) (byDate[t.date] ||= []).push(t);
  const dates = Object.keys(byDate).sort();
  return `<div class="view">
  <div class="vhead"><div class="eyebrow">Meal-Prep-Ablauf</div><h1>Dein Vorsprung</h1>
  <p class="lead">Was du wann vorbereitest, damit morgens und mittags alles schnell geht: Vorkochen, Einfrieren, Auftauen und Thermobox – automatisch aus deinem Plan.</p>
  <div class="weeknav" style="margin-top:12px"><a class="iconbtn" href="#/ablauf/${addDays(monday, -7)}" aria-label="Vorige Woche">${icon.back}</a><b>${weekLabel(monday)}</b><a class="iconbtn" href="#/ablauf/${addDays(monday, 7)}" aria-label="Nächste Woche">${icon.chev}</a></div></div>
  ${dates.length ? `<div class="tl">${dates.map(d => `<div class="tlday"><b>${d < monday ? (dayIndex(d) === 6 ? 'Sonntag' : DAYS[dayIndex(d)]) + ' davor' : DAYS[dayIndex(d)]} · ${shortDate(d)}</b><ul class="card tasks">${byDate[d].map(t => taskItem(t)).join('')}</ul></div>`).join('')}</div>`
    : `<div class="card emptybox"><h2>Nichts vorzubereiten</h2><p>Plane zuerst Gerichte ein – dann erscheint hier, was du vorkochen, einfrieren oder auftauen solltest.</p><a class="btn" href="#/plan/${monday}">Zum Plan</a></div>`}
  <div class="card pad section small"><b>Grundregeln</b><p class="muted" style="margin-top:4px">Gekochtes in flachen Dosen rasch abkühlen und innerhalb von 2 Stunden kühlen (≤ 5 °C). Reis höchstens bis zum nächsten Tag kühlen. Aufgetautes nicht wieder einfrieren. Mehr unter <a href="#/wissen/lagern">Vorkochen & Lagern</a>.</p></div>
  </div>`;
}
