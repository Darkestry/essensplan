// Kleine Anzeige-Helfer für Rezeptliste, Rezeptansicht und Kochmodus.
import { db } from '../app.svelte.ts';
import { quickTime } from '../core/plan.ts';
import { SLOT_LABEL } from '../core/recipes.ts';
import type { Recipe, Slot } from '../core/types.ts';
import { fmt, fmtMinutes, roundQty } from '../core/util.ts';

export const mealName = (m: Slot | string): string => SLOT_LABEL[m as Slot] || m;
export const shortTime = (r: Recipe): string => fmtMinutes(quickTime(r));
export const timerLabel = (s: number): string => (s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} Min.` : `${s / 60} Min.`);

/** Menge küchentauglich: Gewürze in TL/Prise, Öl in EL, große Mengen in kg/l */
export function qty(k: string, q: number): string {
  const f = db.F[k];
  if (!f) return fmt(roundQty(q));
  if (f.staple && q < 5 && f.unit === 'g') {
    if (k === 'salt') return `${fmt(roundQty(q))} g`;
    const tsp = q / (k === 'olive' || k === 'rapeseed' ? 4.5 : 2.5);
    return tsp < 0.4 ? 'Prise' : `${fmt(Math.round(tsp * 2) / 2)} TL`;
  }
  if ((k === 'olive' || k === 'rapeseed' || k === 'sesameoil') && q >= 5) return `${fmt(Math.round(q / 12 * 2) / 2)} EL`;
  if (f.unit === 'g' && q >= 1000) return `${fmt(roundQty(q) / 1000)} kg`;
  if (f.unit === 'ml' && q >= 1000) return `${fmt(roundQty(q) / 1000)} l`;
  return `${fmt(roundQty(q))} ${f.unit}`;
}
