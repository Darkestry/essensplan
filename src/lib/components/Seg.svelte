<script lang="ts" generics="T extends string | number">
  let { value, options, onchange, label = '' }: { value: T; options: [T, string][]; onchange: (v: T) => void; label?: string } = $props();
</script>

<div class="seg" role="group" aria-label={label || undefined}>
  {#each options as [v, l] (v)}
    <button type="button" aria-pressed={value === v} onclick={() => onchange(v)}>{l}</button>
  {/each}
</div>
