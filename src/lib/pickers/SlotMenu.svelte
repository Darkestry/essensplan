<script lang="ts">
  import { app, db } from '../app.svelte.ts';
  import { allowed, entriesOf, getEntry, hasLeftoverFrom, recipeOf, setEntry } from '../core/plan.ts';
  import { SLOT_LABEL } from '../core/recipes.ts';
  import type { Slot } from '../core/types.ts';
  import { DAYS, addDays, dayIndex, mondayOfIso, shortDate } from '../core/util.ts';
  import { planEntry } from '../actions.ts';
  import { closePicker, openPicker, toast } from '../ui.svelte.ts';
  import Chooser from './Chooser.svelte';
  import MoveEntry from './MoveEntry.svelte';

  let { date, slot }: { date: string; slot: Slot } = $props();
  const e = $derived(getEntry(date, slot));
  const r = $derived(recipeOf(e));
  const next = $derived(addDays(date, 1));
  const canLeftover = $derived(slot === 'dinner' && !!r && r.storage.fridgeDays >= 1 && app.settings.slots.lunch);
  const hasLo = $derived(slot === 'dinner' && hasLeftoverFrom(date));

  function swapRandom(): void {
    const used = new Set(entriesOf(mondayOfIso(date)).map(x => ('r' in x.entry ? x.entry.r : '')));
    const box = slot === 'lunch' && app.settings.thermosDays.includes(dayIndex(date));
    const pool = db.R.filter(x => x.meals.includes(slot) && allowed(x) && !app.blocked.includes(x.id) && !used.has(x.id) && (!box || x.storage.thermos));
    if (!pool.length) { toast('Gerade passt kein weiteres Rezept. Wähl über „Anderes Gericht wählen“ selbst eines aus.'); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const d = date, s = slot; closePicker(); planEntry(d, s, { r: pick.id }, `Getauscht gegen ${pick.title}`);
  }
  function addLeftover(): void {
    if (!r) return;
    const n = next, rec = r; closePicker(); planEntry(n, 'lunch', { r: rec.id, lo: 1 }, `Doppelt kochen: Rest gibt es am ${DAYS[dayIndex(n)]} mittags`);
  }
  function removeLeftover(): void { const n = next; closePicker(); setEntry(n, 'lunch', null); }
  function clear(): void { const d = date, s = slot; closePicker(); planEntry(d, s, null, 'Entfernt'); }
</script>

<div class="picker-head"><h2 id="pickerTitle">{r ? r.title : e && 't' in e ? e.t : SLOT_LABEL[slot]}</h2><p>{SLOT_LABEL[slot]} am {DAYS[dayIndex(date)]}, {shortDate(date)}</p></div>
<div class="picker-body">
  <ul class="menu">
    {#if r}<li><a href="#/r/{r.id}" onclick={closePicker}><span>Zum Rezept</span></a></li>{/if}
    <li><button type="button" onclick={() => openPicker(Chooser, { date, slot })}><span>Anderes Gericht wählen</span></button></li>
    <li><button type="button" onclick={swapRandom}><span><span>Zufällig tauschen</span><small>Passendes Gericht, das diese Woche noch nicht vorkommt</small></span></button></li>
    {#if canLeftover && r}
      {#if hasLo}
        <li><button type="button" onclick={removeLeftover}><span><span>Nicht mehr doppelt kochen</span><small>Mittag am {DAYS[dayIndex(next)]} wird wieder frei</small></span></button></li>
      {:else}
        <li><button type="button" onclick={addLeftover}><span><span>Doppelt kochen für morgen Mittag</span><small>{r.storage.thermos ? `Rest kommt am ${DAYS[dayIndex(next)]} in die Thermobox` : `Rest gibt es am ${DAYS[dayIndex(next)]} mittags`}</small></span></button></li>
      {/if}
    {/if}
    <li><button type="button" onclick={() => openPicker(MoveEntry, { date, slot })}><span>Auf anderen Tag verschieben</span></button></li>
    <li><button type="button" class="danger" onclick={clear}><span>Entfernen</span></button></li>
  </ul>
</div>
