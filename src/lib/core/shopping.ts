// Einkaufsliste, Packungsgrößen, Reste-Verwertung, Teilen-Text.
import { ctx } from './context.ts';
import type { Recipe, ShopItem } from './types.ts';
import { GROUP_ORDER } from './recipes.ts';
import { allowed, boostsOn, boosterItems, cookPortions, entriesOf, isBlocked, portionsBase, week } from './plan.ts';
import { addDays, dayIndex, roundQty, shortDate, weekDates } from './util.ts';

export function shopping(monday: string): ShopItem[] {
  const { F, state } = ctx;
  const items: Record<string, ShopItem> = {};
  const get = (k: string) => (items[k] ||= { k, q: 0, recipes: new Set(), days: new Set(), pantry: false });
  for (const { date, slot, recipe } of entriesOf(monday)) {
    if (!recipe) continue;
    const portions = cookPortions(date, slot);
    if (!portions) continue;
    for (const i of recipe.ingredients) {
      if (i.k === 'water' || !F[i.k]) continue;
      const it = get(i.k);
      it.q += i.q * portions; it.recipes.add(recipe.id); it.days.add(dayIndex(date));
    }
  }
  // Booster (pro Person) gehören mit in den Korb
  for (const date of weekDates(monday)) for (const b of boostsOn(date)) for (const [k, q] of boosterItems(b)) {
    const it = get(k);
    it.q += q * state.settings.persons; it.recipes.add('extra'); it.days.add(dayIndex(date));
  }
  return Object.values(items).map(i => ({ ...i, q: roundQty(i.q), pantry: state.settings.pantry.includes(i.k) }));
}
export const isDone = (monday: string, i: ShopItem): boolean => (week(monday)?.have[i.k] || 0) >= i.q - 0.01;
export function openItems(monday: string): number {
  if (!week(monday)) return 0;
  return shopping(monday).filter(i => !ctx.F[i.k].staple && !i.pantry && !isDone(monday, i)).length;
}
export function fmtQty(k: string, q: number): string {
  const f = ctx.F[k];
  if (f.unit === 'g' && q >= 1000) return `${(roundQty(q) / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg`;
  if (f.unit === 'ml' && q >= 1000) return `${(roundQty(q) / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} l`;
  return `${roundQty(q).toLocaleString('de-DE')} ${f.unit}`;
}
export function packHint(k: string, q: number): string {
  const f = ctx.F[k];
  if (!f.pack || q <= 0) return '';
  const n = Math.ceil((q - 0.001) / f.pack);
  const unitWord = f.group === 'Dosen & Gläser' ? (n === 1 ? 'Dose/Glas' : 'Dosen/Gläser') : (n === 1 ? 'Packung' : 'Packungen');
  const rest = n * f.pack - q;
  return `${n} ${unitWord} à ${f.pack} ${f.unit}${rest >= f.pack * 0.25 ? ` · Rest ${roundQty(rest)} ${f.unit}` : ''}`;
}
export function togglePantry(k: string): void {
  const s = ctx.state.settings;
  s.pantry = s.pantry.includes(k) ? s.pantry.filter(x => x !== k) : [...s.pantry, k];
}
export function toggleHave(monday: string, k: string, on: boolean): void {
  const w = week(monday, true)!;
  const item = shopping(monday).find(i => i.k === k);
  if (on && item) w.have[k] = item.q; else delete w.have[k];
}

// Hält geöffnet lange – kein Reste-Hinweis nötig
const LONG_KEEP = new Set(['butter', 'goatbutter', 'cheese', 'goatcheese', 'parmesan', 'carrot', 'potato', 'floury', 'paste']);
const PERISHABLE_GROUPS = ['Kühlregal', 'Dosen & Gläser', 'Obst & Gemüse', 'Fleisch & Fisch'];
/** Reste aus Packungen nach dieser Woche + Rezepte, die sie verwerten */
export function packRests(monday: string, list: ShopItem[] = shopping(monday)): { k: string; rest: number; recipes: Recipe[] }[] {
  const { F, R } = ctx;
  const used = new Set(entriesOf(monday).map(x => x.recipe?.id).filter(Boolean));
  return list.filter(i => F[i.k].pack && !F[i.k].staple && !LONG_KEEP.has(i.k) && PERISHABLE_GROUPS.includes(F[i.k].group))
    .map(i => ({ k: i.k, rest: roundQty(Math.ceil(i.q / F[i.k].pack - 1e-6) * F[i.k].pack - i.q) }))
    .filter(x => x.rest >= F[x.k].pack * 0.25)
    .map(x => {
      const dist = (r: Recipe) => Math.abs(r.ingredients.find(i => i.k === x.k)!.q * portionsBase() - x.rest);
      const recipes = R.filter(r => !used.has(r.id) && allowed(r) && !isBlocked(r.id) && r.ingredients.some(i => i.k === x.k))
        .sort((a, b) => dist(a) - dist(b)).slice(0, 3);
      return { ...x, recipes };
    });
}
export function shoppingText(monday: string): string {
  const { F } = ctx;
  const list = shopping(monday), have = week(monday)?.have || {};
  const lines = [`Einkauf ${shortDate(monday)}–${shortDate(addDays(monday, 6))}`];
  for (const g of GROUP_ORDER) {
    const items = list.filter(i => F[i.k].group === g && !F[i.k].staple && !i.pantry && !((have[i.k] || 0) >= i.q - 0.01));
    if (!items.length) continue;
    lines.push('', g.toUpperCase());
    for (const i of items) lines.push(`☐ ${fmtQty(i.k, i.q - (have[i.k] || 0))} ${F[i.k].name}`);
  }
  const staples = list.filter(i => F[i.k].staple && !i.pantry && !have[i.k]);
  if (staples.length) lines.push('', 'VORRAT PRÜFEN', staples.map(i => F[i.k].name).join(', '));
  return lines.join('\n');
}
