<script lang="ts">
  import type { Component } from 'svelte';
  import { app } from './lib/app.svelte.ts';
  import { router, isOverlay } from './lib/router.svelte.ts';
  import { picker, closePicker } from './lib/ui.svelte.ts';
  import { openItems } from './lib/core/shopping.ts';
  import { mondayOf } from './lib/core/util.ts';
  import { install, runInstall } from './lib/install.svelte.ts';
  import Icon from './lib/components/Icon.svelte';
  import PickerHost from './lib/components/PickerHost.svelte';
  import Toast from './lib/components/Toast.svelte';
  import Timers from './lib/components/Timers.svelte';
  // Häufig genutzte Seiten sofort, seltene erst bei Bedarf laden (Code-Splitting)
  import Today from './lib/views/Today.svelte';
  import Plan from './lib/views/Plan.svelte';
  import Recipes from './lib/views/Recipes.svelte';
  import Shopping from './lib/views/Shopping.svelte';
  import RecipeSheet from './lib/views/RecipeSheet.svelte';


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Page = Component<any>;
  const eager: Record<string, Page> = { heute: Today, plan: Plan, rezepte: Recipes, einkauf: Shopping };
  const lazy: Record<string, () => Promise<{ default: Page }>> = {
    ablauf: () => import('./lib/views/Prep.svelte'),
    mehr: () => import('./lib/views/More.svelte'),
    wissen: () => import('./lib/views/Guide.svelte'),
    gewicht: () => import('./lib/views/Weight.svelte'),
    vorrat: () => import('./lib/views/Pantry.svelte'),
    editor: () => import('./lib/views/Editor.svelte'),
  };
  const TITLES: Record<string, string> = { heute: 'Heute', plan: 'Wochenplan', rezepte: 'Rezepte', einkauf: 'Einkaufsliste', ablauf: 'Vorkochen', mehr: 'Mehr', wissen: 'Wissen', gewicht: 'Gewicht', vorrat: 'Vorratsschrank', editor: 'Eigenes Rezept' };
  const NAV: Record<string, string> = { heute: 'heute', plan: 'plan', ablauf: 'plan', rezepte: 'rezepte', editor: 'rezepte', einkauf: 'einkauf', mehr: 'mehr', wissen: 'mehr', vorrat: 'mehr', gewicht: 'heute' };
  const TABS = [
    { id: 'heute', label: 'Heute', icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
    { id: 'plan', label: 'Plan', icon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
    { id: 'rezepte', label: 'Rezepte', icon: '<path d="M4 19V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M9 7h6M9 11h4"/>' },
    { id: 'einkauf', label: 'Einkauf', icon: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>' },
    { id: 'mehr', label: 'Mehr', icon: '<path d="M4 6h16M4 12h16M4 18h16"/>' },
  ];

  let loaded: Record<string, Page> = $state({});
  const base = $derived(router.base);
  const page: Page | undefined = $derived(eager[base.name] ?? loaded[base.name]);
  $effect(() => {
    const n = base.name;
    if (!eager[n] && !lazy[n]) { location.replace('#/heute'); return; }
    if (lazy[n] && !loaded[n]) void lazy[n]().then(m => { loaded[n] = m.default; });
  });
  // Neue Seite → nach oben scrollen (Schließen eines Rezepts lässt die Position stehen)
  let lastKey = '';
  $effect(() => {
    const key = `${base.name}/${base.a ?? ''}/${base.b ?? ''}`;
    if (key !== lastKey) { lastKey = key; window.scrollTo(0, 0); document.title = `${TITLES[base.name] ?? 'Morgenwerk'} – Morgenwerk`; }
  });

  const badge = $derived(openItems(mondayOf()));
  const overlay = $derived(isOverlay() && router.route.a ? { id: router.route.a, cook: router.route.b === 'kochen' } : null);

  // Farbschema
  let systemDark = $state(matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = $derived(app.settings.theme === 'dark' || (app.settings.theme === 'auto' && systemDark));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { systemDark = e.matches; });
  $effect(() => {
    const t = app.settings.theme;
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', dark ? '#18121a' : '#f3f6ee'));
  });
  function toggleTheme(): void { app.settings.theme = dark ? 'light' : 'dark'; }

  let scrolled = $state(false);
  function onkeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    // Rezept-Overlay schließt RecipeSheet selbst
    if (picker.component) closePicker();
  }
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 70)} {onkeydown} />

<a class="skip" href="#view">Zum Inhalt springen</a>
<header class="appbar" class:scrolled>
  <a class="brand" href="#/heute" aria-label="Morgenwerk – Heute">
    <svg viewBox="0 0 50 50" aria-hidden="true"><path d="M5 33h40M12 27a13 13 0 0 1 26 0M25 3v6M7 10l5 5M43 10l-5 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /><path d="M9 38h32" stroke="var(--orange)" stroke-width="3" stroke-linecap="round" /></svg>
    <span>Morgenwerk</span>
  </a>
  <div class="appbar-title" aria-hidden="true">{TITLES[base.name] ?? ''}</div>
  <button class="iconbtn" type="button" aria-label="Zwischen hell und dunkel wechseln" onclick={toggleTheme}><Icon name="moon" size={22} /></button>
</header>

<main id="view" tabindex="-1">
  {#if page}
    {@const P = page}
    {#key `${base.name}/${base.a ?? ''}/${base.b ?? ''}`}
      <P a={base.a} b={base.b} installable={!!install.prompt} oninstall={runInstall} />
    {/key}
  {:else}
    <div class="loading">Lädt …</div>
  {/if}
</main>

<nav class="tabbar" aria-label="Hauptnavigation">
  {#each TABS as t (t.id)}
    <a href="#/{t.id}" aria-current={NAV[base.name] === t.id ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{@html t.icon}</svg>
      <span>{t.label}</span>
      {#if t.id === 'einkauf' && badge}<b class="navbadge">{badge > 99 ? '99+' : badge}</b>{/if}
    </a>
  {/each}
</nav>

{#if overlay}
  {#key overlay.id}<RecipeSheet id={overlay.id} cook={overlay.cook} />{/key}
{/if}
<PickerHost />
<Timers />
<Toast />
