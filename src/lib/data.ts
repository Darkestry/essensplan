// Rezept- und Zutatendaten werden beim Build gebündelt (eigener, cachebarer Chunk).
import type { Foods, RecipeSource } from './core/types.ts';
import foodsJson from '../../data/foods.json';

const extraFoods = import.meta.glob<Foods>('../../data/foods-new-*.json', { eager: true, import: 'default' });
const recipeFiles = import.meta.glob<RecipeSource[]>('../../data/recipes-*.json', { eager: true, import: 'default' });

const foods = { ...(foodsJson as unknown as Foods) };
delete (foods as Record<string, unknown>)._doc;
for (const extra of Object.values(extraFoods)) for (const [k, v] of Object.entries(extra)) if (k !== '_doc' && !foods[k]) foods[k] = v;

const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 } as const;
export const F: Foods = foods;
export const BASE: RecipeSource[] = Object.values(recipeFiles).flat()
  .sort((a, b) => (MEAL_ORDER[a.meals[0]] - MEAL_ORDER[b.meals[0]]) || a.id.localeCompare(b.id));
export const BASE_IDS = new Set(BASE.map(r => r.id));
