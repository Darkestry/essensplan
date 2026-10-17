import { esc, todayIso, parseIso, shortDate, addDays } from '../util.js';
import { state, weightTrend } from '../store.js';

const kg = n => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Einzelne Datenreihe → keine Legende; Titel benennt sie. Werte per Tippen, Tabelle darunter.
function chart(points) {
  if (points.length < 2) return `<div class="card pad small muted">Ab zwei Einträgen erscheint hier deine Kurve.</div>`;
  const W = 340, H = 190, L = 34, Rr = 10, T = 12, B = 26;
  const xs = points.map(p => parseIso(p.d).getTime());
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  let y0 = Math.floor(Math.min(...points.map(p => p.kg)) - 0.5), y1 = Math.ceil(Math.max(...points.map(p => p.kg)) + 0.5);
  if (y1 - y0 < 3) { y0 -= 1; y1 += 1; }
  const X = t => L + (t - x0) / (x1 - x0 || 1) * (W - L - Rr);
  const Y = v => T + (y1 - v) / (y1 - y0) * (H - T - B);
  const step = Math.max(1, Math.round((y1 - y0) / 4));
  let grid = '';
  for (let v = y0; v <= y1; v += step) grid += `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" class="cgrid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="caxis">${v}</text>`;
  const first = points[0], last = points[points.length - 1];
  grid += `<text x="${L}" y="${H - 6}" class="caxis">${shortDate(first.d)}</text><text x="${W - Rr}" y="${H - 6}" text-anchor="end" class="caxis">${shortDate(last.d)}</text>`;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(parseIso(p.d).getTime()).toFixed(1)} ${Y(p.kg).toFixed(1)}`).join('');
  const dots = points.map(p => { const cx = X(parseIso(p.d).getTime()).toFixed(1), cy = Y(p.kg).toFixed(1); return `<circle cx="${cx}" cy="${cy}" r="4.5" class="cdot"/><circle cx="${cx}" cy="${cy}" r="14" fill="transparent" class="chit" data-tip="${esc(shortDate(p.d) + ': ' + kg(p.kg) + ' kg')}" data-x="${cx}" data-y="${cy}"/>`; }).join('');
  return `<figure class="card chart" style="margin:0"><figcaption class="small muted" style="padding:12px 14px 0">Körpergewicht in kg</figcaption>
    <div class="chartwrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf von ${kg(first.kg)} auf ${kg(last.kg)} kg">${grid}<path d="${path}" class="cline"/>${dots}</svg><div class="ctip" id="ctip" hidden></div></div></figure>`;
}

export function renderWeight() {
  const w = state.weights;
  const last = w[w.length - 1];
  const t = weightTrend();
  const fourAgo = addDays(todayIso(), -28);
  const ref = [...w].reverse().find(x => x.d <= fourAgo) || w[0];
  const delta4 = last && ref && ref !== last ? last.kg - ref.kg : null;
  let advice = '';
  if (t && t.weeks >= 2) {
    if (t.perWeek < 0.15) advice = `<div class="infobox warm"><b>Kaum Zunahme</b>Du nimmst gerade ${kg(Math.max(0, t.perWeek))} kg pro Woche zu. Für eine stetige Zunahme mit möglichst viel Muskulatur sind etwa 0,25–0,5 kg pro Woche ein gutes Ziel. Erhöhe dein Tagesziel um rund 250 kcal.<div class="btnrow" style="margin-top:10px"><button class="btn orange sm" type="button" data-action="goalDelta" data-delta="250">Ziel auf ${state.settings.goalKcal + 250} kcal</button></div></div>`;
    else if (t.perWeek > 0.75) advice = `<div class="infobox warm"><b>Sehr schnelle Zunahme</b>${kg(t.perWeek)} kg pro Woche ist mehr als nötig – ein größerer Teil davon ist Fett. Etwa 0,25–0,5 kg pro Woche sind ideal.<div class="btnrow" style="margin-top:10px"><button class="btn light sm" type="button" data-action="goalDelta" data-delta="-200">Ziel auf ${state.settings.goalKcal - 200} kcal</button></div></div>`;
    else advice = `<div class="infobox"><b>Im Zielbereich</b>${kg(t.perWeek)} kg pro Woche – genau richtig für einen stetigen Aufbau. Weiter so.</div>`;
  }
  return `<div class="view">
  <div class="vhead"><div class="eyebrow">Fortschritt</div><h1>Gewicht</h1><p class="lead">Einmal pro Woche wiegen – morgens, nach dem Aufstehen, vor dem Frühstück. Einzelne Tage schwanken; entscheidend ist der Trend.</p></div>
  <form class="card pad" id="weightForm">
    <div class="row" style="gap:10px;align-items:flex-end">
      <label class="field grow" style="margin:0"><span>Datum</span><input type="date" id="wDate" value="${todayIso()}" max="${todayIso()}" required style="width:100%;height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px"></label>
      <label class="field" style="margin:0;width:120px"><span>kg</span><input type="number" id="wKg" inputmode="decimal" step="0.1" min="25" max="250" placeholder="${last ? kg(last.kg) : '70,0'}" required style="width:100%;height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px;font-size:18px"></label>
    </div>
    <button class="btn orange block" type="submit" style="margin-top:12px">Speichern</button>
  </form>
  ${last ? `<div class="daytotals" style="grid-template-columns:repeat(3,1fr);margin-top:14px"><div class="stat"><b>${kg(last.kg)}</b><span>kg aktuell</span></div><div class="stat"><b>${delta4 === null ? '–' : (delta4 > 0 ? '+' : '') + kg(delta4)}</b><span>kg in 4 Wochen</span></div><div class="stat"><b>${t ? (t.perWeek > 0 ? '+' : '') + kg(t.perWeek) : '–'}</b><span>kg pro Woche</span></div></div>` : ''}
  ${advice ? `<div class="section">${advice}</div>` : ''}
  <div class="section">${chart(w.slice(-26))}</div>
  ${w.length ? `<section class="section"><div class="shead"><h2>Einträge</h2></div><div class="card">${[...w].reverse().slice(0, 30).map(x => `<div class="setrow"><span>${parseIso(x.d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><span class="row"><b>${kg(x.kg)} kg</b><button class="iconbtn" type="button" data-action="weightDel" data-d="${x.d}" aria-label="Eintrag vom ${shortDate(x.d)} löschen">×</button></span></div>`).join('')}</div></section>` : ''}
  </div>`;
}
