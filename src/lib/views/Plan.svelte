<script lang="ts">
  import { app } from '../app.svelte.ts';
  import { activeSlots, dayTotals, filled, getEntry, recipeOf } from '../core/plan.ts';
  import { SLOT_LABEL } from '../core/recipes.ts';
  import type { Slot } from '../core/types.ts';
  import { DAYS, addDays, dayIndex, isDate, mondayOf, mondayOfIso, shortDate, todayIso, weekDates } from '../core/util.ts';
  import { autofillWeek, copyPrevWeek } from '../actions.ts';
  import { openPicker } from '../ui.svelte.ts';
  import { entryInfo } from '../components/EntryInfo.ts';
  import EntrySub from '../components/EntrySub.svelte';
  import Thumb from '../components/Thumb.svelte';
  import Icon from '../components/Icon.svelte';
  import WeekNav from '../components/WeekNav.svelte';
  import Chooser from '../pickers/Chooser.svelte';
  import SlotMenu from '../pickers/SlotMenu.svelte';
  import WeekMenu from '../pickers/WeekMenu.svelte';

  let { a }: { a?: string; b?: string } = $props();
  const monday = $derived(isDate(a) ? mondayOfIso(a) : mondayOf());
  const today = todayIso();
  const slots = $derived(activeSlots());
  const dates = $derived(weekDates(monday));
  const any = $derived(dates.some(d => filled(d)));
  const goal = $derived(app.settings.goalKcal);

  // Ohne Datum in der URL: zum heutigen Tag scrollen
  $effect(() => {
    if (a || dayIndex(today) === 0) return;
    requestAnimationFrame(() => { const el = document.getElementById('day-' + today); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120); });
  });
  const choose = (date: string, slot: Slot) => openPicker(Chooser, { date, slot });
</script>

<div class="view wide">
  <div class="vhead"><WeekNav {monday} base="#/plan" showKw /></div>
  <div class="plantools">
    <button class="btn orange sm" type="button" onclick={() => autofillWeek(monday)}>{any ? 'Woche auffüllen' : 'Woche planen lassen'}</button>
    <a class="btn light sm" href="#/einkauf/{monday}">Einkaufsliste</a>
    <a class="btn light sm" href="#/ablauf/{monday}">Vorkochen</a>
    <button class="btn light sm" type="button" onclick={() => openPicker(WeekMenu, { monday })}>Mehr …</button>
  </div>

  {#if !any}
    <div class="card emptybox" style="margin-bottom:14px">
      <h2>Deine Woche ist noch frei</h2>
      <p>Lass dir die Woche planen: schnelles Frühstück unter der Woche, zwei Gerichte zum Vorkochen für die Thermobox und abwechslungsreiche Abendessen. Danach tauschst du, was dir nicht gefällt.</p>
      {#if app.weeks[addDays(monday, -7)]}<button class="btn light" type="button" onclick={() => copyPrevWeek(monday)}>Vorwoche übernehmen</button>{/if}
    </div>
  {/if}

  <div class="plandays">
    {#each dates as d, i (d)}
      {@const t = dayTotals(d)}
      <article class="card planday" class:today={d === today} id="day-{d}">
        <header>
          <b>{DAYS[i]}</b><span>{shortDate(d)}</span>
          <span class="kc">{#if t.n}<span class={t.kcal >= goal * 0.95 ? 'okmark' : 'lowmark'}>{Math.round(t.kcal)}</span> / {goal} kcal<br /><span class="meta"><span>{Math.round(t.protein)} g Eiweiß</span>{#if t.boost}<span>+{Math.round(t.boost)} kcal Extras</span>{/if}</span>{/if}</span>
        </header>
        {#each slots as slot (slot)}
          {@const e = getEntry(d, slot)}
          {@const r = recipeOf(e)}
          {@const box = slot === 'lunch' && app.settings.thermosDays.includes(i)}
          {#if !e}
            <div class="slot empty">
              <span class="thumb">+</span>
              <span><span class="lbl">{SLOT_LABEL[slot]}{box ? ' für die Thermobox' : ''}</span><br /><button class="addbtn" type="button" onclick={() => choose(d, slot)}>Gericht wählen</button></span>
              <span></span>
            </div>
          {:else}
            {@const info = entryInfo(d, slot, e)}
            <div class="slot">
              <span class="thumb">{#if r}<Thumb recipe={r} />{/if}</span>
              <span class="grow">
                <span class="lbl">{SLOT_LABEL[slot]}</span>
                {#if r}<a class="name" href="#/r/{r.id}">{info.title}</a>{:else}<span class="name">{info.title}</span>{/if}
                <span class="sub"><EntrySub parts={info.parts} /></span>
              </span>
              <button class="more" type="button" aria-label="{SLOT_LABEL[slot]} am {DAYS[i]}: Optionen" onclick={() => openPicker(SlotMenu, { date: d, slot })}><Icon name="dots" /></button>
            </div>
          {/if}
        {/each}
      </article>
    {/each}
  </div>
  <p class="small muted" style="margin-top:12px">Nährwerte pro Person. Über ⋯ kannst du ein Gericht tauschen, verschieben oder entfernen.</p>
</div>
