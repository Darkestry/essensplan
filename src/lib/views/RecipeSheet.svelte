<script lang="ts">
  // Rezept-Detail als Vollbild-Overlay (#/r/<id>), Kochmodus unter #/r/<id>/kochen.
  import { untrack } from 'svelte';
  import { app, db } from '../app.svelte.ts';
  import { portionsBase, quickTime } from '../core/plan.ts';
  import { ALLERGENS, DIET_LABEL, boxCapacity, cookedWeight } from '../core/recipes.ts';
  import type { Ingredient } from '../core/types.ts';
  import { TAG_LABEL, fmt, fmtMinutes } from '../core/util.ts';
  import { stepUrl } from '../art/art.ts';
  import { toggleBlocked, toggleFavorite } from '../actions.ts';
  import { closeOverlay } from '../router.svelte.ts';
  import { startTimer } from '../timer.svelte.ts';
  import { openPicker, picker } from '../ui.svelte.ts';
  import { printRecipe } from '../print.ts';
  import Icon from '../components/Icon.svelte';
  import Thumb from '../components/Thumb.svelte';
  import Stepper from '../components/Stepper.svelte';
  import AddToPlan from '../pickers/AddToPlan.svelte';
  import Cook from './Cook.svelte';
  import { mealName, qty, timerLabel } from './recipeFormat.ts';

  let { id, cook }: { id: string; cook: boolean } = $props();

  const r = $derived(db.byId.get(id));
  const base = $derived(portionsBase());

  // Portionen und Häkchen gelten nur für diese Ansicht; bei einem anderen Rezept zurücksetzen.
  let shownId = untrack(() => id);
  let portions = $state(untrack(() => portionsBase()));
  let checked = $state<Record<number, boolean>>({});
  $effect.pre(() => {
    if (id !== shownId) { shownId = id; untrack(() => { portions = portionsBase(); checked = {}; }); }
  });

  function changePortions(delta: -1 | 1): void {
    portions = Math.max(0.5, Math.min(12, portions + delta * (portions <= 1 && delta < 0 ? 0.5 : 1)));
  }

  let sheet: HTMLDivElement | undefined = $state();
  let scrolled = $state(false);

  // Beim Öffnen und beim Wechsel Rezept ↔ Kochmodus nach oben und Fokus auf den ersten Knopf
  $effect(() => {
    void id; void cook;
    const el = sheet; if (!el) return;
    el.scrollTop = 0; scrolled = false;
    const raf = requestAnimationFrame(() => el.querySelector<HTMLElement>('.iconbtn')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  });
  $effect(() => {
    document.body.classList.add('locked', 'sheet-open');
    return () => document.body.classList.remove('locked', 'sheet-open');
  });
  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && !picker.component) closeOverlay();
  }

  const isStaple = (i: Ingredient) => !!db.F[i.k]?.staple;
  const main = $derived(r ? r.ingredients.map((i, idx) => ({ i, idx })).filter(x => !isStaple(x.i)) : []);
  const staples = $derived(r ? r.ingredients.map((i, idx) => ({ i, idx })).filter(x => isStaple(x.i) && x.i.k !== 'water') : []);
  const water = $derived(r?.ingredients.find(i => i.k === 'water'));
  const fav = $derived(app.favorites.includes(id));
  const blocked = $derived(app.blocked.includes(id));
  // Tags ohne Dopplung: Thermobox und einfrierbar stehen schon als eigene Tags da
  const extraTags = $derived(r ? [...new Set(r.tags.filter(t => !['thermobox', 'einfrieren'].includes(t)).map(t => TAG_LABEL[t] ?? t))] : []);
  function storageLine(s: { fridgeDays: number; freeze: boolean; thermos: boolean }): string {
    const parts = [s.fridgeDays ? `Hält ${s.fridgeDays} ${s.fridgeDays === 1 ? 'Tag' : 'Tage'} im Kühlschrank` : 'Schmeckt frisch am besten'];
    if (s.freeze) parts.push('lässt sich einfrieren');
    if (s.thermos) parts.push('passt in die Thermobox');
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}` : parts[0];
  }
</script>

<svelte:window {onkeydown} />

<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" bind:this={sheet} onscroll={e => (scrolled = e.currentTarget.scrollTop > 180)}>
  <div class="sheet-inner">
    {#if !r}
      <div class="sheettop"><button class="iconbtn" type="button" aria-label="Schließen" onclick={closeOverlay}><Icon name="close" /></button></div>
      <div class="rhead"><h1 id="sheetTitle">Rezept nicht gefunden</h1><p>Dieses Rezept gibt es nicht mehr. Schließ die Ansicht und such dir ein anderes aus.</p></div>
    {:else if cook}
      <Cook recipe={r} {portions} />
    {:else}
      {@const store = r.storage}
      {@const n = r.nutrition}
      <div class="sheettop" class:scrolled>
        <button class="iconbtn" type="button" aria-label="Zurück" onclick={closeOverlay}><Icon name="back" /></button>
        <span class="ttl">{r.title}</span>
        <button class="iconbtn" type="button" aria-pressed={fav} aria-label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'} style="color:var(--orange)" onclick={() => toggleFavorite(r.id)}><Icon name="heart" filled={fav} /></button>
        <button class="iconbtn" type="button" aria-label="Rezept drucken" onclick={() => printRecipe(r, portions)}><Icon name="print" /></button>
      </div>
      <div class="rhero"><Thumb recipe={r} eager /></div>
      <div class="rhead">
        <div class="eyebrow"><span class="meta"><span>{mealName(r.meals[0])}{r.meals.length > 1 ? ', auch ' + r.meals.slice(1).map(mealName).join(', ') : ''}</span>{#if r.origin}<span>{r.origin}</span>{/if}</span></div>
        <h1 id="sheetTitle">{r.title}</h1>
        <p>{r.subtitle}</p>
        <div class="tags" style="margin-top:10px">
          <span class="tag">{DIET_LABEL[r.diet]}</span>
          {#if store.thermos}<span class="tag">Thermobox</span>{/if}
          {#if store.freeze}<span class="tag">einfrierbar</span>{/if}
          {#each extraTags as t (t)}<span class="tag">{t}</span>{/each}
        </div>
      </div>
      <div class="facts">
        <div class="fact"><b>{fmtMinutes(quickTime(r))}</b><span>{r.time.quick && r.time.quick < r.time.total ? 'mit Vorrat' : 'Gesamtzeit'}</span></div>
        <div class="fact"><b>{fmtMinutes(r.time.active)}</b><span>selbst am Herd</span></div>
        <div class="fact"><b>{'●'.repeat(r.difficulty)}{'○'.repeat(3 - r.difficulty)}</b><span>Aufwand</span></div>
      </div>
      {#if r.time.quick && r.time.quick < r.time.total}<p class="small muted" style="margin:8px 16px 0">Ganz frisch zubereitet: {fmtMinutes(r.time.total)}</p>{/if}

      <section class="rsec"><h2>Zutaten</h2>
        <div class="card servings">
          <span><b>Portionen</b><br /><span class="small muted">{portions === base ? 'Wie in deinen Einstellungen' : 'Gilt nur hier'}</span></span>
          <Stepper value={portions} display={fmt(portions)} onchange={changePortions} labelLess="Weniger Portionen" labelMore="Mehr Portionen" />
        </div>
        {#snippet ingRow(i: Ingredient, idx: number)}
          <label class="ing" class:staple={isStaple(i)}>
            <input type="checkbox" checked={!!checked[idx]} onchange={e => (checked[idx] = e.currentTarget.checked)} />
            <span class="q">{qty(i.k, i.q * portions)}</span>
            <span>{db.F[i.k]?.name ?? i.k}{#if i.side}&nbsp;<span class="tag">Extra-Dose</span>{/if}{#if i.note}<small>{i.note}</small>{/if}</span>
          </label>
        {/snippet}
        <div class="card">{#each main as { i, idx } (idx)}{@render ingRow(i, idx)}{/each}</div>
        {#if staples.length}
          <div class="card" style="margin-top:10px"><div class="small muted" style="padding:10px 12px 0">Aus dem Vorrat</div>{#each staples as { i, idx } (idx)}{@render ingRow(i, idx)}{/each}</div>
        {/if}
        {#if r.swaps.length}
          <div class="infobox" style="margin-top:10px"><b>Mit Ziegen- & Schafsmilch</b>{r.swaps.map(x => `${db.F[x.from].name.split(',')[0]} wird zu ${db.F[x.to].name.split(' (')[0]}`).join(', ')}. {r.swaps.some(x => x.to === 'goatyogurt' || x.to === 'goatquark') ? 'Ziegenjoghurt ist dünner – für Dips vorher abtropfen lassen. ' : ''}{r.swaps.some(x => x.to === 'goatcream') ? 'Ziegenfrischkäse erst am Ende bei kleiner Hitze einrühren. ' : ''}<a href="#/wissen/ziege">Mehr zu Ziegenmilch</a></div>
        {/if}
        {#if water}<p class="small muted" style="margin-top:8px">Dazu {qty('water', water.q * portions)} Wasser{water.note ? ` – ${water.note}` : ''}.</p>{/if}
      </section>

      <section class="rsec"><h2>Nährwerte <span class="small muted" style="font-family:var(--sans);font-weight:500">pro Portion</span></h2>
        <div class="nutri"><div><b>{n.kcal}</b><span>kcal</span></div><div><b>{Math.round(n.protein)} g</b><span>Eiweiß</span></div><div><b>{Math.round(n.carbs)} g</b><span>Kohlenh.</span></div><div><b>{Math.round(n.fat)} g</b><span>Fett</span></div><div><b>{Math.round(n.fiber)} g</b><span>Ballastst.</span></div></div>
        <p class="small muted" style="margin-top:8px">Berechnet aus Durchschnittswerten der Zutaten; je nach Produkt ±10 %.</p>
        <div class="tags" style="margin-top:10px">
          {#each r.allergens as a (a)}<span class="tag warn">{ALLERGENS[a] || a}</span>{:else}<span class="tag">Keine der 14 Hauptallergene</span>{/each}
        </div>
        <p class="small muted" style="margin-top:6px">Allergene laut Zutatenliste; Produkte (z. B. Brühe, Currypulver) immer selbst prüfen.</p>
      </section>

      <section class="rsec"><h2>Lagern & Vorbereiten</h2>
        <div class="infobox"><b>{storageLine(store)}</b>{store.note || ''}</div>
        {#if store.thermos}
          {@const grams = cookedWeight(r.ingredients, db.F)}
          {@const cap = boxCapacity(app.settings.boxMl)}
          <div class="infobox" class:warm={grams <= cap} class:alert={grams > app.settings.boxMl}><b>{grams <= cap ? `Passt in deine ${app.settings.boxMl}-ml-Box` : grams <= app.settings.boxMl ? `Knapp für deine ${app.settings.boxMl}-ml-Box` : `Etwas zu viel für deine ${app.settings.boxMl}-ml-Box`}</b>Gegart ca. {grams} g pro Portion{r.ingredients.some(i => i.side) ? ' (ohne Extra-Dose)' : ''}. Randvoll passen etwa {cap} g in die Box.{grams > cap ? ` Was nicht in die Box passt (ca. ${grams - cap} g), isst du einfach abends.` : ''}</div>
          <div class="infobox warm"><b>Für die Thermobox</b>Box 5–10 Min. mit kochendem Wasser vorheizen. Essen im Topf sprudelnd aufkochen (≥ 75 °C), randvoll füllen, sofort schließen und innerhalb von 4 Stunden essen. <a href="#/wissen/thermobox">Mehr zur Thermobox</a></div>
        {/if}
        <p class="small" style="margin-top:10px"><b>Du brauchst:</b> {r.tools.join(', ')}</p>
      </section>

      <section class="rsec"><h2>Zubereitung</h2>
        <div class="steps">
          {#each r.steps as s, i (i)}
            <article class="card step">
              <div class="sart"><img src={stepUrl(r, s, i)} alt="" loading="lazy" decoding="async" width="360" height="190" /></div>
              <div class="sbody">
                <div class="snum">Schritt {i + 1} von {r.steps.length}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {#if s.timer}{@const sec = s.timer}<button class="btn soft sm" type="button" onclick={() => startTimer(sec, r.title + ': ' + s.title)}>Timer starten: {timerLabel(sec)}</button>{/if}
              </div>
            </article>
          {/each}
        </div>
      </section>

      <section class="rsec"><div class="card"><ul class="menu" style="padding:4px 8px">
        {#if r.custom}
          <li><a href="#/editor/{r.id}"><span><span>Rezept bearbeiten</span><small>Mengen, Schritte, Zeiten ändern</small></span></a></li>
        {:else}
          <li><a href="#/editor/kopie/{r.id}"><span><span>Eigene Version anlegen</span><small>Mengen oder Zutaten nach deinem Geschmack anpassen</small></span></a></li>
        {/if}
        <li><button type="button" onclick={() => toggleBlocked(r.id)}><span><span>{blocked ? 'Wieder vorschlagen' : 'Nicht mehr vorschlagen'}</span><small>{blocked ? 'Taucht wieder im automatischen Wochenplan auf' : 'Wird beim automatischen Planen übersprungen'}</small></span></button></li>
      </ul></div></section>

      {#if r.tips?.length}
        <section class="rsec"><h2>Gut zu wissen</h2><div class="card pad"><ul class="tips">{#each r.tips as t, i (i)}<li>{t}</li>{/each}</ul></div></section>
      {/if}

      <div class="sheetbar"><div class="sheetbar-inner">
        <button class="btn light" type="button" onclick={() => openPicker(AddToPlan, { id: r.id })}>Einplanen</button>
        <a class="btn orange" href="#/r/{r.id}/kochen">Jetzt kochen</a>
      </div></div>
    {/if}
  </div>
</div>

<style>
  .rhero :global(img) { height: auto; }
  .sart img { width: 100%; height: 100%; object-fit: cover; }
</style>
