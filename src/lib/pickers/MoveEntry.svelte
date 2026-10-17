<script lang="ts">
  import { getEntry, setEntry } from '../core/plan.ts';
  import type { Entry, Slot } from '../core/types.ts';
  import { DAYS, DAYS_SHORT, dayIndex, mondayOfIso, parseIso, weekDates } from '../core/util.ts';
  import { closePicker, toast } from '../ui.svelte.ts';
  let { date, slot }: { date: string; slot: Slot } = $props();
  // Reste-Markierung gilt nur am Folgetag des Abendessens → beim Verschieben aufheben
  const plain = (e: Entry | null): Entry | null => (e && 'r' in e ? { r: e.r } : e);
  function move(to: string): void {
    const a = getEntry(date, slot), c = getEntry(to, slot);
    setEntry(to, slot, plain(a)); setEntry(date, slot, plain(c));
    closePicker(); toast(`Auf ${DAYS[dayIndex(to)]} verschoben`);
  }
</script>

<div class="picker-head"><h2 id="pickerTitle">Auf welchen Tag?</h2><p>Steht dort schon etwas, tauschen die beiden Gerichte den Platz.</p></div>
<div class="picker-body">
  <div class="daygrid">
    {#each weekDates(mondayOfIso(date)) as d, i (d)}
      <button type="button" disabled={d === date} onclick={() => move(d)}>{DAYS_SHORT[i]}<small>{parseIso(d).getDate()}.</small></button>
    {/each}
  </div>
</div>
