// Vorkochen: Einfrieren, Auftauen, Thermobox – automatisch aus dem Plan.
import { ctx } from './context.ts';
import type { Recipe, Slot, Task } from './types.ts';
import { cookPortions, entriesOf, getEntry, hasLeftoverFrom, portionsBase, recipeOf, week } from './plan.ts';
import { fmtQty } from './shopping.ts';
import { DAYS, DAYS_SHORT, addDays, dayIndex, diffDays, mondayOfIso, roundQty, weekDates } from './util.ts';

interface ComponentDef { food: string | null; label: string; days: number; how: string }
const COMPONENT: Record<string, ComponentDef> = {
  'cooked-potato': { food: 'potato', label: 'Pellkartoffeln vorkochen', days: 2, how: 'In der Schale 20–25 Min. knapp gar kochen, ausdampfen lassen, flach ausgebreitet rasch abkühlen, abgedeckt kühlen.' },
  'cooked-rice': { food: 'rice', label: 'Reis vorkochen', days: 1, how: 'Nach Packung garen, sofort flach auf einem Teller verteilen, innerhalb von 1 Stunde in den Kühlschrank. Gekühlt spätestens am nächsten Tag essen.' },
  'cooked-sweetpotato': { food: 'sweetpotato', label: 'Süßkartoffeln vorgaren', days: 2, how: 'Würfeln, 10–12 Min. in Salzwasser garen oder 25 Min. bei 200 °C rösten, rasch abkühlen.' },
  'cooked-lentils': { food: 'lentils', label: 'Linsen vorkochen', days: 2, how: 'In ungesalzenem Wasser bissfest garen, abgießen, abkühlen, erst beim Verwenden salzen.' },
  'cooked-quinoa': { food: 'quinoa', label: 'Quinoa vorkochen', days: 2, how: 'Gründlich abspülen, 1 : 2 mit Wasser 15 Min. garen, 5 Min. ziehen lassen, auflockern, rasch abkühlen.' },
  'roasted-veg': { food: null, label: 'Ofengemüse vorrösten', days: 2, how: 'Auf zwei Blechen bei 220 °C Ober-/Unterhitze (200 °C Umluft) rösten, damit es röstet statt dämpft; abkühlen, kühlen.' },
};
const SHELF = { fish: 1, mince: 1, meat: 2 };
const ORDER = { morgens: 0, mittags: 1, abends: 2 };
const isBoxLunch = (slot: Slot, r: Recipe) => slot === 'lunch' && r.meals[0] === 'lunch';

/** Aufgaben einer Woche (Datum kann vor dem Montag liegen) */
export function prepTasks(monday: string): Task[] {
  const { F, byId, state } = ctx;
  const s = state.settings;
  const tasks: Task[] = [];
  const shopDate = addDays(monday, s.shopDay);
  const names = (dates: string[]) => dates.map(d => DAYS_SHORT[dayIndex(d)]).join(', ');
  const portions = (n: number) => `${n} ${n === 1 ? 'Portion' : 'Portionen'}`;
  const entries = entriesOf(monday).filter((x): x is typeof x & { recipe: Recipe } => !!x.recipe && !('lo' in x.entry && x.entry.lo));

  // 1) Box-Mittag als Meal-Prep-Block
  const lunchGroups: Record<string, string[]> = {};
  for (const x of entries) if (isBoxLunch(x.slot, x.recipe)) (lunchGroups[x.recipe.id] ||= []).push(x.date);
  for (const [rid, dates] of Object.entries(lunchGroups)) {
    const r = byId.get(rid)!; dates.sort();
    let block: string[] = [];
    const flush = () => {
      if (!block.length) return;
      const cook = addDays(block[0], -1), keep = Math.max(1, r.storage.fridgeDays);
      const frozen = block.filter(d => diffDays(d, cook) > keep);
      tasks.push({ id: `batch-${rid}-${cook}`, date: cook, when: 'abends', kind: 'batch', recipe: rid,
        title: `${r.title} vorkochen: ${portions(block.length * portionsBase())}`,
        detail: `Für ${names(block)}. In flachen Dosen rasch abkühlen lassen und innerhalb von 2 Stunden in den Kühlschrank stellen.${frozen.length ? ` Portion${frozen.length > 1 ? 'en' : ''} für ${names(frozen)} direkt einfrieren.` : ''}`
          // Gekochter Reis hält gekühlt nur bis zum nächsten Tag (FSA/NHS)
          + (block.length > 1 && r.ingredients.some(i => ['rice', 'risotto'].includes(i.k)) ? ' Reis nur für den ersten Tag kühlen, die übrigen Portionen sofort einfrieren und am Vorabend auftauen.' : '') });
      for (const d of frozen) tasks.push({ id: `thaw-${rid}-${d}`, date: addDays(d, -1), when: 'abends', kind: 'thaw', recipe: rid, title: `${r.title}: Portion für morgen auftauen`, detail: 'Heute Abend aus dem Gefrierfach in den Kühlschrank stellen. Morgen sprudelnd aufkochen.' });
      block = [];
    };
    // Neu kochen, wenn die Haltbarkeit (auch mit Einfrieren) nicht reicht
    for (const d of dates) {
      if (block.length && diffDays(d, addDays(block[0], -1)) > (r.storage.freeze ? 6 : Math.max(1, r.storage.fridgeDays))) flush();
      block.push(d);
    }
    flush();
  }

  // 2) Thermobox-Morgen
  for (const date of weekDates(monday)) {
    const r = recipeOf(getEntry(date, 'lunch'));
    if (!r || !s.thermosDays.includes(dayIndex(date)) || !r.storage.thermos) continue;
    tasks.push({ id: `jar-${date}`, date, when: 'morgens', kind: 'jar', recipe: r.id, title: `${r.title} in die Thermobox`,
      detail: 'Box 5–10 Min. mit kochendem Wasser vorheizen. Die Portion mit 1–2 EL Wasser im Topf sprudelnd aufkochen. Wasser aus der Box gießen, randvoll füllen und gleich schließen. Toppings kommen in die Extra-Dose. Iss alles innerhalb von 4 Stunden.' });
  }

  // 3) Reste: Abendessen doppelt
  for (const x of entries) if (x.slot === 'dinner' && hasLeftoverFrom(x.date)) {
    tasks.push({ id: `lo-${x.date}`, date: x.date, when: 'abends', kind: 'leftover', recipe: x.recipe.id, title: `${x.recipe.title} doppelt kochen`,
      detail: `${portions(portionsBase())} vor dem Essen beiseitestellen, abkühlen lassen und kühlen. Das ist dein Mittagessen am ${DAYS[dayIndex(addDays(x.date, 1))]}.` });
  }

  // 4) Bausteine (Kartoffeln, Reis …) bündeln – nur wenn es morgens Zeit spart oder mehrere Gerichte bedient
  const comp: Record<string, { date: string; q: number; recipe: Recipe; slot: Slot }[]> = {};
  for (const x of entries) for (const c of x.recipe.components || []) {
    if (isBoxLunch(x.slot, x.recipe)) continue;
    (comp[c.key] ||= []).push({ date: x.date, q: c.q * cookPortions(x.date, x.slot), recipe: x.recipe, slot: x.slot });
  }
  for (const [key, uses] of Object.entries(comp)) {
    const def = COMPONENT[key]; if (!def) continue;
    uses.sort((a, b) => a.date.localeCompare(b.date));
    while (uses.length) {
      const cook = addDays(uses[0].date, -1);
      const group = uses.filter(u => diffDays(u.date, cook) <= def.days);
      uses.splice(0, group.length);
      if (!group.some(u => u.slot === 'breakfast') && group.length < 2) continue;
      const q = group.reduce((sum, u) => sum + u.q, 0);
      const qty = def.food ? fmtQty(def.food, q) : `${roundQty(q)} g Gemüse`;
      tasks.push({ id: `comp-${key}-${cook}`, date: cook, when: 'abends', kind: 'component',
        title: `${def.label}: ${qty}${['rice', 'lentils', 'quinoa'].includes(def.food || '') ? ' (Trockengewicht)' : ''}`,
        detail: `Für ${[...new Set(group.map(u => `${u.recipe.title} (${DAYS_SHORT[dayIndex(u.date)]})`))].join(', ')}. ${def.how}` });
    }
  }

  // 5) Fleisch & Fisch: nach dem Einkauf einfrieren, am Vorabend auftauen (gebündelt pro Tag)
  const thaw: Record<string, string[]> = {}, freeze: string[] = [];
  const batchCook: Record<string, string> = {};
  for (const t of tasks) if (t.kind === 'batch' && t.recipe && (!batchCook[t.recipe] || t.date < batchCook[t.recipe])) batchCook[t.recipe] = t.date;
  const seen = new Set<string>();
  for (const x of entries) {
    // Box-Gerichte: Fleisch wird beim Vorkochen verarbeitet
    const date = isBoxLunch(x.slot, x.recipe) ? batchCook[x.recipe.id] : x.date;
    if (!date || seen.has(x.recipe.id + date)) continue;
    seen.add(x.recipe.id + date);
    for (const i of x.recipe.ingredients) {
      const f = F[i.k];
      if (!f || (f.type !== 'meat' && f.type !== 'fish')) continue;
      const kind = f.type === 'fish' ? 'fish' : i.k === 'beefmince' ? 'mince' : 'meat';
      const name = f.name.split(',')[0].replace(/ \(.*\)$/, '');
      const tk = f.group === 'Tiefkühlfach';
      if (!tk && diffDays(date, shopDate) <= SHELF[kind]) continue;
      if (!tk) freeze.push(`${name} (${DAYS_SHORT[dayIndex(date)]})`);
      (thaw[addDays(date, -1)] ||= []).push(`${name} für ${x.recipe.title}`);
    }
  }
  if (freeze.length) tasks.push({ id: `freeze-${shopDate}`, date: shopDate, when: 'abends', kind: 'freeze', title: 'Nach dem Einkauf einfrieren',
    detail: `Bleibt frisch nicht bis zum Kochtag: ${[...new Set(freeze)].join(', ')}. Flach und portionsweise einfrieren und beschriften. Oder gleich TK-Ware kaufen.` });
  for (const [d, list] of Object.entries(thaw)) tasks.push({ id: `thaw-${d}`, date: d, when: 'abends', kind: 'thaw', title: 'Auftauen für morgen',
    detail: `${[...new Set(list)].join('; ')}. Abgedeckt auf einem Teller über Nacht in den Kühlschrank (unteres Fach), Auftauwasser weggießen.` });

  return tasks.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.when] - ORDER[b.when]);
}
/** Aufgaben eines Tages – inkl. Vorbereitungen für die Folgewoche */
export function tasksOn(date: string): Task[] {
  const m = mondayOfIso(date);
  const seen = new Set<string>();
  return [...prepTasks(m), ...prepTasks(addDays(m, 7))].filter(t => t.date === date && !seen.has(t.id) && (seen.add(t.id), true));
}
export const taskDone = (id: string, date: string): boolean => !!ctx.state.weeks[mondayOfIso(date)]?.done?.[id];
export function setTaskDone(id: string, date: string, v: boolean): void {
  const w = week(mondayOfIso(date), true)!;
  if (v) w.done[id] = true; else delete w.done[id];
}
