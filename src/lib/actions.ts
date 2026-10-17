// Häufige Aktionen mit Rückmeldung (Toast, Rückgängig, Bestätigung) – von mehreren Ansichten genutzt.
import { app, db, importState } from './app.svelte.ts';
import { autofill, clearWeek, copyWeek, filled, getEntry, setEntry, toggleIn } from './core/plan.ts';
import { shoppingText } from './core/shopping.ts';
import type { Entry, Slot } from './core/types.ts';
import { SLOT_LABEL } from './core/recipes.ts';
import { DAYS, addDays, dayIndex, mondayOfIso, todayIso, weekDates } from './core/util.ts';
import { buzz, openPicker, toast } from './ui.svelte.ts';
import { go } from './router.svelte.ts';
import Confirm from './pickers/Confirm.svelte';

export function confirm(title: string, text: string, ok: string, onok: () => void): void {
  openPicker(Confirm, { title, text, ok, onok });
}

export function planEntry(date: string, slot: Slot, entry: Entry | null, message?: string): void {
  const prev = getEntry(date, slot);
  setEntry(date, slot, entry);
  buzz();
  if (message) toast(message, { label: 'Rückgängig', run: () => setEntry(date, slot, prev) });
}
export function planRecipe(date: string, slot: Slot, id: string): void {
  const r = db.byId.get(id);
  if (!app.settings.slots[slot]) app.settings.slots[slot] = true;
  planEntry(date, slot, { r: id }, `${r?.title ?? 'Rezept'} eingeplant: ${DAYS[dayIndex(date)]}, ${SLOT_LABEL[slot]}`);
}
export function autofillWeek(monday: string): void {
  const n = autofill(monday);
  toast(n ? `${n} Mahlzeiten eingeplant. Über ⋯ kannst du tauschen.` : 'Deine Woche ist schon voll geplant.');
}
export function replanWeek(monday: string): void {
  confirm('Woche neu planen lassen?', 'Alle Mahlzeiten dieser Woche werden ersetzt.', 'Neu planen lassen', () => { autofill(monday, { overwrite: true }); toast('Woche neu geplant'); });
}
export function copyPrevWeek(monday: string): void {
  const doIt = () => { copyWeek(addDays(monday, -7), monday); toast('Vorwoche übernommen'); };
  if (weekDates(monday).some(d => filled(d))) confirm('Vorwoche übernehmen?', 'Deine Einträge dieser Woche werden ersetzt.', 'Vorwoche übernehmen', doIt);
  else doIt();
}
export function emptyWeek(monday: string): void {
  const backup = app.weeks[monday] ? JSON.parse(JSON.stringify(app.weeks[monday])) : undefined;
  confirm('Woche leeren?', 'Alle Mahlzeiten und Häkchen dieser Woche werden entfernt.', 'Woche leeren', () => {
    clearWeek(monday);
    toast('Woche geleert', { label: 'Rückgängig', run: () => { if (backup) app.weeks[monday] = backup; } });
  });
}
export function toggleFavorite(id: string): void {
  toggleIn('favorites', id); buzz();
  toast(app.favorites.includes(id) ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
}
export function toggleBlocked(id: string): void {
  toggleIn('blocked', id);
  toast(app.blocked.includes(id) ? 'Wird nicht mehr vorgeschlagen' : 'Wird wieder vorgeschlagen');
}

export async function shareList(monday: string): Promise<void> {
  const text = shoppingText(monday);
  if (navigator.share) { try { await navigator.share({ title: 'Einkaufsliste', text }); } catch { /* abgebrochen */ } return; }
  try { await navigator.clipboard.writeText(text); toast('Liste kopiert. Du kannst sie jetzt in eine Nachricht einfügen.'); } catch { toast('Die Liste ließ sich nicht kopieren. Du kannst sie stattdessen drucken.'); }
}
export function exportState(): void {
  const blob = new Blob([JSON.stringify({ ...(snapshot() as object), exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `essensplan-${todayIso()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const snapshot = (): unknown => JSON.parse(JSON.stringify(app));
export async function importFile(file: File | undefined): Promise<void> {
  if (!file) return;
  if (file.size > 2_000_000) { toast('Die Datei ist zu groß. Wähle eine Sicherung, die du in dieser App erstellt hast.'); return; }
  try { importState(JSON.parse(await file.text())); toast('Plan geladen'); }
  catch { toast('Diese Datei lässt sich nicht laden. Wähle eine Sicherung, die du in dieser App erstellt hast.'); }
}
export const currentMonday = (date?: string): string => mondayOfIso(date ?? todayIso());
export { go };
