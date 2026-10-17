// Rezepte aufbereiten: Nährwerte, Allergene, Ernährungsform, Ziegenmilch-Variante, eigene Rezepte.
import type { Diet, Foods, Nutrition, Recipe, RecipeSource, Slot, Step } from './types.ts';

export const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const SLOT_LABEL: Record<Slot, string> = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abendessen', snack: 'Snack' };
export const ALLERGENS: Record<string, string> = {
  gluten: 'Gluten', milch: 'Milch', schalenfruechte: 'Schalenfrüchte (Nüsse)', erdnuss: 'Erdnuss', sesam: 'Sesam', soja: 'Soja',
  fisch: 'Fisch', krebstiere: 'Krebstiere', sellerie: 'Sellerie', senf: 'Senf', sulfite: 'Sulfite', lupine: 'Lupine', weichtiere: 'Weichtiere', ei: 'Ei',
};
export const DIET_LABEL: Record<Diet, string> = { meat: 'mit Fleisch', fish: 'mit Fisch', veg: 'vegetarisch', vegan: 'vegan' };
export const GROUP_ORDER = ['Obst & Gemüse', 'Kühlregal', 'Fleisch & Fisch', 'Tiefkühlfach', 'Trockenwaren', 'Dosen & Gläser', 'Nüsse & Kerne', 'Vorrat & Gewürze'];

const KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
const zero = (): Nutrition => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
function round(n: Nutrition): Nutrition {
  for (const k of KEYS) n[k] = k === 'kcal' ? Math.round(n[k]) : Math.round(n[k] * 10) / 10;
  return n;
}
export function nutritionOf(ingredients: { k: string; q: number }[], F: Foods): Nutrition {
  const n = zero();
  for (const i of ingredients) { const f = F[i.k]; if (!f) continue; for (const k of KEYS) n[k] += (f[k] || 0) * i.q / 100; }
  return round(n);
}

// ---------- Ziegen-/Schafsmilch ----------
const B = '(?<![A-Za-zÄÖÜäöüß-])', E = '(?![a-zäöüß])';
const GOAT_TEXT: [RegExp, string][] = [
  [new RegExp(B + 'Frischkäse' + E, 'g'), 'Ziegenfrischkäse'],
  [/Crème fraîche/g, 'Ziegenfrischkäse'],
  [new RegExp(B + 'Schmand' + E, 'g'), 'Ziegenfrischkäse'],
  [new RegExp('(?<!wie )' + B + '(Schlag)?[Ss]ahne' + E, 'g'), 'Ziegenfrischkäse'], // „fließt wie Sahne“ bleibt
  [new RegExp(B + '(Mager)?[Qq]uark' + E, 'g'), 'Ziegenquark'],
  [new RegExp(B + '(griechische[nmrs]? )?Joghurt' + E, 'g'), 'Ziegenjoghurt'],
  [new RegExp(B + '(Voll)?[Mm]ilch' + E, 'g'), 'Ziegenmilch'],
  [new RegExp(B + 'Butter' + E, 'g'), 'Ziegenbutter'],
  [new RegExp(B + '(Bergkäse|Emmentaler|Parmesan|Grana Padano)' + E, 'g'), 'Ziegen-Hartkäse'],
  [new RegExp(B + 'Mozzarella' + E, 'g'), 'Ziegenkäse'],
  [new RegExp(B + 'Hirtenkäse' + E, 'g'), 'Feta'],
];
export const goatText = (s: string): string => GOAT_TEXT.reduce((t, [re, to]) => t.replace(re, to), s);

/** Rezept aufbereiten (milk = gewählte Milchart) */
export function prepareRecipe(src: RecipeSource, F: Foods, milk: 'cow' | 'goat'): Recipe {
  const allergens = new Set<string>(), types = new Set<string>();
  for (const i of src.ingredients) { const f = F[i.k]; if (!f) continue; f.allergens.forEach(a => allergens.add(a)); types.add(f.type); }
  const diet: Diet = types.has('meat') ? 'meat' : types.has('fish') ? 'fish' : (types.has('dairy') || types.has('animal')) ? 'veg' : 'vegan';
  const swapKeys = [...new Set(src.ingredients.filter(i => F[i.k]?.goat).map(i => i.k))];
  const base = { ...src, allergens: [...allergens].sort(), diet, source: src };
  if (milk !== 'goat' || !swapKeys.length) return { ...base, nutrition: nutritionOf(src.ingredients, F), swaps: [] };
  const ingredients = src.ingredients.map(i => F[i.k]?.goat ? { ...i, k: F[i.k].goat!, ...(i.note ? { note: goatText(i.note) } : {}) } : i);
  const steps: Step[] = src.steps.map(s => ({ ...s, title: goatText(s.title), text: goatText(s.text), items: (s.items || []).map(k => F[k]?.goat || k) }));
  return {
    ...base,
    subtitle: goatText(src.subtitle),
    ingredients,
    steps,
    // Kuhmilch-Vergleichstipps („X statt Y“, die nach dem Tausch „X statt X“ hießen) entfallen
    tips: (src.tips || []).map(goatText).filter(t => !/(\S+) statt \1\b/.test(t)),
    nutrition: nutritionOf(ingredients, F),
    swaps: swapKeys.map(k => ({ from: k, to: F[k].goat! })),
  };
}
export function buildRecipes(base: RecipeSource[], custom: RecipeSource[], F: Foods, milk: 'cow' | 'goat'): Recipe[] {
  return [...base, ...custom].map(r => prepareRecipe(r, F, milk));
}

// ---------- Eigene Rezepte ----------
const MEAL_ART: Record<Slot, { dish: RecipeSource['art']['dish']; type: string }> = {
  breakfast: { dish: 'plate', type: 'slices' }, lunch: { dish: 'jar', type: 'stew' }, dinner: { dish: 'plate', type: 'roastveg' }, snack: { dish: 'bowl', type: 'bites' },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
export function sanitizeCustom(list: unknown, F: Foods): RecipeSource[] {
  const out: RecipeSource[] = [];
  for (const c of (Array.isArray(list) ? list : []) as Loose[]) {
    if (!c || typeof c.id !== 'string' || !/^u\d{1,4}$/.test(c.id) || typeof c.title !== 'string' || !c.title.trim()) continue;
    const ingredients = ((c.ingredients || []) as Loose[]).filter(i => F[i?.k] && Number.isFinite(i.q) && i.q > 0)
      .map(i => ({ k: String(i.k), q: Number(i.q), ...(i.note ? { note: String(i.note).slice(0, 80) } : {}), ...(i.side ? { side: true } : {}) }));
    if (!ingredients.length) continue;
    const meals = ((c.meals || []) as Loose[]).filter((m): m is Slot => SLOTS.includes(m));
    const main = meals[0] || 'dinner';
    const num = (v: unknown, d: number, max: number) => Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(Number(v), max) : d;
    const tools = ((c.tools || []) as Loose[]).map(String).filter(Boolean).slice(0, 10);
    out.push({
      id: c.id, custom: true, ...(typeof c.basedOn === 'string' ? { basedOn: c.basedOn } : {}),
      meals: meals.length ? meals : ['dinner'], title: c.title.trim().slice(0, 80), subtitle: String(c.subtitle || '').slice(0, 140), origin: 'Eigenes Rezept',
      time: { active: num(c.time?.active, 15, 600), total: num(c.time?.total, 30, 900), quick: c.time?.quick ? num(c.time.quick, 0, 900) : null },
      difficulty: [1, 2, 3].includes(c.difficulty) ? c.difficulty : 1,
      tags: ((c.tags || []) as Loose[]).filter(t => typeof t === 'string').slice(0, 8),
      storage: { fridgeDays: num(c.storage?.fridgeDays, 0, 7), freeze: !!c.storage?.freeze, thermos: !!c.storage?.thermos, note: String(c.storage?.note || '').slice(0, 200) },
      components: [], tools: tools.length ? tools : ['Edelstahlpfanne oder -topf'],
      ingredients,
      steps: ((c.steps || []) as Loose[]).filter(st => st && st.text).map(st => ({
        title: String(st.title || '').slice(0, 80) || 'Schritt', text: String(st.text).slice(0, 1200),
        action: typeof st.action === 'string' ? st.action : 'mix', items: ((st.items || []) as Loose[]).filter(k => F[k]),
        ...(Number.isInteger(st.timer) && st.timer >= 10 ? { timer: st.timer } : {}),
      })),
      tips: ((c.tips || []) as Loose[]).map(String).filter(Boolean).slice(0, 6),
      art: c.art && c.art.base ? c.art : { dish: MEAL_ART[main].dish, base: { type: MEAL_ART[main].type, color: '#c9a46a' } },
    });
  }
  return out;
}

// ---------- Gargewicht (für die Thermobox) ----------
// Massenbilanz: alle Zutaten inkl. Flüssigkeiten
//  + Wasser, das separat gekochtes Getreide aufnimmt (soweit nicht schon als Wasser im Rezept)
//  − Verdampfung beim Köcheln − Garverlust bei Fleisch/Fisch/Gemüse.
// Zutaten mit `side: true` kommen in die Extra-Dose und zählen nicht zur Box. Genauigkeit etwa ±15 %.
/** Randvoll gefüllt passen etwa 92 % des Volumens als Essen hinein (Dichte ≈ 1 g/ml). */
export const boxCapacity = (ml: number): number => Math.round(ml * 0.92);
const ABSORB: Record<string, number> = { rice: 1.9, risotto: 2.2, bulgur: 1.5, couscous: 1.3, quinoa: 1.8, pasta: 1.3, redlentils: 1.6, lentils: 1.6, oats: 1.5, polenta: 3, semolina: 2 };
const LIQUIDS = new Set(['water', 'passata', 'cannedtomato', 'coconut', 'milk', 'cream', 'goatmilk']);
export function cookedWeight(ingredients: { k: string; q: number; side?: boolean }[], F: Foods): number {
  let mass = 0, absorb = 0, water = 0, liquids = 0, loss = 0;
  for (const i of ingredients) {
    const f = F[i.k];
    if (!f || i.side) continue;
    mass += i.q;
    if (i.k === 'water') water += i.q;
    if (LIQUIDS.has(i.k)) liquids += i.q;
    if (ABSORB[i.k]) absorb += i.q * ABSORB[i.k];
    if (f.type === 'meat' || f.type === 'fish') loss += i.q * 0.25;
    else if (f.group === 'Obst & Gemüse' || f.group === 'Tiefkühlfach') loss += i.q * 0.1;
  }
  const extra = Math.max(0, absorb - water * 0.8);
  return Math.round(mass + extra - liquids * 0.15 - loss);
}
