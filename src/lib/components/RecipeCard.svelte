<script lang="ts">
  import type { Recipe } from '../core/types.ts';
  import { app } from '../app.svelte.ts';
  import { toggleFavorite } from '../actions.ts';
  import { mealName, shortTime } from '../views/recipeFormat.ts';
  import Thumb from './Thumb.svelte';
  import Icon from './Icon.svelte';

  let { recipe: r }: { recipe: Recipe } = $props();
  const fav = $derived(app.favorites.includes(r.id));
  const blocked = $derived(app.blocked.includes(r.id));
</script>

<a class="rcard" href="#/r/{r.id}">
  <div class="art"><Thumb recipe={r} /></div>
  <span class="mealtag">{mealName(r.meals[0])}</span>
  <button type="button" class="fav" aria-pressed={fav} aria-label="{r.title} {fav ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}"
    onclick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(r.id); }}><Icon name="heart" filled={fav} /></button>
  <div class="body">
    <h3>{r.title}</h3>
    {#if blocked}<span class="tag warn" style="align-self:flex-start">Ausgeblendet</span>{/if}
    <div class="meta"><span>{shortTime(r)}</span><span>{r.nutrition.kcal} kcal</span><span>{Math.round(r.nutrition.protein)} g Eiweiß</span>{#if r.storage.thermos}<span>Thermobox</span>{/if}</div>
  </div>
</a>
