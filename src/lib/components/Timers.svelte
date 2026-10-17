<script lang="ts">
  import { timers, toggleTimer, addMinute, stopTimer, mmss } from '../timer.svelte.ts';
</script>

{#if timers.length}
  <aside class="timers" aria-label="Laufende Timer">
    {#each timers as t (t.id)}
      <div class="timer" class:done={t.done} role="timer" aria-live={t.done ? 'assertive' : 'off'}>
        <div class="tl2"><small>{t.done ? 'Fertig: ' : ''}{t.label}</small><b>{mmss(t.remaining)}</b></div>
        {#if !t.done}
          <button type="button" onclick={() => toggleTimer(t)}>{t.running ? 'Pause' : 'Weiter'}</button>
          <button type="button" aria-label="Eine Minute dazu" onclick={() => addMinute(t)}>+1</button>
        {/if}
        <button type="button" aria-label="Timer beenden" onclick={() => stopTimer(t)}>{t.done ? 'OK' : '×'}</button>
      </div>
    {/each}
  </aside>
{/if}
