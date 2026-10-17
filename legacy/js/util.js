export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export function fmt(n) {
  if (!Number.isFinite(n)) return '–';
  const digits = n < 10 && n % 1 ? 1 : 0;
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits });
}

// Mengen sinnvoll runden: Gewürze fein, große Mengen auf 5/10 g.
export function roundQty(q) {
  if (q >= 200) return Math.round(q / 10) * 10;
  if (q >= 40) return Math.round(q / 5) * 5;
  if (q >= 10) return Math.round(q);
  return Math.round(q * 2) / 2 || Math.round(q * 10) / 10;
}

// Für die Suche: Kleinschreibung, Umlaute und ß vereinheitlichen.
export const norm = s => String(s).toLocaleLowerCase('de-DE')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---- Datum (lokal, ohne Zeitzonenfallen) ----
export function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(s, n) { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); }
export function mondayOf(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); }
export const todayIso = () => iso(new Date());
export const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export function dayIndex(s) { return (parseIso(s).getDay() + 6) % 7; }
export function shortDate(s) { return parseIso(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }); }
export function longDate(s) { return parseIso(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }); }
export function weekLabel(monday) {
  const end = addDays(monday, 6);
  const a = parseIso(monday), b = parseIso(end);
  const same = a.getMonth() === b.getMonth();
  return `${a.getDate()}.${same ? '' : (a.getMonth() + 1) + '.'} – ${b.getDate()}.${b.getMonth() + 1}.`;
}
export function weekNumber(monday) {
  const d = parseIso(monday); d.setDate(d.getDate() + 3);
  const jan4 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
export function relDay(s) {
  const diff = Math.round((parseIso(s) - parseIso(todayIso())) / 864e5);
  return diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : diff === -1 ? 'Gestern' : DAYS[dayIndex(s)];
}

// ---- Kleinkram ----
let toastTimer;
export function toast(msg, action) {
  const el = $('#toast');
  clearTimeout(toastTimer);
  el.innerHTML = esc(msg) + (action ? ` <button type="button">${esc(action.label)}</button>` : '');
  el.hidden = false;
  if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : 3200);
}
export function buzz(p = 12) { try { navigator.vibrate?.(p); } catch { /* egal */ } }
export function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const icon = {
  chev: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  dots: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-8.6C1.2 8.1 3.3 4.5 6.8 4.5c2.1 0 3.4 1.2 5.2 3.1 1.8-1.9 3.1-3.1 5.2-3.1 3.5 0 5.6 3.6 4 6.9C19 15.6 12 20 12 20z" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4" stroke-linecap="round"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  share: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  print: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};
