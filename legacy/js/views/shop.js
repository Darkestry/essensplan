import { esc, icon, DAYS_SHORT, addDays, mondayOf, weekLabel } from '../util.js';
import { F, byId, state, GROUP_ORDER, shopping, packHint, fmtQty, week, weekDates, filled, packRests } from '../store.js';

export function renderShopping(monday) {
  const list = shopping(monday);
  const w = week(monday) || { have: {} };
  const have = k => w.have[k] || 0;
  const normal = list.filter(i => !F[i.k].staple && !i.pantry), staples = list.filter(i => F[i.k].staple && !i.pantry), pantry = list.filter(i => i.pantry);
  const done = normal.filter(i => have(i.k) >= i.q - .01).length;
  const thisWeek = mondayOf();
  const meals = weekDates(monday).reduce((s, d) => s + filled(d), 0);
  const rests = packRests(monday);
  const item = (i, pin) => {
    const h = have(i.k), full = h >= i.q - .01, partial = h > 0 && !full;
    const hint = packHint(i.k, i.q - (partial ? h : 0));
    const days = [...i.days].sort().map(d => DAYS_SHORT[d]).join(', ');
    const titles = [...i.recipes].map(id => id === 'extra' ? 'Extras' : byId.get(id)?.title).filter(Boolean);
    const conv = !hint && !F[i.k].staple && /liefert|wiegt|Zehe/.test(F[i.k].hint) ? F[i.k].hint : '';
    return `<div class="gitem ${full ? 'done' : ''}"><input type="checkbox" id="g-${i.k}" data-grocery="${i.k}" ${full ? 'checked' : ''}><label for="g-${i.k}"><b>${esc(F[i.k].name)}</b>${partial ? `<small class="partial">Plan geändert: noch ${fmtQty(i.k, i.q - h)} dazukaufen</small>` : ''}${hint ? `<small>${esc(hint)}</small>` : ''}${conv ? `<small>${esc(conv)}</small>` : ''}${F[i.k].staple ? '' : `<small>${days}${titles.length === 1 ? ' · ' + esc(titles[0]) : ` · ${titles.length} Gerichte`}</small>`}</label><span class="amt">${fmtQty(i.k, i.q)}${pin ? `<button type="button" class="pinbtn" data-action="pantry" data-k="${i.k}" aria-label="${esc(F[i.k].name)} als „immer im Vorrat“ markieren">immer da</button>` : ''}</span></div>`;
  };
  return `<div class="view">
  <div class="vhead"><div class="eyebrow">Einkaufsliste</div><h1>Ab in den Korb</h1>
    <div class="weeknav" style="margin-top:12px"><a class="iconbtn" href="#/einkauf/${addDays(monday, -7)}" aria-label="Vorige Woche">${icon.back}</a><b>${weekLabel(monday)}<small>${monday === thisWeek ? 'diese Woche' : monday === addDays(thisWeek, 7) ? 'nächste Woche' : ''}</small></b><a class="iconbtn" href="#/einkauf/${addDays(monday, 7)}" aria-label="Nächste Woche">${icon.chev}</a></div>
  </div>
  ${normal.length ? `
  <div class="card pad"><div class="row"><span class="grow"><b>${done} von ${normal.length}</b> <span class="muted small">erledigt · ${meals} Mahlzeiten × ${state.settings.persons} ${state.settings.persons === 1 ? 'Person' : 'Personen'}</span></span></div><div class="progress" style="margin-top:8px"><span style="width:${normal.length ? done / normal.length * 100 : 0}%"></span></div>
    <div class="btnrow" style="margin-top:12px"><button class="btn sm" type="button" data-action="shareList" data-week="${monday}">${icon.share} Teilen</button><button class="btn light sm" type="button" data-action="printShopping" data-week="${monday}">${icon.print} Drucken</button>${done ? `<button class="btn light sm" type="button" data-action="resetHave" data-week="${monday}">Zurücksetzen</button>` : ''}</div></div>
  <p class="small muted" style="margin-top:10px">Hake ab, was du schon zu Hause hast oder eingekauft hast. Ändert sich danach der Plan, zeigt die Liste, was noch fehlt.</p>
  ${GROUP_ORDER.filter(g => g !== 'Vorrat & Gewürze').map(g => { const items = normal.filter(i => F[i.k].group === g).sort((a, b) => F[a.k].name.localeCompare(F[b.k].name, 'de')); return items.length ? `<section class="card ggroup"><h3>${esc(g)}</h3>${items.map(i => item(i, false)).join('')}</section>` : ''; }).join('')}
  ${staples.length ? `<details class="card fold"><summary>Vorrat prüfen (${staples.length})</summary>${staples.sort((a, b) => F[a.k].name.localeCompare(F[b.k].name, 'de')).map(i => item(i, true)).join('')}</details>` : ''}
  ${pantry.length ? `<p class="small muted" style="margin-top:10px">${pantry.length} ${pantry.length === 1 ? 'Artikel ist' : 'Artikel sind'} immer im Vorrat und ausgeblendet: ${pantry.map(i => esc(F[i.k].name.split(',')[0])).join(', ')}. <a href="#/vorrat">Vorratsschrank</a></p>` : ''}
  ${rests.length ? `<section class="section"><div class="shead"><h2>Reste verwerten</h2></div><p class="small muted" style="margin-bottom:8px">Diese Packungen werden nicht ganz aufgebraucht. Plane eines der Rezepte dazu – oder friere den Rest ein.</p><div class="card">${rests.map(x => `<div class="setrow" style="display:block"><b>${fmtQty(x.k, x.rest)} ${esc(F[x.k].name.split(',')[0])}</b>${x.recipes.length ? `<div class="tags" style="margin-top:6px">${x.recipes.map(r => `<a class="chip" href="#/r/${r.id}">${esc(r.title)}</a>`).join('')}</div>` : ''}</div>`).join('')}</div></section>` : ''}
  <div class="infobox warm section"><b>Frische über die Woche</b>Fisch und Hackfleisch halten frisch nur 1 Tag, Geflügel 2 Tage. Für spätere Tage im Bio-Markt TK-Ware nehmen oder direkt nach dem Einkauf portionsweise einfrieren – der <a href="#/ablauf/${monday}">Meal-Prep-Ablauf</a> erinnert dich ans Auftauen.</div>
  ` : `<div class="card emptybox"><h2>Noch leer</h2><p>Plane Gerichte für diese Woche – die Liste addiert gleiche Zutaten und rechnet Packungsgrößen aus.</p><a class="btn" href="#/plan/${monday}">Zum Plan</a></div>`}
  </div>`;
}

// Vorratsschrank: Dinge, die immer im Haus sind, erscheinen nicht mehr auf der Liste.
export function renderPantry() {
  const keys = Object.keys(F).filter(k => k !== 'water' && (F[k].staple || ['Trockenwaren', 'Nüsse & Kerne', 'Dosen & Gläser'].includes(F[k].group)) && !k.startsWith('goat'));
  const groups = ['Vorrat & Gewürze', 'Trockenwaren', 'Nüsse & Kerne', 'Dosen & Gläser'];
  const p = state.settings.pantry;
  return `<div class="view settings"><div class="vhead"><a class="linkbtn" href="#/mehr">‹ Mehr</a><div class="eyebrow" style="margin-top:8px">Vorratsschrank</div><h1>Immer im Haus</h1><p class="lead">Was du hier markierst, taucht nicht mehr auf der Einkaufsliste auf. Gut für Gewürze, Öl, Salz und Grundvorräte. ${p.length} markiert.</p></div>
  ${groups.map(g => `<section class="section"><div class="shead"><h2>${esc(g)}</h2></div><div class="card">${keys.filter(k => F[k].group === g).sort((a, b) => F[a].name.localeCompare(F[b].name, 'de')).map(k => `<label class="setrow"><span><b>${esc(F[k].name)}</b></span><span class="switch"><input type="checkbox" data-pantry="${k}" ${p.includes(k) ? 'checked' : ''}><i></i></span></label>`).join('')}</div></section>`).join('')}
  </div>`;
}
