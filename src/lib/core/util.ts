// Reine Hilfsfunktionen (ohne DOM) – auch in Node-Tests nutzbar.

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const digits = n < 10 && n % 1 ? 1 : 0;
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits });
}
/** Mengen sinnvoll runden: Gewürze fein, große Mengen auf 5/10 g. */
export function roundQty(q: number): number {
  if (q >= 200) return Math.round(q / 10) * 10;
  if (q >= 40) return Math.round(q / 5) * 5;
  if (q >= 10) return Math.round(q);
  return Math.round(q * 2) / 2 || Math.round(q * 10) / 10;
}
/** Für die Suche: Kleinschreibung, Umlaute und ß vereinheitlichen. */
export const norm = (s: string): string => String(s).toLocaleLowerCase('de-DE')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---- Datum (lokal, ohne Zeitzonenfallen) ----
export const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function parseIso(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(s: string, n: number): string { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); }
export function mondayOf(d: Date = new Date()): string { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); }
export const mondayOfIso = (s: string): string => mondayOf(parseIso(s));
export const todayIso = (): string => iso(new Date());
export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parseIso(s)) === s;
export const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const dayIndex = (s: string): number => (parseIso(s).getDay() + 6) % 7;
export const diffDays = (a: string, b: string): number => Math.round((parseIso(a).getTime() - parseIso(b).getTime()) / 864e5);
export const shortDate = (s: string): string => parseIso(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
export function weekLabel(monday: string): string {
  const a = parseIso(monday), b = parseIso(addDays(monday, 6));
  const same = a.getMonth() === b.getMonth();
  return `${a.getDate()}.${same ? '' : (a.getMonth() + 1) + '.'} – ${b.getDate()}.${b.getMonth() + 1}.`;
}
export function weekNumber(monday: string): number {
  const d = parseIso(monday); d.setDate(d.getDate() + 3);
  const jan4 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
export function relDay(s: string): string {
  const diff = diffDays(s, todayIso());
  return diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : diff === -1 ? 'Gestern' : DAYS[dayIndex(s)];
}
export const weekDates = (monday: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** Deterministischer Zufall (für Illustrationen) */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

/** Höchstens ein Buchstabe Unterschied (Einfügen, Löschen, Ersetzen)? */
function within1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
/**
 * Suche mit Tippfehler-Toleranz: jedes Suchwort muss im (normalisierten) Text vorkommen –
 * ab 5 Buchstaben genügt eine Stelle mit einem Buchstaben Abweichung („kartofel“ → „Bratkartoffeln“).
 */
export function fuzzyMatch(hay: string, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  let tokens: string[] | null = null;
  return words.every(w => {
    if (hay.includes(w)) return true;
    if (w.length < 5) return false;
    tokens ??= hay.split(/[^a-z0-9]+/).filter(t => t.length >= 4);
    // auch mitten in zusammengesetzten Wörtern (Brat|kartoffeln)
    return tokens.some(t => { for (let i = 0; i + w.length - 1 <= t.length; i++) for (const len of [w.length, w.length + 1, w.length - 1]) if (within1(t.substr(i, len), w)) return true; return false; });
  });
}

/** Dauer lesbar: „25 Min.“, „1 Std. 20 Min.“, ab 6 Stunden „über Nacht“ */
export function fmtMinutes(min: number): string {
  if (min >= 360) return 'über Nacht';
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
}
/** Anzeigenamen für Rezept-Tags */
export const TAG_LABEL: Record<string, string> = {
  schnell: 'schnell', mealprep: 'zum Vorkochen', thermobox: 'Thermobox', ofen: 'aus dem Ofen', onepot: 'ein Topf',
  einfrieren: 'einfrierbar', proteinreich: 'viel Eiweiß', wochenende: 'fürs Wochenende',
};
