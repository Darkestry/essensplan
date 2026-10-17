// Filterzustand des Rezeptbuchs – bleibt beim Zurücknavigieren erhalten.
import type { Slot } from '../core/types.ts';

export type FlagId = 'fav' | 'quick' | 'veg' | 'vegan' | 'thermos' | 'prep' | 'protein' | 'oven' | 'own' | 'blocked';

export const recipeFilter = $state<{ q: string; meal: 'all' | Slot; flags: FlagId[] }>({ q: '', meal: 'all', flags: [] });

export function toggleFlag(f: FlagId): void {
  recipeFilter.flags = recipeFilter.flags.includes(f) ? recipeFilter.flags.filter(x => x !== f) : [...recipeFilter.flags, f];
}
export function resetFilters(): void {
  recipeFilter.q = ''; recipeFilter.meal = 'all'; recipeFilter.flags = [];
}
