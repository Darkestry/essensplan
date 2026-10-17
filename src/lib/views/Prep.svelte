<script lang="ts">
  // Vorkochen: Einfrieren, Auftauen, Thermobox – automatisch aus dem Plan.
  import { prepTasks } from '../core/prep.ts';
  import type { Task } from '../core/types.ts';
  import { DAYS, dayIndex, isDate, mondayOf, mondayOfIso, shortDate } from '../core/util.ts';
  import TaskItem from '../components/TaskItem.svelte';
  import WeekNav from '../components/WeekNav.svelte';

  let { a }: { a?: string } = $props();

  const monday = $derived(isDate(a) ? mondayOfIso(a) : mondayOf());
  const days = $derived.by(() => {
    const byDate: Record<string, Task[]> = {};
    for (const t of prepTasks(monday)) (byDate[t.date] ||= []).push(t);
    return Object.keys(byDate).sort().map(date => ({ date, tasks: byDate[date] }));
  });
  const dayName = (d: string) => (d < monday ? (dayIndex(d) === 6 ? 'Sonntag' : DAYS[dayIndex(d)]) + ' davor' : DAYS[dayIndex(d)]);
</script>

<div class="view">
  <div class="vhead">
    <h1>Was du vorbereiten kannst</h1>
    <p class="lead">Damit morgens und mittags alles schnell geht. Die Liste entsteht aus deinem Plan: vorkochen, einfrieren, auftauen und die Thermobox packen.</p>
    <div style="margin-top:12px"><WeekNav {monday} base="#/ablauf" /></div>
  </div>
  {#if days.length}
    <div class="tl">
      {#each days as { date, tasks } (date)}
        <div class="tlday">
          <b>{dayName(date)}, {shortDate(date)}</b>
          <ul class="card tasks">{#each tasks as t (t.id)}<TaskItem task={t} />{/each}</ul>
        </div>
      {/each}
    </div>
  {:else}
    <div class="card emptybox"><h2>Noch nichts vorzubereiten</h2><p>Plane ein paar Gerichte ein. Dann siehst du hier, was du vorkochen, einfrieren oder auftauen kannst.</p><a class="btn" href="#/plan/{monday}">Zum Plan</a></div>
  {/if}
  <div class="card pad section small"><b>Die wichtigsten Regeln</b><p class="muted" style="margin-top:4px">Gekochtes in flachen Dosen rasch abkühlen und innerhalb von 2 Stunden kühlen (≤ 5 °C). Reis höchstens bis zum nächsten Tag kühlen. Aufgetautes nicht wieder einfrieren. Mehr unter <a href="#/wissen/lagern">Vorkochen & Lagern</a>.</p></div>
</div>
