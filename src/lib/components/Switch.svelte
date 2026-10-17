<script lang="ts">
  import type { Snippet } from 'svelte';
  let { checked, onchange, title, sub = '', children }: { checked: boolean; onchange: (v: boolean) => void; title: string; sub?: string; children?: Snippet } = $props();
</script>

<label class="setrow">
  <span><b>{title}</b>{#if sub}<small>{sub}</small>{/if}{@render children?.()}</span>
  <span class="switch"><input type="checkbox" {checked} onchange={e => onchange(e.currentTarget.checked)} /><i></i></span>
</label>
