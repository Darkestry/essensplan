<script lang="ts">
  // Nach dem Kochmodus: kurze Bewertung des Gerichts.
  import { db } from '../app.svelte.ts';
  import { toggleBlocked } from '../actions.ts';
  import { isBlocked, isFavorite, toggleIn } from '../core/plan.ts';
  import { closePicker, toast } from '../ui.svelte.ts';

  let { id }: { id: string } = $props();
  const r = $derived(db.byId.get(id));

  function rateFav(): void {
    if (!isFavorite(id)) toggleIn('favorites', id);
    closePicker();
    toast('Zu Favoriten hinzugefügt');
  }
  function block(): void {
    const rid = id;
    closePicker();
    if (isBlocked(rid)) toast('Wird nicht mehr vorgeschlagen');
    else toggleBlocked(rid);
  }
</script>

<div class="picker-head"><h2 id="pickerTitle">Guten Appetit!</h2><p>Wie hat dir {r?.title ?? 'das Essen'} geschmeckt?</p></div>
<div class="picker-body">
  <ul class="menu">
    <li><button type="button" onclick={rateFav}><span><span>Lecker, gern öfter</span><small>Kommt zu deinen Favoriten und öfter in den Plan</small></span></button></li>
    <li><button type="button" onclick={closePicker}><span><span>War okay</span></span></button></li>
    <li><button type="button" onclick={block}><span><span>Nicht mehr vorschlagen</span><small>Bleibt im Rezeptbuch, kommt aber nicht mehr automatisch in den Plan</small></span></button></li>
    {#if r && !r.custom}
      <li><a href="#/editor/kopie/{id}" onclick={closePicker}><span><span>Eigene Version anlegen</span><small>Mengen oder Zutaten nach deinem Geschmack anpassen</small></span></a></li>
    {/if}
  </ul>
</div>
