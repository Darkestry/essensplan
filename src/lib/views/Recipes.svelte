<script lang="ts" module>
  import type { Recipe } from '../core/types.ts';
  import { db } from '../app.svelte.ts';
  import { norm, fuzzyMatch } from '../core/util.ts';

  // Such-Index pro Rezept (Titel, Untertitel, Herkunft, Zutaten, Tags) – nur neu, wenn sich das Rezept ändert.
  const searchIndex = new Map<string, { key: string; hay: string }>();
  function hayOf(r: Recipe): string {
    const key = `${r.ingredients.length}:${r.title}:${r.subtitle}`;
    const hit = searchIndex.get(r.id);
    if (hit && hit.key === key) return hit.hay;
    const hay = norm([r.title, r.subtitle, r.origin, ...r.ingredients.map(i => i.k), ...r.tags].join(' ') + ' ' + r.ingredients.map(i => db.F[i.k]?.name || '').join(' '));
    searchIndex.set(r.id, { key, hay });
    return hay;
  }
  export function matches(r: Recipe, words: string[]): boolean {
    if (!words.length) return true;
    const hay = hayOf(r);
    return fuzzyMatch(hay, words.join(' '));
  }
</script>

<script lang="ts">
  import { app } from '../app.svelte.ts';
  import { allowed, quickTime } from '../core/plan.ts';
  import type { Slot } from '../core/types.ts';
  import RecipeCard from '../components/RecipeCard.svelte';
  import Icon from '../components/Icon.svelte';
  import { recipeFilter, resetFilters, toggleFlag, type FlagId } from './recipeFilter.svelte.ts';

  interface Props { a?: string; b?: string }
  let {}: Props = $props();

  const MEALS: ['all' | Slot, string][] = [['all', 'Alle'], ['breakfast', 'Frühstück'], ['lunch', 'Mittag'], ['dinner', 'Abendessen'], ['snack', 'Snacks']];
  const FLAGS: [FlagId, string, (r: Recipe) => boolean][] = [
    ['fav', '♡ Favoriten', r => app.favorites.includes(r.id)],
    ['quick', 'Bis 20 Min.', r => quickTime(r) <= 20],
    ['veg', 'Vegetarisch', r => r.diet === 'veg' || r.diet === 'vegan'],
    ['vegan', 'Vegan', r => r.diet === 'vegan'],
    ['thermos', 'Thermobox', r => r.storage.thermos],
    ['prep', 'Zum Vorkochen', r => r.tags.includes('mealprep') || r.storage.freeze],
    ['protein', '30 g+ Eiweiß', r => r.nutrition.protein >= 30],
    ['oven', 'Ofen', r => r.tags.includes('ofen')],
    ['own', 'Eigene', r => !!r.custom],
    ['blocked', 'Ausgeblendet', r => app.blocked.includes(r.id)],
  ];

  const result = $derived.by(() => {
    const meal = recipeFilter.meal;
    let list = db.R.filter(r => meal === 'all' || r.meals.includes(meal));
    const hidden = list.filter(r => !allowed(r)).length;
    list = list.filter(allowed);
    for (const f of recipeFilter.flags) { const def = FLAGS.find(x => x[0] === f); if (def) list = list.filter(def[2]); }
    const words = norm(recipeFilter.q).split(/\s+/).filter(Boolean);
    if (words.length) list = list.filter(r => matches(r, words));
    return { list, hidden };
  });
</script>

<div class="view wide">
  <div class="vhead">
    <h1>Worauf hast du Lust?</h1>
    <p class="lead">{db.R.length} Rezepte für die Edelstahl-Küche, alle ohne Ei, Brot und Schwein.</p>
    <a class="btn light sm" href="#/editor/neu" style="margin-top:10px">Eigenes Rezept anlegen</a>
  </div>
  <div class="search">
    <Icon name="search" />
    <input type="search" placeholder="Suche: Linsen, Lachs, Curry …" bind:value={recipeFilter.q} autocomplete="off" aria-label="Rezepte durchsuchen" />
  </div>
  <div class="chips" role="group" aria-label="Mahlzeit">
    {#each MEALS as [k, l] (k)}
      <button type="button" class="chip" aria-pressed={recipeFilter.meal === k} onclick={() => (recipeFilter.meal = k)}>{l}</button>
    {/each}
  </div>
  <div class="chips" role="group" aria-label="Filter" style="margin-top:6px">
    {#each FLAGS as [k, l] (k)}
      <button type="button" class="chip" aria-pressed={recipeFilter.flags.includes(k)} onclick={() => toggleFlag(k)}>{l}</button>
    {/each}
  </div>
  <div>
    <p class="count" aria-live="polite">
      {result.list.length} {result.list.length === 1 ? 'Rezept' : 'Rezepte'}.{#if result.hidden} {result.hidden} weitere passen nicht zu deinen <a href="#/mehr">Ernährungseinstellungen</a>.{/if}
    </p>
    {#if result.list.length}
      <div class="rgrid">
        {#each result.list as r (r.id)}<RecipeCard recipe={r} />{/each}
      </div>
    {:else}
      <div class="card emptybox">
        <p>Dazu passt gerade kein Rezept. Probier ein anderes Wort oder setz die Filter zurück.</p>
        <button class="btn light" type="button" onclick={resetFilters}>Filter zurücksetzen</button>
      </div>
    {/if}
  </div>
</div>
