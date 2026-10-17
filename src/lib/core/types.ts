export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Diet = 'meat' | 'fish' | 'veg' | 'vegan';
export type FoodType = 'plant' | 'dairy' | 'meat' | 'fish' | 'animal';

export interface Food {
  name: string;
  group: string;
  unit: 'g' | 'ml';
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  type: FoodType;
  staple?: boolean;
  pack: number;
  allergens: string[];
  hint: string;
  /** Ersatz-Schlüssel für Ziegen-/Schafsmilchprodukte */
  goat?: string;
}
export type Foods = Record<string, Food>;

export interface Nutrition { kcal: number; protein: number; carbs: number; fat: number; fiber: number }
export interface Ingredient { k: string; q: number; note?: string; /** kommt in die Extra-Dose (Topping) */ side?: boolean }
export type StepAction = 'cut' | 'grate' | 'squeeze' | 'shape' | 'mix' | 'mash' | 'blend' | 'pan' | 'flip' | 'toast' | 'pot' | 'oven' | 'deglaze' | 'jar' | 'plate';
export interface Step { title: string; text: string; action: StepAction | string; items: string[]; timer?: number }
export interface ArtPart { type: string; color: string }
export interface Art {
  dish: 'plate' | 'bowl' | 'jar' | 'pan' | 'tray';
  base: ArtPart;
  side?: ArtPart;
  sauce?: { style: 'dollop' | 'drizzle' | 'pool'; color: string };
  garnish?: string[];
}

/** Rezept wie in data/recipes-*.json bzw. als eigenes Rezept gespeichert */
export interface RecipeSource {
  id: string;
  meals: Slot[];
  title: string;
  subtitle: string;
  origin: string;
  time: { active: number; total: number; quick: number | null };
  difficulty: 1 | 2 | 3;
  tags: string[];
  storage: { fridgeDays: number; freeze: boolean; thermos: boolean; note: string };
  components?: { key: string; q: number }[];
  tools: string[];
  ingredients: Ingredient[];
  steps: Step[];
  tips: string[];
  art: Art;
  custom?: boolean;
  basedOn?: string;
}

/** Aufbereitetes Rezept (Milchart angewendet, Nährwerte berechnet) */
export interface Recipe extends RecipeSource {
  nutrition: Nutrition;
  allergens: string[];
  diet: Diet;
  swaps: { from: string; to: string }[];
  /** unveränderte Kuhmilch-Fassung (für Editor-Kopien) */
  source: RecipeSource;
}

export type Entry = { r: string; lo?: 1 } | { t: string };
export type Day = Record<Slot, Entry | null>;
export interface Week {
  days: Day[];
  have: Record<string, number>;
  done: Record<string, true>;
  boost: Record<string, string[]>;
}
export interface Settings {
  goalKcal: number;
  goalProtein: number;
  pantry: string[];
  milk: 'cow' | 'goat';
  persons: number;
  appetite: number;
  slots: Record<Slot, boolean>;
  thermosDays: number[];
  /** Fassungsvermögen der Thermobox in ml */
  boxMl: number;
  diet: 'all' | 'pesc' | 'veg' | 'vegan';
  exclude: string[];
  theme: 'auto' | 'light' | 'dark';
  shopDay: number;
}
export interface AppState {
  version: 3;
  settings: Settings;
  weeks: Record<string, Week>;
  favorites: string[];
  blocked: string[];
  weights: { d: string; kg: number }[];
  custom: RecipeSource[];
}

export interface Task {
  id: string;
  date: string;
  when: 'morgens' | 'mittags' | 'abends';
  kind: 'batch' | 'thaw' | 'jar' | 'leftover' | 'component' | 'freeze';
  recipe?: string;
  title: string;
  detail: string;
}
export interface ShopItem { k: string; q: number; recipes: Set<string>; days: Set<number>; pantry: boolean }
