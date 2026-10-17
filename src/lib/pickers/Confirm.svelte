<script lang="ts">
  import { closePicker } from '../ui.svelte.ts';
  let { title, text, ok, onok }: { title: string; text: string; ok: string; onok: () => void } = $props();
</script>

<div class="picker-head"><h2 id="pickerTitle">{title}</h2><p>{text}</p></div>
<div class="picker-foot btnrow">
  <button class="btn light" type="button" onclick={closePicker}>Abbrechen</button>
  <button class="btn orange" type="button" onclick={() => { closePicker(); onok(); }}>{ok}</button>
</div>
