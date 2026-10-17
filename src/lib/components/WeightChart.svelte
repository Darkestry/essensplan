<script lang="ts">
  // Gewichtskurve: eine Datenreihe → keine Legende; Titel benennt sie. Werte per Tippen/Hover.
  import { parseIso, shortDate } from '../core/util.ts';

  let { points }: { points: { d: string; kg: number }[] } = $props();

  const kg = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const W = 340, H = 190, L = 34, Rr = 10, T = 12, B = 26;

  const geo = $derived.by(() => {
    const xs = points.map(p => parseIso(p.d).getTime());
    const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
    let y0 = Math.floor(Math.min(...points.map(p => p.kg)) - 0.5), y1 = Math.ceil(Math.max(...points.map(p => p.kg)) + 0.5);
    if (y1 - y0 < 3) { y0 -= 1; y1 += 1; }
    const X = (t: number) => L + (t - x0) / (x1 - x0 || 1) * (W - L - Rr);
    const Y = (v: number) => T + (y1 - v) / (y1 - y0) * (H - T - B);
    const step = Math.max(1, Math.round((y1 - y0) / 4));
    const ticks: { v: number; y: number }[] = [];
    for (let v = y0; v <= y1; v += step) ticks.push({ v, y: Y(v) });
    const dots = points.map((p, i) => ({ i, cx: X(xs[i]), cy: Y(p.kg), label: `${shortDate(p.d)}: ${kg(p.kg)} kg` }));
    const path = dots.map((p, i) => `${i ? 'L' : 'M'}${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join('');
    return { ticks, dots, path };
  });
  const first = $derived(points[0]);
  const last = $derived(points[points.length - 1]);

  let svg: SVGSVGElement | undefined = $state();
  let tip: { text: string; left: number; top: number } | null = $state(null);

  function show(p: { cx: number; cy: number; label: string }): void {
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    // am Rand nicht abschneiden
    tip = { text: p.label, left: Math.max(70, Math.min(box.width - 70, p.cx / W * box.width)), top: p.cy / H * box.height };
  }
  function onDocClick(e: MouseEvent): void {
    if (tip && !(e.target instanceof Element && e.target.closest('.chart'))) tip = null;
  }
</script>

<svelte:document onclick={onDocClick} />

{#if points.length < 2}
  <div class="card pad small muted">Ab zwei Einträgen siehst du hier deinen Verlauf.</div>
{:else}
  <figure class="card chart" style="margin:0">
    <figcaption class="small muted" style="padding:12px 14px 0">Dein Gewicht in kg</figcaption>
    <div class="chartwrap">
      <svg bind:this={svg} viewBox="0 0 {W} {H}" role="img" aria-label="Gewichtsverlauf von {kg(first.kg)} auf {kg(last.kg)} kg">
        {#each geo.ticks as t (t.v)}
          <line x1={L} x2={W - Rr} y1={t.y} y2={t.y} class="cgrid" />
          <text x={L - 6} y={t.y + 4} text-anchor="end" class="caxis">{t.v}</text>
        {/each}
        <text x={L} y={H - 6} class="caxis">{shortDate(first.d)}</text>
        <text x={W - Rr} y={H - 6} text-anchor="end" class="caxis">{shortDate(last.d)}</text>
        <path d={geo.path} class="cline" />
        {#each geo.dots as p (p.i)}
          <circle cx={p.cx} cy={p.cy} r="4.5" class="cdot" />
          <circle
            cx={p.cx} cy={p.cy} r="14" fill="transparent" class="chit"
            role="button" tabindex="0" aria-label={p.label}
            onpointerenter={() => show(p)}
            onclick={() => show(p)}
            onfocus={() => show(p)}
            onblur={() => { tip = null; }}
            onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(p); } }}
          />
        {/each}
      </svg>
      {#if tip}<div class="ctip" style:left="{tip.left}px" style:top="{tip.top}px">{tip.text}</div>{/if}
    </div>
  </figure>
{/if}
