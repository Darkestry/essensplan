<script lang="ts">
  // Kochmodus: ein Schritt pro Seite, Wischen/Pfeiltasten, Bildschirm bleibt an.
  import type { Recipe } from '../core/types.ts';
  import { db } from '../app.svelte.ts';
  import { stepUrl } from '../art/art.ts';
  import { startTimer } from '../timer.svelte.ts';
  import { buzz, openPicker, picker } from '../ui.svelte.ts';
  import Icon from '../components/Icon.svelte';
  import Rating from '../pickers/Rating.svelte';
  import { qty, timerLabel } from './recipeFormat.ts';

  let { recipe: r, portions }: { recipe: Recipe; portions: number } = $props();

  let idx = $state(0);
  let root: HTMLDivElement | undefined = $state();
  const step = $derived(r.steps[Math.min(idx, r.steps.length - 1)]);
  const last = $derived(idx >= r.steps.length - 1);
  const items = $derived((step?.items || []).filter(k => db.F[k] && k !== 'water').map(k => {
    const ing = r.ingredients.find(i => i.k === k);
    const name = db.F[k].name.split(',')[0];
    return ing ? `${qty(k, ing.q * portions)} ${name}` : name;
  }));

  function go(delta: number): void {
    const n = idx + delta;
    if (n >= r.steps.length) {
      buzz(30);
      const id = r.id;
      history.back();
      setTimeout(() => openPicker(Rating, { id }), 350);
      return;
    }
    if (n < 0) return;
    idx = n; buzz();
    const sheet = root?.closest('.sheet');
    if (sheet) sheet.scrollTop = 0;
  }

  function onkeydown(e: KeyboardEvent): void {
    if (picker.component) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  }

  // Wischen links/rechts
  $effect(() => {
    const el = root; if (!el) return;
    let x: number | null = null, y = 0;
    const start = (e: TouchEvent) => { x = e.touches[0].clientX; y = e.touches[0].clientY; };
    const end = (e: TouchEvent) => {
      if (x === null) return;
      const dx = e.changedTouches[0].clientX - x, dy = e.changedTouches[0].clientY - y;
      x = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end); };
  });

  // Wake Lock, solange der Kochmodus offen ist
  $effect(() => {
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const request = async () => {
      try {
        if ('wakeLock' in navigator && !lock) {
          const l = await navigator.wakeLock.request('screen');
          if (!alive) { void l.release(); return; }
          lock = l;
          l.addEventListener('release', () => { if (lock === l) lock = null; });
        }
      } catch { lock = null; }
    };
    const onVis = () => { if (!document.hidden) void request(); };
    void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      try { void lock?.release(); } catch { /* egal */ }
      lock = null;
    };
  });
</script>

<svelte:window {onkeydown} />

<div class="cook" bind:this={root}>
  <div class="sheettop scrolled">
    <button class="iconbtn" type="button" aria-label="Kochen beenden" onclick={() => history.back()}><Icon name="close" /></button>
    <span class="ttl" id="sheetTitle">{r.title}</span>
    <span class="small muted" style="padding-right:10px">{idx + 1}/{r.steps.length}</span>
  </div>
  <div class="cprog" aria-hidden="true">{#each r.steps as _, i (i)}<i class:on={i <= idx}></i>{/each}</div>
  {#if step}
    <div class="cart"><img src={stepUrl(r, step, idx)} alt="" decoding="async" width="360" height="190" /></div>
    <div class="cbody">
      <div class="eyebrow">Schritt {idx + 1} von {r.steps.length}</div>
      <h2>{step.title}</h2>
      <p class="big">{step.text}</p>
      {#if items.length}<p class="needs"><b>Dafür:</b> {items.join(', ')}</p>{/if}
      {#if step.timer}{@const sec = step.timer}
        <button class="btn soft" type="button" style="margin-top:16px" onclick={() => startTimer(sec, r.title + ': ' + step.title)}>Timer starten: {timerLabel(sec)}</button>
      {/if}
    </div>
  {/if}
  <div class="cooknav">
    <button class="btn light" type="button" disabled={idx === 0} onclick={() => go(-1)}>Zurück</button>
    <button class="btn orange" type="button" onclick={() => go(1)}>{last ? 'Fertig gekocht' : 'Weiter'}</button>
  </div>
</div>

<style>
  .cart img { width: 100%; height: auto; }
</style>
