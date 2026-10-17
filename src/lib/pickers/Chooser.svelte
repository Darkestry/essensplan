<script lang="ts">
  // Rezeptauswahl für einen Plan-Platz
  import { app, db } from '../app.svelte.ts';
  import { allowed, getEntry, isFavorite, quickTime, recipeOf } from '../core/plan.ts';
  import { SLOT_LABEL } from '../core/recipes.ts';
  import type { Recipe, Slot } from '../core/types.ts';
  import { DAYS, addDays, dayIndex, fmtMinutes, fuzzyMatch, norm, shortDate } from '../core/util.ts';
  import { planEntry, planRecipe } from '../actions.ts';
  import { closePicker, openPicker } from '../ui.svelte.ts';
  import Thumb from '../components/Thumb.svelte';
  import Icon from '../components/Icon.svelte';
  import TextEntry from './TextEntry.svelte';

  let { date, slot }: { date: string; slot: Slot } = $props();
  let q = $state('');
  let onlyFav = $state(false);
  let showAll = $state(false);

  const hay = new Map<string, string>();
  const text = (r: Recipe) => {
    let h = hay.get(r.id);
    if (!h) { h = norm([r.title, r.subtitle, r.origin, ...r.tags, ...r.ingredients.map(i => db.F[i.k]?.name ?? '')].join(' ')); hay.set(r.id, h); }
    return h;
  };
  const box = $derived(slot === 'lunch' && app.settings.thermosDays.includes(dayIndex(date)));
  const pool = $derived(db.R.filter(r => r.meals.some(m => m === slot || (slot === 'lunch' && m === 'dinner'))));
  const hidden = $derived(pool.filter(r => !allowed(r)).length);
  const list = $derived.by(() => {
    const out = pool.filter(r => (showAll || allowed(r)) && (!onlyFav || isFavorite(r.id)) && fuzzyMatch(text(r), q));
    // An Box-Tagen zuerst thermobox-taugliche Gerichte
    if (box) out.sort((x, y) => Number(y.storage.thermos) - Number(x.storage.thermos) || (x.meals[0] === 'lunch' ? -1 : 1));
    return out;
  });
  const prevDinner = $derived(slot === 'lunch' ? recipeOf(getEntry(addDays(date, -1), 'dinner')) : undefined);

  function pick(r: Recipe): void { const d = date, s = slot; closePicker(); planRecipe(d, s, r.id); }
  function leftover(r: Recipe): void { const d = date; closePicker(); planEntry(d, 'lunch', { r: r.id, lo: 1 }, 'Rest von gestern eingeplant. Koch am Vorabend doppelt.'); }
</script>

<div class="picker-head"><h2 id="pickerTitle">{SLOT_LABEL[slot]} am {DAYS[dayIndex(date)]}</h2><p><span class="meta"><span>{shortDate(date)}</span>{#if box}<span>Thermobox-Tag</span>{/if}</span></p></div>
<div class="picker-body">
  <div class="search">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
    <input type="search" placeholder="Rezept oder Zutat suchen" autocomplete="off" aria-label="Rezept suchen" bind:value={q} />
  </div>
  <div class="chips" style="margin-bottom:8px">
    <button type="button" class="chip" aria-pressed={onlyFav} onclick={() => (onlyFav = !onlyFav)}>{onlyFav ? '♥' : '♡'} Favoriten</button>
    {#if hidden}<button type="button" class="chip" aria-pressed={showAll} onclick={() => (showAll = !showAll)}>Auch ausgeblendete ({hidden})</button>{/if}
    <button type="button" class="chip" onclick={() => openPicker(TextEntry, { date, slot })}>Eigener Eintrag</button>
  </div>
  {#if prevDinner && prevDinner.storage.fridgeDays >= 1}
    <button type="button" class="pickrow" onclick={() => leftover(prevDinner)}>
      <span class="thumb"><Thumb recipe={prevDinner} /></span>
      <span><b>Rest von gestern</b><small>{prevDinner.title}, am Vorabend doppelt gekocht</small></span><Icon name="chev" />
    </button>
  {/if}
  {#each list as r (r.id)}
    <button type="button" class="pickrow" onclick={() => pick(r)}>
      <span class="thumb"><Thumb recipe={r} /></span>
      <span><b>{r.title}</b><small><span class="meta"><span>{fmtMinutes(quickTime(r))}</span><span>{r.nutrition.kcal} kcal</span><span>{Math.round(r.nutrition.protein)} g Eiweiß</span>{#if r.storage.thermos}<span>Thermobox</span>{/if}</span></small></span>
      <Icon name="chev" />
    </button>
  {:else}
    <p class="muted pad">Dazu passt kein Rezept. Versuch ein anderes Wort oder trag selbst etwas ein.</p>
  {/each}
</div>
