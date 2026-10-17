<script lang="ts">
  // Editor für eigene Rezepte: #/editor/neu, #/editor/<uid>, #/editor/kopie/<rezeptId>
  import { untrack } from 'svelte';
  import { app, db } from '../app.svelte.ts';
  import { confirm } from '../actions.ts';
  import { SLOTS, SLOT_LABEL, nutritionOf, sanitizeCustom } from '../core/recipes.ts';
  import type { Art, Ingredient, RecipeSource, Slot, Step } from '../core/types.ts';
  import { norm } from '../core/util.ts';
  import { toast } from '../ui.svelte.ts';
  import Icon from '../components/Icon.svelte';

  interface Props { a?: string; b?: string }
  let { a, b }: Props = $props();

  interface Draft {
    id: string; basedOn?: string; meals: Slot[]; title: string; subtitle: string;
    time: RecipeSource['time']; difficulty: 1 | 2 | 3; tags: string[]; storage: RecipeSource['storage'];
    tools: string[]; ingredients: Ingredient[]; steps: Step[]; tips: string[]; art?: Art;
  }
  const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
  function nextCustomId(): string { let n = 1; while (app.custom.some(c => c.id === 'u' + n)) n++; return 'u' + n; }

  function makeDraft(mode: string | undefined, ref: string | undefined): Draft {
    const own = mode && mode !== 'neu' && mode !== 'kopie' ? app.custom.find(c => c.id === mode) : undefined;
    if (own) return clone(own);
    const r = mode === 'kopie' && ref ? db.byId.get(ref) : undefined;
    if (r) {
      const c = r.source;
      return clone({ id: nextCustomId(), basedOn: r.id, meals: r.meals, title: r.title + ' (meine Version)', subtitle: c.subtitle, time: r.time, difficulty: r.difficulty, tags: r.tags, storage: r.storage, tools: r.tools, ingredients: c.ingredients, steps: c.steps, tips: c.tips, art: r.art });
    }
    return { id: nextCustomId(), meals: ['dinner'], title: '', subtitle: '', time: { active: 15, total: 30, quick: null }, difficulty: 1, tags: [], storage: { fridgeDays: 2, freeze: false, thermos: false, note: '' }, tools: ['Edelstahlpfanne 28 cm'], ingredients: [], steps: [{ title: '', text: '', action: 'pan', items: [] }], tips: [] };
  }

  // Entwurf: bei jedem Routenwechsel (und nach dem Speichern) neu anlegen
  let draft = $state<Draft>(untrack(() => makeDraft(a, b)));
  let ingQuery = $state('');
  let generation = $state(0);
  let draftKey = untrack(() => `${a}/${b}/0`);
  $effect.pre(() => {
    const key = `${a}/${b}/${generation}`;
    if (key === draftKey) return;
    draftKey = key;
    untrack(() => { draft = makeDraft(a, b); ingQuery = ''; });
  });

  const existing = $derived(app.custom.some(c => c.id === draft.id));
  const tipsText = $derived(draft.tips.join('\n'));

  const ingHits = $derived.by(() => {
    if (!ingQuery.trim()) return null;
    const q = norm(ingQuery);
    return Object.keys(db.F).filter(k => k !== 'water' && !k.startsWith('goat') && norm(db.F[k].name).includes(q)).slice(0, 8);
  });
  const preview = $derived.by(() => {
    const ok = sanitizeCustom([{ ...$state.snapshot(draft), title: draft.title || 'x' }], db.F)[0];
    return ok ? nutritionOf(ok.ingredients, db.F) : null;
  });

  const ACTIONS: [string, string][] = [['cut', 'Schneiden'], ['mix', 'Rühren'], ['pan', 'Braten'], ['pot', 'Kochen'], ['oven', 'Ofen'], ['blend', 'Pürieren'], ['jar', 'Thermobox'], ['plate', 'Anrichten']];
  const numStyle = 'width:100%;height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px';
  const areaStyle = 'width:100%;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:10px 12px;font-size:16px';

  let titleInput: HTMLInputElement | undefined = $state();
  let ingInput: HTMLInputElement | undefined = $state();

  function toggleMeal(m: Slot): void {
    draft.meals = draft.meals.includes(m) ? draft.meals.filter(x => x !== m) : [...draft.meals, m];
    if (!draft.meals.length) draft.meals = [m];
  }
  function addIng(k: string): void {
    draft.ingredients.push({ k, q: db.F[k].staple ? 5 : 100 });
    ingQuery = '';
  }
  function setTimer(s: Step, v: string): void {
    const m = Number(v);
    if (m > 0) s.timer = Math.round(m * 60); else delete s.timer;
  }

  function save(): void {
    if (!draft.title.trim()) { toast('Gib deinem Rezept noch einen Namen.'); titleInput?.focus(); return; }
    if (!draft.ingredients.length) { toast('Füge mindestens eine Zutat hinzu.'); ingInput?.focus(); return; }
    // Für die Zeichnung: Zutaten, die im Schritt erwähnt werden, als sichtbare Zutaten übernehmen
    for (const st of draft.steps) {
      const t = norm(st.text || '');
      st.items = draft.ingredients.map(i => i.k).filter(k => norm(db.F[k].name).split(/[^a-z]+/).some(w => w.length > 3 && t.includes(w.slice(0, 6)))).slice(0, 3);
    }
    const [clean] = sanitizeCustom([$state.snapshot(draft)], db.F);
    if (!clean) { toast('Da fehlt noch etwas. Prüf bitte Zutaten und Mengen.'); return; }
    const i = app.custom.findIndex(c => c.id === clean.id);
    if (i >= 0) app.custom[i] = clean; else app.custom.push(clean);
    generation++;
    toast('Rezept gespeichert');
    location.hash = '#/r/' + clean.id;
  }
  function remove(): void {
    const id = draft.id;
    confirm('Rezept löschen?', 'Es verschwindet auch aus allen Plänen.', 'Rezept löschen', () => {
      app.custom = app.custom.filter(c => c.id !== id);
      for (const w of Object.values(app.weeks)) for (const d of w.days) for (const sl of SLOTS) { const e = d[sl]; if (e && 'r' in e && e.r === id) d[sl] = null; }
      app.favorites = app.favorites.filter(x => x !== id);
      app.blocked = app.blocked.filter(x => x !== id);
      generation++;
      location.hash = '#/rezepte';
      toast('Rezept gelöscht');
    });
  }
</script>

{#snippet num(label: string, unit: string, value: number, set: (v: number) => void, max = 600)}
  <label class="field" style="margin:0"><span>{label}</span><input type="number" inputmode="numeric" min="0" {max} {value} oninput={e => set(Number(e.currentTarget.value))} style={numStyle} /> <small class="muted">{unit}</small></label>
{/snippet}

<div class="view editor">
  <div class="vhead">
    <a class="linkbtn" href={draft.basedOn ? '#/r/' + draft.basedOn : '#/rezepte'}>Zurück</a>
    <div class="eyebrow" style="margin-top:8px">{existing ? 'Rezept bearbeiten' : draft.basedOn ? 'Eigene Version' : 'Neues Rezept'}</div>
    <h1>{draft.title || 'Eigenes Rezept'}</h1>
    <p class="lead">Mengen gelten für <b>1 Portion</b>. Nährwerte, Allergene und Einkaufsliste rechnet die App für dich aus.</p>
  </div>

  <div class="card pad">
    <label class="field"><span>Name</span><input type="text" bind:this={titleInput} bind:value={draft.title} maxlength="80" placeholder="z. B. Omas Linseneintopf" /></label>
    <label class="field"><span>Kurzbeschreibung</span><input type="text" bind:value={draft.subtitle} maxlength="140" placeholder="Optional" /></label>
    <div class="field"><span>Mahlzeit</span><div class="tags" role="group" aria-label="Mahlzeit">
      {#each SLOTS as m (m)}<button type="button" class="chip" aria-pressed={draft.meals.includes(m)} onclick={() => toggleMeal(m)}>{SLOT_LABEL[m]}</button>{/each}
    </div></div>
    <div class="row" style="gap:10px;align-items:flex-start">
      {@render num('Aktiv', 'Min.', draft.time.active, v => (draft.time.active = v))}
      {@render num('Gesamt', 'Min.', draft.time.total, v => (draft.time.total = v))}
      {@render num('Hält gekühlt', 'Tage', draft.storage.fridgeDays, v => (draft.storage.fridgeDays = v), 7)}
    </div>
    <label class="setrow" style="padding:12px 0 0"><span><b>Einfrierbar</b></span><span class="switch"><input type="checkbox" bind:checked={draft.storage.freeze} /><i></i></span></label>
    <label class="setrow" style="padding:12px 0 0;border:0"><span><b>Thermobox-tauglich</b><small>Eintopf, Curry, Suppe …</small></span><span class="switch"><input type="checkbox" bind:checked={draft.storage.thermos} /><i></i></span></label>
  </div>

  <section class="section"><div class="shead"><h2>Zutaten</h2></div>
    <div class="card">
      {#each draft.ingredients as i, n (n)}
        {@const f = db.F[i.k]}
        <div class="setrow">
          <span class="grow"><b>{f?.name || i.k}</b></span>
          <span class="row" style="gap:6px">
            <input type="number" inputmode="decimal" min="0" step="any" value={i.q} oninput={e => (i.q = Number(e.currentTarget.value))} aria-label="Menge {f?.name || ''}" style="width:84px;height:42px;border-radius:10px;border:1px solid var(--line);background:var(--card);padding:0 8px;text-align:right" />{f?.unit || ''}
            <button class="iconbtn" type="button" aria-label="Entfernen" onclick={() => draft.ingredients.splice(n, 1)}>×</button>
          </span>
        </div>
      {:else}
        <p class="pad small muted">Noch keine Zutaten. Such unten nach der ersten.</p>
      {/each}
    </div>
    <div class="search" style="margin-top:10px">
      <Icon name="search" />
      <input type="search" bind:this={ingInput} bind:value={ingQuery} placeholder="Zutat hinzufügen: Linsen, Feta …" autocomplete="off" aria-label="Zutat suchen" />
    </div>
    <div class="card" style="padding:0 8px">
      {#if ingHits}
        {#each ingHits as k (k)}
          <button type="button" class="pickrow" style="grid-template-columns:1fr auto" onclick={() => addIng(k)}>
            <span><b>{db.F[k].name}</b><small><span class="meta"><span>{db.F[k].group}</span><span>{db.F[k].kcal} kcal pro 100 {db.F[k].unit}</span></span></small></span><Icon name="plus" />
          </button>
        {:else}
          <p class="small muted" style="padding:8px 4px">Keine passende Zutat. Versuch einen anderen Namen, zum Beispiel „Kichererbsen“.</p>
        {/each}
      {/if}
    </div>
    <div style="margin-top:12px">
      {#if preview}
        <div class="nutri"><div><b>{preview.kcal}</b><span>kcal</span></div><div><b>{Math.round(preview.protein)} g</b><span>Eiweiß</span></div><div><b>{Math.round(preview.carbs)} g</b><span>Kohlenh.</span></div><div><b>{Math.round(preview.fat)} g</b><span>Fett</span></div><div><b>{Math.round(preview.fiber)} g</b><span>Ballastst.</span></div></div>
      {:else}
        <span class="small muted">Füge Zutaten hinzu, um Nährwerte zu sehen.</span>
      {/if}
    </div>
  </section>

  <section class="section"><div class="shead"><h2>Zubereitung</h2></div>
    {#each draft.steps as s, n (n)}
      <div class="card pad" style="margin-bottom:10px">
        <div class="row"><b class="grow">Schritt {n + 1}</b><button class="iconbtn" type="button" aria-label="Schritt {n + 1} entfernen" onclick={() => draft.steps.splice(n, 1)}>×</button></div>
        <label class="field"><span>Überschrift</span><input type="text" bind:value={s.title} maxlength="80" placeholder="z. B. Zwiebeln anbraten" /></label>
        <label class="field"><span>Was ist zu tun?</span><textarea bind:value={s.text} rows="4" maxlength="1200" style={areaStyle}></textarea></label>
        <div class="row" style="gap:10px">
          <label class="field" style="margin:0;width:140px"><span>Timer (Min.)</span><input type="number" min="0" max="600" inputmode="numeric" value={s.timer ? Math.round(s.timer / 60) : ''} oninput={e => setTimer(s, e.currentTarget.value)} style="width:100%;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px" /></label>
          <label class="field grow" style="margin:0"><span>Bild zum Schritt</span>
            <select bind:value={s.action}>
              {#each ACTIONS as [v, l] (v)}<option value={v}>{l}</option>{/each}
            </select>
          </label>
        </div>
      </div>
    {/each}
    <button class="btn light block" type="button" onclick={() => draft.steps.push({ title: '', text: '', action: 'mix', items: [] })}>+ Schritt hinzufügen</button>
  </section>

  <section class="section">
    <label class="field"><span>Tipps & Notizen (eine pro Zeile)</span><textarea rows="3" style={areaStyle} value={tipsText} onchange={e => (draft.tips = e.currentTarget.value.split('\n').map(t => t.trim()).filter(Boolean))}></textarea></label>
  </section>

  <div class="btnrow section">
    <button class="btn orange" type="button" onclick={save}>Rezept speichern</button>
    {#if existing}<button class="btn light" type="button" onclick={remove} style="color:var(--danger)">Rezept löschen</button>{/if}
  </div>
  <p class="small muted" style="margin-top:10px">Damit es zu den anderen Rezepten passt: ohne Ei, Brot und Schwein. In Edelstahl erst vorheizen, dann Wassertropfen-Test, dann Öl.</p>
</div>
