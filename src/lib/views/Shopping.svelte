<script lang="ts">
  // Einkaufsliste: addiert gleiche Zutaten, rechnet Packungen, Häkchen pro Woche, Reste-Verwertung.
  import { app, db } from '../app.svelte.ts';
  import { filled, week } from '../core/plan.ts';
  import { fmtQty, packHint, packRests, shopping, toggleHave, togglePantry } from '../core/shopping.ts';
  import { GROUP_ORDER } from '../core/recipes.ts';
  import type { ShopItem } from '../core/types.ts';
  import { DAYS_SHORT, isDate, mondayOf, mondayOfIso, weekDates } from '../core/util.ts';
  import { shareList } from '../actions.ts';
  import { printShopping } from '../print.ts';
  import { buzz, toast } from '../ui.svelte.ts';
  import Icon from '../components/Icon.svelte';
  import WeekNav from '../components/WeekNav.svelte';

  let { a }: { a?: string } = $props();

  const F = db.F;
  const byName = (x: ShopItem, y: ShopItem) => F[x.k].name.localeCompare(F[y.k].name, 'de');

  const monday = $derived(isDate(a) ? mondayOfIso(a) : mondayOf());
  const list = $derived(shopping(monday));
  const rests = $derived(packRests(monday, list));
  const have = $derived(app.weeks[monday]?.have ?? {});
  const normal = $derived(list.filter(i => !F[i.k].staple && !i.pantry));
  const staples = $derived(list.filter(i => F[i.k].staple && !i.pantry).sort(byName));
  const pantry = $derived(list.filter(i => i.pantry));
  const done = $derived(normal.filter(i => (have[i.k] || 0) >= i.q - 0.01).length);
  const meals = $derived(weekDates(monday).reduce((s, d) => s + filled(d), 0));
  const groups = $derived(GROUP_ORDER.filter(g => g !== 'Vorrat & Gewürze')
    .map(g => ({ g, items: normal.filter(i => F[i.k].group === g).sort(byName) }))
    .filter(x => x.items.length));
  const persons = $derived(app.settings.persons);

  function onHave(k: string, on: boolean): void {
    toggleHave(monday, k, on);
    buzz(8);
  }
  function resetHave(): void {
    const w = week(monday);
    if (!w) return;
    const prev = w.have;
    w.have = {};
    toast('Häkchen zurückgesetzt', { label: 'Rückgängig', run: () => { w.have = prev; } });
  }
  function pin(k: string): void {
    togglePantry(k);
    toast(`${F[k].name.split(',')[0]} ist jetzt im Vorrat`, { label: 'Rückgängig', run: () => togglePantry(k) });
  }
  const shortName = (k: string) => F[k].name.split(',')[0];
</script>

{#snippet item(i: ShopItem, withPin: boolean)}
  {@const h = have[i.k] || 0}
  {@const full = h >= i.q - 0.01}
  {@const partial = h > 0 && !full}
  {@const hint = packHint(i.k, i.q - (partial ? h : 0))}
  {@const f = F[i.k]}
  {@const days = [...i.days].sort((x, y) => x - y).map(d => DAYS_SHORT[d]).join(', ')}
  {@const titles = [...i.recipes].map(id => (id === 'extra' ? 'Extras' : db.byId.get(id)?.title)).filter(Boolean)}
  {@const conv = !hint && !f.staple && /liefert|wiegt|Zehe/.test(f.hint) ? f.hint : ''}
  <div class="gitem" class:done={full}>
    <input type="checkbox" id="g-{i.k}" checked={full} onchange={e => onHave(i.k, e.currentTarget.checked)} />
    <label for="g-{i.k}">
      <b>{f.name}</b>
      {#if partial}<small class="partial">Dein Plan hat sich geändert. Kauf noch {fmtQty(i.k, i.q - h)} dazu.</small>{/if}
      {#if hint}<small>{hint}</small>{/if}
      {#if conv}<small>{conv}</small>{/if}
      {#if !f.staple}<small><span class="meta"><span>{days}</span><span>{titles.length === 1 ? titles[0] : `${titles.length} Gerichte`}</span></span></small>{/if}
    </label>
    <span class="amt">{fmtQty(i.k, i.q)}{#if withPin}<button type="button" class="pinbtn" aria-label="{f.name} in den Vorrat aufnehmen" onclick={() => pin(i.k)}>In den Vorrat</button>{/if}</span>
  </div>
{/snippet}

<div class="view">
  <div class="vhead">
    <h1>Ab in den Korb</h1>
    <div style="margin-top:12px"><WeekNav {monday} base="#/einkauf" /></div>
  </div>
  {#if normal.length}
    <div class="card pad">
      <div class="row"><span class="grow"><b>{done} von {normal.length}</b> <span class="muted small">erledigt</span><br /><span class="meta"><span>{meals} Mahlzeiten</span><span>{persons} {persons === 1 ? 'Person' : 'Personen'}</span></span></span></div>
      <div class="progress" style="margin-top:8px"><span style:width="{(done / normal.length) * 100}%"></span></div>
      <div class="btnrow" style="margin-top:12px">
        <button class="btn sm" type="button" onclick={() => shareList(monday)}><Icon name="share" /> Teilen</button>
        <button class="btn light sm" type="button" onclick={() => printShopping(monday)}><Icon name="print" /> Drucken</button>
        {#if done}<button class="btn light sm" type="button" onclick={resetHave}>Häkchen zurücksetzen</button>{/if}
      </div>
    </div>
    <p class="small muted" style="margin-top:10px">Hake ab, was du schon zu Hause hast oder gekauft hast. Ändert sich danach dein Plan, zeigt dir die Liste, was noch fehlt.</p>
    {#each groups as { g, items } (g)}
      <section class="card ggroup"><h3>{g}</h3>{#each items as i (i.k)}{@render item(i, false)}{/each}</section>
    {/each}
    {#if staples.length}
      <details class="card fold"><summary>Vorrat prüfen ({staples.length})</summary>{#each staples as i (i.k)}{@render item(i, true)}{/each}</details>
    {/if}
    {#if pantry.length}
      <p class="small muted" style="margin-top:10px">{pantry.length} Artikel hast du immer im Haus, deshalb {pantry.length === 1 ? 'steht er' : 'stehen sie'} nicht auf der Liste: {pantry.map(i => shortName(i.k)).join(', ')}. <a href="#/vorrat">Vorratsschrank bearbeiten</a></p>
    {/if}
    {#if rests.length}
      <section class="section">
        <div class="shead"><h2>Reste verwerten</h2></div>
        <p class="small muted" style="margin-bottom:8px">Diese Packungen werden nicht ganz leer. Plane eines der Rezepte dazu oder friere den Rest ein.</p>
        <div class="card">
          {#each rests as x (x.k)}
            <div class="setrow" style="display:block">
              <b>{fmtQty(x.k, x.rest)} {shortName(x.k)}</b>
              {#if x.recipes.length}
                <div class="tags" style="margin-top:6px">{#each x.recipes as r (r.id)}<a class="chip" href="#/r/{r.id}">{r.title}</a>{/each}</div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}
    <div class="infobox warm section"><b>Frische über die Woche</b>Fisch und Hackfleisch halten frisch nur 1 Tag, Geflügel 2 Tage. Für spätere Tage im Bio-Markt TK-Ware nehmen oder direkt nach dem Einkauf portionsweise einfrieren. Unter <a href="#/ablauf/{monday}">Vorkochen</a> steht, wann du auftauen solltest.</div>
  {:else}
    <div class="card emptybox"><h2>Deine Liste ist noch leer</h2><p>Plane Gerichte für diese Woche. Die Liste fasst gleiche Zutaten zusammen und rechnet Packungsgrößen aus.</p><a class="btn" href="#/plan/{monday}">Zum Plan</a></div>
  {/if}
</div>
