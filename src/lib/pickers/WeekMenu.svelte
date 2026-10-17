<script lang="ts">
  import { app } from '../app.svelte.ts';
  import { addDays, weekLabel } from '../core/util.ts';
  import { autofillWeek, copyPrevWeek, emptyWeek, replanWeek } from '../actions.ts';
  import { closePicker } from '../ui.svelte.ts';
  import { printWeek } from '../print.ts';
  let { monday }: { monday: string } = $props();
  const prev = $derived(addDays(monday, -7));
  const run = (fn: (m: string) => void) => () => { const m = monday; closePicker(); fn(m); };
</script>

<div class="picker-head"><h2 id="pickerTitle">Woche {weekLabel(monday)}</h2></div>
<div class="picker-body">
  <ul class="menu">
    <li><button type="button" onclick={run(autofillWeek)}><span><span>Woche auffüllen</span><small>Nur freie Plätze, deine Einträge bleiben</small></span></button></li>
    <li><button type="button" onclick={run(replanWeek)}><span><span>Woche neu planen lassen</span><small>Ersetzt alle Mahlzeiten dieser Woche</small></span></button></li>
    {#if app.weeks[prev]}<li><button type="button" onclick={run(copyPrevWeek)}><span><span>Vorwoche übernehmen</span><small>{weekLabel(prev)}</small></span></button></li>{/if}
    <li><button type="button" onclick={run(printWeek)}><span><span>Plan & Einkaufsliste drucken</span><small>Im Druckdialog kannst du auch ein PDF speichern</small></span></button></li>
    <li><button type="button" class="danger" onclick={run(emptyWeek)}><span>Woche leeren</span></button></li>
  </ul>
</div>
