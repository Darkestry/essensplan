<script lang="ts">
  import Icon from './Icon.svelte';
  import { addDays, mondayOf, weekLabel, weekNumber } from '../core/util.ts';
  /** base: Ziel-Route ohne Datum, z. B. "#/plan" */
  let { monday, base, showKw = false }: { monday: string; base: string; showKw?: boolean } = $props();
  const thisWeek = mondayOf();
  const rel = $derived(monday === thisWeek ? 'Diese Woche' : monday === addDays(thisWeek, 7) ? 'Nächste Woche' : monday === addDays(thisWeek, -7) ? 'Letzte Woche' : '');
</script>

<div class="weeknav">
  <a class="iconbtn" href="{base}/{addDays(monday, -7)}" aria-label="Vorige Woche"><Icon name="back" /></a>
  <b>{#if showKw}KW {weekNumber(monday)}<small><span class="meta"><span>{weekLabel(monday)}</span>{#if rel}<span>{rel}</span>{/if}</span></small>{:else}{weekLabel(monday)}<small>{rel}</small>{/if}</b>
  <a class="iconbtn" href="{base}/{addDays(monday, 7)}" aria-label="Nächste Woche"><Icon name="chev" /></a>
</div>
