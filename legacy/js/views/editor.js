// Editor für eigene Rezepte (neu oder als eigene Version eines vorhandenen Rezepts)
import { esc, icon, norm } from '../util.js';
import { F, byId, state, SLOTS, SLOT_LABEL, enrich, nextCustomId, sanitizeCustom } from '../store.js';

export let draft = null;
const clone = o => JSON.parse(JSON.stringify(o));

export function startDraft(mode, id) {
  if (mode === 'edit' && state.custom.some(c => c.id === id)) draft = clone(state.custom.find(c => c.id === id));
  else if (mode === 'copy' && byId.has(id)) {
    const r = byId.get(id), c = r._cow || r;
    draft = clone({ id: nextCustomId(), basedOn: r.id, meals: r.meals, title: r.title + ' (meine Version)', subtitle: c.subtitle, time: r.time, difficulty: r.difficulty, tags: r.tags, storage: r.storage, tools: r.tools, ingredients: c.ingredients, steps: c.steps, tips: c.tips, art: r.art });
  } else draft = { id: nextCustomId(), meals: ['dinner'], title: '', subtitle: '', time: { active: 15, total: 30, quick: null }, difficulty: 1, tags: [], storage: { fridgeDays: 2, freeze: false, thermos: false, note: '' }, tools: ['Edelstahlpfanne 28 cm'], ingredients: [], steps: [{ title: '', text: '', action: 'pan', items: [] }], tips: [] };
  ingQuery = '';
}
let ingQuery = '';

export function ingResults() {
  if (!ingQuery.trim()) return '';
  const q = norm(ingQuery);
  const hits = Object.keys(F).filter(k => k !== 'water' && !k.startsWith('goat') && norm(F[k].name).includes(q)).slice(0, 8);
  return hits.length ? hits.map(k => `<button type="button" class="pickrow" style="grid-template-columns:1fr auto" data-action="edAddIng" data-k="${k}"><span><b>${esc(F[k].name)}</b><small>${esc(F[k].group)} · ${F[k].kcal} kcal / 100 ${F[k].unit}</small></span>${icon.plus}</button>`).join('') : `<p class="small muted" style="padding:8px 4px">Keine Zutat gefunden. Die Datenbank enthält ${Object.keys(F).length} Zutaten mit Nährwerten.</p>`;
}
export function setIngQuery(v) { ingQuery = v; }

export function previewHTML() {
  const ok = sanitizeCustom([{ ...draft, title: draft.title || 'x' }])[0];
  if (!ok) return '<span class="small muted">Füge Zutaten hinzu, um Nährwerte zu sehen.</span>';
  const n = enrich(ok).nutrition;
  return `<div class="nutri"><div><b>${n.kcal}</b><span>kcal</span></div><div><b>${Math.round(n.protein)} g</b><span>Eiweiß</span></div><div><b>${Math.round(n.carbs)} g</b><span>Kohlenh.</span></div><div><b>${Math.round(n.fat)} g</b><span>Fett</span></div><div><b>${Math.round(n.fiber)} g</b><span>Ballastst.</span></div></div>`;
}

export function renderEditor() {
  const d = draft;
  if (!d) return `<div class="view"><p>Kein Entwurf.</p><a href="#/rezepte">Zu den Rezepten</a></div>`;
  const existing = state.custom.some(c => c.id === d.id);
  const num = (path, val, label, unit, min = 0, max = 600) => `<label class="field" style="margin:0"><span>${label}</span><input type="number" inputmode="numeric" min="${min}" max="${max}" data-ed="${path}" value="${val ?? ''}" style="width:100%;height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px"> <small class="muted">${unit}</small></label>`;
  return `<div class="view editor">
  <div class="vhead"><a class="linkbtn" href="${d.basedOn ? '#/r/' + d.basedOn : '#/rezepte'}">‹ Zurück</a><div class="eyebrow" style="margin-top:8px">${existing ? 'Rezept bearbeiten' : d.basedOn ? 'Eigene Version' : 'Neues Rezept'}</div><h1>${esc(d.title || 'Eigenes Rezept')}</h1>
  <p class="lead">Mengen gelten für <b>1 Portion</b>. Nährwerte, Allergene und Einkaufsliste rechnet die App selbst aus.</p></div>

  <div class="card pad">
    <label class="field"><span>Name</span><input type="text" data-ed="title" value="${esc(d.title)}" maxlength="80" placeholder="z. B. Omas Linseneintopf"></label>
    <label class="field"><span>Kurzbeschreibung</span><input type="text" data-ed="subtitle" value="${esc(d.subtitle)}" maxlength="140" placeholder="Optional"></label>
    <div class="field"><span>Mahlzeit</span><div class="tags">${SLOTS.map(m => `<button type="button" class="chip" data-action="edMeal" data-meal-ed="${m}" aria-pressed="${d.meals.includes(m)}">${SLOT_LABEL[m]}</button>`).join('')}</div></div>
    <div class="row" style="gap:10px;align-items:flex-start">${num('time.active', d.time.active, 'Aktiv', 'Min.')}${num('time.total', d.time.total, 'Gesamt', 'Min.')}${num('storage.fridgeDays', d.storage.fridgeDays, 'Hält gekühlt', 'Tage', 0, 7)}</div>
    <label class="setrow" style="padding:12px 0 0"><span><b>Einfrierbar</b></span><span class="switch"><input type="checkbox" data-ed-bool="storage.freeze" ${d.storage.freeze ? 'checked' : ''}><i></i></span></label>
    <label class="setrow" style="padding:12px 0 0;border:0"><span><b>Thermobox-tauglich</b><small>Eintopf, Curry, Suppe …</small></span><span class="switch"><input type="checkbox" data-ed-bool="storage.thermos" ${d.storage.thermos ? 'checked' : ''}><i></i></span></label>
  </div>

  <section class="section"><div class="shead"><h2>Zutaten</h2></div>
    <div class="card">${d.ingredients.length ? d.ingredients.map((i, n) => `<div class="setrow"><span class="grow"><b>${esc(F[i.k]?.name || i.k)}</b></span><span class="row" style="gap:6px"><input type="number" inputmode="decimal" min="0" step="any" data-ing-q="${n}" value="${i.q}" aria-label="Menge ${esc(F[i.k]?.name || '')}" style="width:84px;height:42px;border-radius:10px;border:1px solid var(--line);background:var(--card);padding:0 8px;text-align:right">${F[i.k]?.unit || ''}<button class="iconbtn" type="button" data-action="edDelIng" data-n="${n}" aria-label="Entfernen">×</button></span></div>`).join('') : '<p class="pad small muted">Noch keine Zutaten.</p>'}</div>
    <div class="search" style="margin-top:10px"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="ingSearch" type="search" placeholder="Zutat hinzufügen: Linsen, Feta …" value="${esc(ingQuery)}" autocomplete="off" aria-label="Zutat suchen"></div>
    <div id="ingResults" class="card" style="padding:0 8px">${ingResults()}</div>
    <div id="edPreview" style="margin-top:12px">${previewHTML()}</div>
  </section>

  <section class="section"><div class="shead"><h2>Zubereitung</h2></div>
    ${d.steps.map((s, n) => `<div class="card pad" style="margin-bottom:10px"><div class="row"><b class="grow">Schritt ${n + 1}</b><button class="iconbtn" type="button" data-action="edDelStep" data-n="${n}" aria-label="Schritt ${n + 1} entfernen">×</button></div>
      <label class="field"><span>Überschrift</span><input type="text" data-step="${n}" data-field="title" value="${esc(s.title)}" maxlength="80" placeholder="z. B. Zwiebeln anbraten"></label>
      <label class="field"><span>Was ist zu tun?</span><textarea data-step="${n}" data-field="text" rows="4" maxlength="1200" style="width:100%;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:10px 12px;font-size:16px">${esc(s.text)}</textarea></label>
      <div class="row" style="gap:10px"><label class="field" style="margin:0;width:140px"><span>Timer (Min.)</span><input type="number" min="0" max="600" inputmode="numeric" data-step="${n}" data-field="timer" value="${s.timer ? Math.round(s.timer / 60) : ''}" style="width:100%;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px"></label>
      <label class="field grow" style="margin:0"><span>Art (für die Zeichnung)</span><select data-step="${n}" data-field="action">${[['cut', 'Schneiden'], ['mix', 'Rühren'], ['pan', 'Braten'], ['pot', 'Kochen'], ['oven', 'Ofen'], ['blend', 'Pürieren'], ['jar', 'Thermobox'], ['plate', 'Anrichten']].map(([v, l]) => `<option value="${v}" ${s.action === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    </div>`).join('')}
    <button class="btn light block" type="button" data-action="edAddStep">+ Schritt hinzufügen</button>
  </section>

  <section class="section"><label class="field"><span>Tipps & Notizen (eine pro Zeile)</span><textarea data-ed="tips" rows="3" style="width:100%;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:10px 12px;font-size:16px">${esc((d.tips || []).join('\n'))}</textarea></label></section>

  <div class="btnrow section"><button class="btn orange" type="button" data-action="edSave">Speichern</button>${existing ? `<button class="btn light" type="button" data-action="edDelete" style="color:var(--danger)">Löschen</button>` : ''}</div>
  <p class="small muted" style="margin-top:10px">Bitte die Küchenregeln beachten: ohne Ei, Brot und Schwein; Edelstahl vorheizen, Wassertropfen-Test, dann Öl.</p>
  </div>`;
}

// Eingaben in den Entwurf übernehmen (ohne neu zu rendern)
export function editorInput(el) {
  if (!draft) return false;
  if (el.dataset.ed) {
    const path = el.dataset.ed.split('.');
    if (path[0] === 'tips') draft.tips = el.value.split('\n').map(s => s.trim()).filter(Boolean);
    else if (path.length === 2) draft[path[0]][path[1]] = el.type === 'number' ? Number(el.value) : el.value;
    else draft[path[0]] = el.value;
    return true;
  }
  if (el.dataset.edBool) { const [a, b] = el.dataset.edBool.split('.'); draft[a][b] = el.checked; return true; }
  if (el.dataset.ingQ !== undefined) { draft.ingredients[Number(el.dataset.ingQ)].q = Number(el.value); return 'preview'; }
  if (el.dataset.step !== undefined) {
    const s = draft.steps[Number(el.dataset.step)], f = el.dataset.field;
    if (f === 'timer') { const m = Number(el.value); if (m > 0) s.timer = Math.round(m * 60); else delete s.timer; }
    else s[f] = el.value;
    return true;
  }
  return false;
}
export function editorAction(action, b) {
  if (action === 'edAddIng') { draft.ingredients.push({ k: b.dataset.k, q: F[b.dataset.k].staple ? 5 : 100 }); ingQuery = ''; }
  if (action === 'edDelIng') draft.ingredients.splice(Number(b.dataset.n), 1);
  if (action === 'edAddStep') draft.steps.push({ title: '', text: '', action: 'mix', items: [] });
  if (action === 'edDelStep') draft.steps.splice(Number(b.dataset.n), 1);
  if (action === 'edMeal') { const m = b.dataset.mealEd; draft.meals = draft.meals.includes(m) ? draft.meals.filter(x => x !== m) : [...draft.meals, m]; if (!draft.meals.length) draft.meals = [m]; }
}
