<script lang="ts">
  // Gewicht: Eintragen, Trend, Empfehlung zum Tagesziel, Kurve und Tabelle.
  import { app } from '../app.svelte.ts';
  import { setWeight, weightTrend } from '../core/plan.ts';
  import { addDays, isDate, parseIso, shortDate, todayIso } from '../core/util.ts';
  import { buzz, toast } from '../ui.svelte.ts';
  import WeightChart from '../components/WeightChart.svelte';

  const kg = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const today = todayIso();

  let date = $state(today);
  let kgInput = $state('');

  const w = $derived(app.weights);
  const last = $derived(w[w.length - 1] as { d: string; kg: number } | undefined);
  const t = $derived(weightTrend());
  const delta4 = $derived.by(() => {
    const fourAgo = addDays(todayIso(), -28);
    const ref = [...w].reverse().find(x => x.d <= fourAgo) || w[0];
    return last && ref && ref !== last ? last.kg - ref.kg : null;
  });
  const advice = $derived(t && t.weeks >= 2 ? (t.perWeek < 0.15 ? 'low' : t.perWeek > 0.75 ? 'high' : 'ok') : null);
  const entries = $derived([...w].reverse().slice(0, 30));
  const goal = $derived(app.settings.goalKcal);

  const signed = (n: number) => (n > 0 ? '+' : '') + kg(n);

  function goalDelta(delta: number): void {
    app.settings.goalKcal = Math.max(1200, Math.min(6000, app.settings.goalKcal + delta));
    if (Math.abs(delta) > 100) toast(`Tagesziel jetzt ${app.settings.goalKcal} kcal`);
  }
  function submit(e: SubmitEvent): void {
    e.preventDefault();
    const value = Number(kgInput.replace(',', '.'));
    if (!isDate(date) || !(value > 20 && value < 300)) { toast('Gib dein Gewicht in kg ein, zum Beispiel 58,5.'); return; }
    setWeight(date, value); buzz();
    toast('Gewicht eingetragen');
    kgInput = ''; date = todayIso();
  }
  function del(d: string): void {
    const prev = app.weights.find(x => x.d === d);
    setWeight(d, NaN);
    if (prev) toast('Eintrag gelöscht', { label: 'Rückgängig', run: () => setWeight(prev.d, prev.kg) });
  }
  const longDate = (d: string) => parseIso(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="view">
  <div class="vhead"><h1>Gewicht</h1><p class="lead">Wieg dich einmal pro Woche, morgens nach dem Aufstehen und vor dem Frühstück. Einzelne Tage schwanken, wichtig ist der Verlauf über mehrere Wochen.</p></div>
  <form class="card pad" onsubmit={submit}>
    <div class="row" style="gap:10px;align-items:flex-end">
      <label class="field grow" style="margin:0"><span>Datum</span><input type="date" bind:value={date} max={today} required style="width:100%;height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px" /></label>
      <label class="field" style="margin:0;width:120px"><span>kg</span><input type="number" inputmode="decimal" step="0.1" min="25" max="250" placeholder={last ? kg(last.kg) : '70,0'} required value={kgInput} oninput={e => { kgInput = e.currentTarget.value; }} style="width:100%;height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px;font-size:18px" /></label>
    </div>
    <button class="btn orange block" type="submit" style="margin-top:12px">Gewicht eintragen</button>
  </form>
  {#if last}
    <div class="daytotals" style="grid-template-columns:repeat(3,1fr);margin-top:14px">
      <div class="stat"><b>{kg(last.kg)}</b><span>kg aktuell</span></div>
      <div class="stat"><b>{delta4 === null ? '–' : signed(delta4)}</b><span>kg in 4 Wochen</span></div>
      <div class="stat"><b>{t ? signed(t.perWeek) : '–'}</b><span>kg pro Woche</span></div>
    </div>
  {/if}
  {#if t && advice}
    <div class="section">
      {#if advice === 'low'}
        <div class="infobox warm"><b>Fast gleich geblieben</b>{t.perWeek > 0.05 ? `Du legst gerade ${kg(t.perWeek)} kg pro Woche zu.` : 'Dein Gewicht ist in den letzten Wochen etwa gleich geblieben.'} Für Kraft und Energie sind etwa 0,25–0,5 kg pro Woche ein guter Weg. Mit rund 250 kcal mehr am Tag kommst du dahin.<div class="btnrow" style="margin-top:10px"><button class="btn orange sm" type="button" onclick={() => goalDelta(250)}>Tagesziel auf {goal + 250} kcal setzen</button></div></div>
      {:else if advice === 'high'}
        <div class="infobox warm"><b>Schneller als nötig</b>{kg(t.perWeek)} kg pro Woche ist mehr, als du für deinen Kraftaufbau brauchst. Mit etwa 0,25–0,5 kg pro Woche kommt mehr davon deinen Muskeln zugute.<div class="btnrow" style="margin-top:10px"><button class="btn light sm" type="button" onclick={() => goalDelta(-200)}>Tagesziel auf {goal - 200} kcal setzen</button></div></div>
      {:else}
        <div class="infobox"><b>Gut unterwegs</b>{kg(t.perWeek)} kg pro Woche, ein ruhiges Tempo für deinen Kraftaufbau. Mach weiter so.</div>
      {/if}
    </div>
  {/if}
  <div class="section"><WeightChart points={w.slice(-26)} /></div>
  {#if w.length}
    <section class="section">
      <div class="shead"><h2>Einträge</h2></div>
      <div class="card">
        {#each entries as x (x.d)}
          <div class="setrow"><span>{longDate(x.d)}</span><span class="row"><b>{kg(x.kg)} kg</b><button class="iconbtn" type="button" aria-label="Eintrag vom {shortDate(x.d)} löschen" onclick={() => del(x.d)}>×</button></span></div>
        {/each}
      </div>
    </section>
  {/if}
</div>
