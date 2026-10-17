<script lang="ts">
  import { activeSlots, dayTotals, filled, getEntry, recipeOf, week } from '../core/plan.ts';
  import { openItems } from '../core/shopping.ts';
  import { tasksOn } from '../core/prep.ts';
  import { SLOT_LABEL } from '../core/recipes.ts';
  import type { Slot } from '../core/types.ts';
  import { DAYS, DAYS_SHORT, addDays, dayIndex, isDate, mondayOfIso, parseIso, relDay, todayIso, weekDates } from '../core/util.ts';
  import { autofillWeek } from '../actions.ts';
  import { openPicker } from '../ui.svelte.ts';
  import { heroUrl } from '../art/art.ts';
  import { entryInfo } from '../components/EntryInfo.ts';
  import EntrySub from '../components/EntrySub.svelte';
  import Thumb from '../components/Thumb.svelte';
  import Icon from '../components/Icon.svelte';
  import TaskItem from '../components/TaskItem.svelte';
  import GoalCard from '../components/GoalCard.svelte';
  import WeightCard from '../components/WeightCard.svelte';
  import Chooser from '../pickers/Chooser.svelte';
  import SlotMenu from '../pickers/SlotMenu.svelte';

  let { a }: { a?: string; b?: string } = $props();
  const date = $derived(isDate(a) ? a : todayIso());
  const monday = $derived(mondayOfIso(date));
  const isToday = $derived(date === todayIso());
  const slots = $derived(activeSlots());
  const total = $derived(dayTotals(date));
  const tasks = $derived(tasksOn(date));
  const empty = $derived(!week(monday) || weekDates(monday).every(d => !filled(d)));
  const open = $derived(openItems(monday));
  const h = new Date().getHours();
  const greeting = h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
  const choose = (slot: Slot) => openPicker(Chooser, { date, slot });
</script>

<div class="view">
  <section class="hero">
    <div>
      <div class="eyebrow">{isToday ? greeting : relDay(date)}</div>
      <h1>{isToday ? 'Heute' : DAYS[dayIndex(date)]}</h1>
      <p class="lead">{parseIso(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</p>
    </div>
    <img class="art" src={heroUrl()} alt="" width="270" height="150" />
  </section>

  <nav class="daystrip" aria-label="Tage dieser Woche">
    {#each weekDates(monday) as d, i (d)}
      {@const f = filled(d)}
      <a class="daypill" href="#/heute/{d}" aria-current={d === date ? 'date' : undefined}>
        <small>{DAYS_SHORT[i]}</small><b>{parseIso(d).getDate()}</b><i class:full={f >= slots.length} class:part={f > 0 && f < slots.length}></i>
      </a>
    {/each}
  </nav>

  {#if empty}
    <div class="card emptybox section">
      <h2>Deine Woche ist noch frei</h2>
      <p>Lass dir eine ausgewogene Woche planen, mit Gerichten zum Vorkochen für die Thermobox. Danach tauschst du, was dir nicht gefällt.</p>
      <div class="btnrow"><button class="btn orange" type="button" onclick={() => autofillWeek(monday)}>Woche planen lassen</button><a class="btn light" href="#/plan/{monday}">Selbst planen</a></div>
    </div>
  {/if}

  <section class="section">
    <div class="shead"><h2>Mahlzeiten</h2><a href="#/plan/{monday}">Ganze Woche</a></div>
    <div class="card">
      {#each slots as slot (slot)}
        {@const e = getEntry(date, slot)}
        {@const r = recipeOf(e)}
        {#if !e}
          <button type="button" class="meal empty" onclick={() => choose(slot)}>
            <span class="thumb">+</span><span><span class="mslot">{SLOT_LABEL[slot]}</span><h3>Gericht wählen</h3><p>Noch frei</p></span><span></span>
          </button>
        {:else}
          {@const info = entryInfo(date, slot, e)}
          {#if r}
            <a class="meal" href="#/r/{r.id}">
              <span class="thumb"><Thumb recipe={r} eager /></span>
              <span><span class="mslot">{SLOT_LABEL[slot]}</span><h3>{info.title}</h3><p><EntrySub parts={info.parts} /></p></span>
              <span class="go" aria-hidden="true"><Icon name="chev" size={18} /></span>
            </a>
          {:else}
            <button type="button" class="meal" onclick={() => openPicker(SlotMenu, { date, slot })}>
              <span class="thumb"></span><span><span class="mslot">{SLOT_LABEL[slot]}</span><h3>{info.title}</h3><p><EntrySub parts={info.parts} /></p></span><span></span>
            </button>
          {/if}
        {/if}
      {/each}
    </div>
  </section>

  {#if total.n}<GoalCard {date} />{/if}
  <WeightCard />

  <section class="section">
    <div class="shead"><h2>Zu tun</h2><a href="#/ablauf/{monday}">Alle Aufgaben</a></div>
    {#if tasks.length}
      <ul class="card tasks">{#each tasks as t (t.id)}<TaskItem task={t} {date} />{/each}</ul>
    {:else}
      <div class="card pad muted small">Heute musst du nichts vorbereiten.{filled(addDays(date, 1)) ? ' Morgen kochst du alles frisch.' : ''}</div>
    {/if}
  </section>

  {#if open}
    <section class="section">
      <a class="card pad row" href="#/einkauf/{monday}" style="text-decoration:none"><div class="grow"><b>Einkaufsliste</b><div class="small muted">Noch {open} Artikel für diese Woche</div></div><Icon name="chev" /></a>
    </section>
  {/if}
</div>

<style>
  .meal.empty, button.meal { width: 100%; border: 0; background: none; text-align: left; font: inherit; color: inherit; }
</style>
