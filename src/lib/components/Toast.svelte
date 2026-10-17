<script lang="ts">
  import { toastState, hideToast } from '../ui.svelte.ts';
</script>

{#if toastState.msg}
  {#key toastState.id}
    <div class="toast" role="status" aria-live="polite">
      {toastState.msg}
      {#if toastState.action}
        {@const action = toastState.action}
        <button type="button" onclick={() => { hideToast(); action.run(); }}>{action.label}</button>
      {/if}
    </div>
  {/key}
{/if}
