// Titel + Unterzeile eines Plan-Eintrags (für Heute und Wochenplan)
import { app } from '../app.svelte.ts';
import { hasLeftoverFrom, quickTime, recipeOf } from '../core/plan.ts';
import type { Entry, Slot } from '../core/types.ts';
import { dayIndex, fmtMinutes } from '../core/util.ts';

export interface EntryInfo { title: string; parts: { text: string; lo?: boolean }[] }
export function entryInfo(date: string, slot: Slot, e: Entry | null): EntryInfo {
  if (!e) return { title: '', parts: [] };
  if ('t' in e) return { title: e.t, parts: [{ text: 'Eigener Eintrag' }] };
  const r = recipeOf(e);
  if (!r) return { title: '–', parts: [] };
  const parts: EntryInfo['parts'] = [];
  parts.push(e.lo ? { text: 'Rest von gestern', lo: true } : { text: fmtMinutes(quickTime(r)) });
  parts.push({ text: `${Math.round(r.nutrition.kcal * app.settings.appetite)} kcal` });
  if (slot === 'lunch' && app.settings.thermosDays.includes(dayIndex(date)) && r.storage.thermos) parts.push({ text: 'Thermobox' });
  if (slot === 'dinner' && hasLeftoverFrom(date)) parts.push({ text: 'Auch für morgen Mittag', lo: true });
  return { title: r.title, parts };
}
