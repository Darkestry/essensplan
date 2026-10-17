<script lang="ts">
  let { value, display, onchange, labelLess = 'Weniger', labelMore = 'Mehr', minWidth = 34 }: {
    value: number; display?: string; onchange: (delta: -1 | 1) => void; labelLess?: string; labelMore?: string; minWidth?: number;
  } = $props();
</script>

<div class="stepper">
  <button type="button" aria-label={labelLess} onclick={() => onchange(-1)}>−</button>
  <output style:min-width="{minWidth}px" aria-live="polite">{display ?? value}</output>
  <button type="button" aria-label={labelMore} onclick={() => onchange(1)}>+</button>
</div>
