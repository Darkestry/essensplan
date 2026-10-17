<script lang="ts">
  import { SLOT_LABEL } from '../core/recipes.ts';
  import type { Slot } from '../core/types.ts';
  import { DAYS, dayIndex } from '../core/util.ts';
  import { planEntry } from '../actions.ts';
  import { closePicker } from '../ui.svelte.ts';
  let { date, slot }: { date: string; slot: Slot } = $props();
  let value = $state('');
  function save(): void { const v = value.trim(); if (!v) return; const d = date, s = slot; closePicker(); planEntry(d, s, { t: v.slice(0, 60) }); }
</script>

<div class="picker-head"><h2 id="pickerTitle">Eigener Eintrag</h2><p>{SLOT_LABEL[slot]} am {DAYS[dayIndex(date)]}</p></div>
<form class="picker-body" onsubmit={e => { e.preventDefault(); save(); }}>
  <label class="field"><span>Was gibt es?</span><input type="text" maxlength="60" placeholder="z. B. Pizza mit Freunden" bind:value /></label>
  <div class="chips">{#each ['Auswärts', 'Kantine', 'Reste', 'Bei Freunden'] as t (t)}<button type="button" class="chip" onclick={() => (value = t)}>{t}</button>{/each}</div>
  <div class="picker-foot" style="margin-top:12px;padding:10px 0 0"><button class="btn orange block" type="submit">Eintragen</button></div>
</form>
