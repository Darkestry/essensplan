<script lang="ts">
  import type { EntryInfo } from './EntryInfo.ts';
  let { parts }: { parts: EntryInfo['parts'] } = $props();
</script>

{#if parts.length}<span class="meta">{#each parts as p, i (i)}<span class={p.lo ? 'lo' : undefined}>{p.text}</span>{/each}</span>{/if}

<style>
  .lo { color: var(--ok); font-weight: 650; }
</style>
