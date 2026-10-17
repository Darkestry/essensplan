<script lang="ts">
  // Bottom-Sheet für Auswahl-Dialoge. Inhalt = beliebige Picker-Komponente aus ui.picker.
  import { picker, closePicker } from '../ui.svelte.ts';
  let card: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (picker.component && card) {
      document.body.classList.add('locked');
      const first = card.querySelector<HTMLElement>('input, button, a[href]');
      requestAnimationFrame(() => first?.focus({ preventScroll: true }));
      return () => { if (!document.querySelector('.sheet')) document.body.classList.remove('locked'); };
    }
  });
</script>

{#if picker.component}
  {@const C = picker.component}
  <div class="picker" role="dialog" aria-modal="true" aria-labelledby="pickerTitle">
    <button type="button" class="picker-backdrop" aria-label="Schließen" onclick={closePicker}></button>
    <div class="picker-card" bind:this={card}><C {...picker.props} /></div>
  </div>
{/if}

<style>
  .picker-backdrop { border: 0; padding: 0; cursor: default; }
</style>
