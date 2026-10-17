<script lang="ts">
  import { app } from '../app.svelte.ts';
  import { weightTrend } from '../core/plan.ts';
  import { diffDays, todayIso } from '../core/util.ts';
  import Icon from './Icon.svelte';
  const last = $derived(app.weights.at(-1));
  const trend = $derived(weightTrend());
  const due = $derived(!last || diffDays(todayIso(), last.d) >= 7);
  const kg = (n: number) => n.toLocaleString('de-DE');
</script>

<section class="section">
  <a class="card pad row" href="#/gewicht" style="text-decoration:none">
    <div class="grow"><b>Gewicht</b>
      <div class="small muted">
        <span class="meta">
          {#if last}<span>{kg(last.kg)} kg</span>{#if trend}<span>{trend.perWeek > 0 ? '+' : ''}{kg(trend.perWeek)} kg pro Woche</span>{/if}{:else}<span>Trag dein erstes Gewicht ein</span>{/if}
          {#if due && last}<span><b style="color:var(--orange)">Zeit fürs Wiegen</b></span>{/if}
        </span>
      </div>
    </div>
    <Icon name="chev" />
  </a>
</section>
