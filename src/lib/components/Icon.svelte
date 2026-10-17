<script lang="ts">
  type Name = 'chev' | 'back' | 'close' | 'dots' | 'heart' | 'search' | 'plus' | 'share' | 'print' | 'moon';
  let { name, size = 20, filled = false }: { name: Name; size?: number; filled?: boolean } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  {#if name === 'chev'}<path d="M9 6l6 6-6 6" />
  {:else if name === 'back'}<path d="M15 6l-6 6 6 6" />
  {:else if name === 'close'}<path d="M6 6l12 12M18 6L6 18" />
  {:else if name === 'dots'}<circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" />
  {:else if name === 'heart'}<path stroke-width="2" fill={filled ? 'currentColor' : 'none'} d="M12 20s-7-4.4-9.2-8.6C1.2 8.1 3.3 4.5 6.8 4.5c2.1 0 3.4 1.2 5.2 3.1 1.8-1.9 3.1-3.1 5.2-3.1 3.5 0 5.6 3.6 4 6.9C19 15.6 12 20 12 20z" />
  {:else if name === 'search'}<circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
  {:else if name === 'plus'}<path d="M12 5v14M5 12h14" />
  {:else if name === 'share'}<path stroke-width="2" d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  {:else if name === 'print'}<path stroke-width="2" d="M7 9V3h10v6M7 17H4v-7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7h-3M7 14h10v7H7z" />
  {:else if name === 'moon'}<path stroke-width="2" d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
  {/if}
</svg>
