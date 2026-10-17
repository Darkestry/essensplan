<script lang="ts">
  // Vorratsschrank: Dinge, die immer im Haus sind, erscheinen nicht mehr auf der Einkaufsliste.
  import { app, db } from '../app.svelte.ts';
  import { togglePantry } from '../core/shopping.ts';
  import Switch from '../components/Switch.svelte';

  const F = db.F;
  const GROUPS = ['Vorrat & Gewürze', 'Trockenwaren', 'Nüsse & Kerne', 'Dosen & Gläser'];
  const keys = Object.keys(F).filter(k => k !== 'water' && (F[k].staple || ['Trockenwaren', 'Nüsse & Kerne', 'Dosen & Gläser'].includes(F[k].group)) && !k.startsWith('goat'));
  const groups = GROUPS.map(g => ({ g, keys: keys.filter(k => F[k].group === g).sort((a, b) => F[a].name.localeCompare(F[b].name, 'de')) }));
  const pantry = $derived(app.settings.pantry);
</script>

<div class="view settings">
  <div class="vhead">
    <a class="linkbtn" href="#/mehr">Zurück zu Mehr</a>
    <h1 style="margin-top:8px">Immer im Haus</h1>
    <p class="lead">Was du hier markierst, taucht nicht mehr auf der Einkaufsliste auf. Gut für Gewürze, Öl, Salz und Grundvorräte. {pantry.length} markiert.</p>
  </div>
  {#each groups as { g, keys: ks } (g)}
    <section class="section">
      <div class="shead"><h2>{g}</h2></div>
      <div class="card">
        {#each ks as k (k)}
          <Switch title={F[k].name} checked={pantry.includes(k)} onchange={() => togglePantry(k)} />
        {/each}
      </div>
    </section>
  {/each}
</div>
