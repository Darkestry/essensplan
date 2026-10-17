<script lang="ts">
  // Tagesziel: Fortschritt + Booster, um die Lücke zu schließen
  import { app } from '../app.svelte.ts';
  import { boosterLabel, boosterSuggestions, boostsOn, dayTotals, toggleBoost } from '../core/plan.ts';
  import { buzz } from '../ui.svelte.ts';
  let { date }: { date: string } = $props();

  const s = $derived(app.settings);
  const t = $derived(dayTotals(date));
  const gap = $derived(Math.round(s.goalKcal - t.kcal));
  const pGap = $derived(Math.round(s.goalProtein - t.protein));
  const active = $derived(boostsOn(date));
  const sugg = $derived(gap > 80 || pGap > 10 ? boosterSuggestions(date).slice(0, 4) : []);
  const bars = $derived([
    { label: 'Energie', val: t.kcal, goal: s.goalKcal, unit: 'kcal' },
    { label: 'Eiweiß', val: t.protein, goal: s.goalProtein, unit: 'g' },
  ]);
  function toggle(id: string): void { toggleBoost(date, id); buzz(); }
</script>

<section class="section">
  <div class="shead"><h2>Tagesziel</h2><a href="#/mehr">Ziel anpassen</a></div>
  <div class="card pad">
    <p class="small muted" style="margin-bottom:10px">So viel Energie und Eiweiß tun dir heute gut, damit du Kraft aufbaust.</p>
    {#each bars as b (b.label)}
      {@const ok = b.val >= b.goal * 0.95}
      <div class="goalrow">
        <div class="row"><b class="grow">{b.label}</b><span class="small"><b>{Math.round(b.val).toLocaleString('de-DE')}</b> / {b.goal.toLocaleString('de-DE')} {b.unit}{#if ok}&nbsp;<span class="okmark">✓</span>{/if}</span></div>
        <div class="progress" class:warn={!ok} role="progressbar" aria-label={b.label} aria-valuenow={Math.round(b.val)} aria-valuemin={0} aria-valuemax={b.goal}>
          <span style:width="{Math.min(100, Math.round(b.val / b.goal * 100))}%"></span>
        </div>
      </div>
    {/each}
    <p class="small muted" style="margin-top:8px">
      {#if gap > 80}Noch <b>{gap} kcal</b>{#if pGap > 10}&nbsp;und <b>{pGap} g Eiweiß</b>{/if} bis zu deinem Ziel.
      {:else if pGap > 10}Energie passt. Noch <b>{pGap} g Eiweiß</b> bis zu deinem Ziel.
      {:else}Ziel erreicht. Du bist heute gut versorgt.{/if}
      Werte pro Person{s.appetite !== 1 ? ', mit deiner Portionsgröße' : ''}.
    </p>
    {#if active.length}
      <div class="tags" style="margin-top:10px">
        {#each active as b (b)}<button type="button" class="chip" aria-pressed="true" onclick={() => toggle(b)}>✓ {boosterLabel(b)}</button>{/each}
      </div>
    {/if}
    {#if sugg.length}
      <div class="small" style="margin-top:12px;font-weight:650">Kleine Extras dazu</div>
      <div class="tags" style="margin-top:6px">
        {#each sugg as b (b.id)}<button type="button" class="chip" aria-pressed="false" onclick={() => toggle(b.id)}>+ {boosterLabel(b.id)} <span class="muted">{Math.round(b.n.kcal)} kcal</span></button>{/each}
      </div>
    {/if}
  </div>
</section>
