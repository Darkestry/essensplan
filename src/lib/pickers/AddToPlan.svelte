<script lang="ts">
  // „In den Plan“: Woche, Tag und Mahlzeit wählen.
  import { untrack } from 'svelte';
  import { db } from '../app.svelte.ts';
  import { planRecipe } from '../actions.ts';
  import { getEntry, recipeOf } from '../core/plan.ts';
  import { SLOTS, SLOT_LABEL } from '../core/recipes.ts';
  import type { Slot } from '../core/types.ts';
  import { DAYS, DAYS_SHORT, addDays, dayIndex, mondayOf, mondayOfIso, parseIso, todayIso, weekLabel } from '../core/util.ts';
  import { closePicker } from '../ui.svelte.ts';
  import Icon from '../components/Icon.svelte';

  let { id }: { id: string } = $props();
  const r = $derived(db.byId.get(id));

  // Vorschlag: erster freier Tag ab heute für die Hauptmahlzeit des Rezepts
  function initial(): { monday: string; date: string; slot: Slot } {
    const slot: Slot = db.byId.get(id)?.meals[0] ?? 'dinner';
    const today = todayIso();
    let date = today;
    for (let i = 0; i < 14; i++) { const d = addDays(today, i); if (!getEntry(d, slot)) { date = d; break; } }
    const m = mondayOf();
    const monday = mondayOfIso(date);
    return { monday: monday < m ? m : monday, date, slot };
  }
  const sel = $state(untrack(initial));

  const days = $derived(Array.from({ length: 7 }, (_, i) => addDays(sel.monday, i)));
  const cur = $derived(getEntry(sel.date, sel.slot));
  const curTitle = $derived(cur ? ('t' in cur ? cur.t : recipeOf(cur)?.title ?? '–') : '');

  function shiftWeek(delta: number): void {
    sel.monday = addDays(sel.monday, delta);
    sel.date = addDays(sel.date, delta);
  }
  function confirmAdd(): void {
    const { date, slot } = sel, rid = id;
    closePicker();
    planRecipe(date, slot, rid);
  }
</script>

<div class="picker-head"><h2 id="pickerTitle">Wann gibt es das?</h2><p>{r?.title ?? ''}</p></div>
<div class="picker-body">
  <div class="weeknav">
    <button class="iconbtn" type="button" aria-label="Vorige Woche" onclick={() => shiftWeek(-7)}><Icon name="back" /></button>
    <b>{weekLabel(sel.monday)}</b>
    <button class="iconbtn" type="button" aria-label="Nächste Woche" onclick={() => shiftWeek(7)}><Icon name="chev" /></button>
  </div>
  <div class="daygrid">
    {#each days as d, i (d)}
      <button type="button" aria-pressed={d === sel.date} onclick={() => (sel.date = d)}>{DAYS_SHORT[i]}<small>{parseIso(d).getDate()}.</small></button>
    {/each}
  </div>
  <div class="seg" style="margin-top:12px" role="group" aria-label="Mahlzeit">
    {#each SLOTS as s (s)}
      <button type="button" aria-pressed={s === sel.slot} onclick={() => (sel.slot = s)}>{SLOT_LABEL[s]}</button>
    {/each}
  </div>
  <p class="small muted" style="margin-top:12px">{DAYS[dayIndex(sel.date)]}, {SLOT_LABEL[sel.slot]}: {#if cur}Hier steht schon <b>{curTitle}</b>. Das wird ersetzt.{:else}Noch frei.{/if}</p>
</div>
<div class="picker-foot"><button class="btn orange block" type="button" onclick={confirmAdd} disabled={!r}>Einplanen</button></div>
