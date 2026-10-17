<script lang="ts">
  // Einstellungen & Wissen
  import { app, db, resetAll, storage } from '../app.svelte.ts';
  import { confirm, exportState, importFile } from '../actions.ts';
  import { ALLERGENS, SLOTS, SLOT_LABEL } from '../core/recipes.ts';
  import type { Settings } from '../core/types.ts';
  import { DAYS_SHORT } from '../core/util.ts';
  import { go } from '../router.svelte.ts';
  import { toast } from '../ui.svelte.ts';
  import Icon from '../components/Icon.svelte';
  import Seg from '../components/Seg.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Switch from '../components/Switch.svelte';

  let { installable = false, oninstall }: { installable?: boolean; oninstall?: () => void } = $props();

  const s = $derived(app.settings);
  let fileInput: HTMLInputElement | undefined = $state();

  function goalDelta(delta: number): void {
    s.goalKcal = Math.max(1200, Math.min(6000, s.goalKcal + delta));
    if (Math.abs(delta) > 100) toast(`Tagesziel jetzt ${s.goalKcal} kcal`);
  }
  const proteinDelta = (delta: number) => { s.goalProtein = Math.max(30, Math.min(400, s.goalProtein + delta)); };
  const personsDelta = (delta: number) => { s.persons = Math.max(1, Math.min(6, s.persons + delta)); };
  function setMilk(v: Settings['milk']): void {
    if (s.milk === v) return;
    s.milk = v;
    toast(v === 'goat' ? 'Rezepte nutzen jetzt Ziegen- & Schafsmilchprodukte' : 'Rezepte nutzen jetzt Kuhmilchprodukte');
  }
  function toggleThermos(d: number): void {
    s.thermosDays = s.thermosDays.includes(d) ? s.thermosDays.filter(x => x !== d) : [...s.thermosDays, d].sort();
  }
  function toggleExclude(k: string): void {
    s.exclude = s.exclude.includes(k) ? s.exclude.filter(x => x !== k) : [...s.exclude, k];
  }
  function askReset(): void {
    confirm('Alles zurücksetzen?', 'Pläne, Häkchen, Favoriten und Einstellungen werden auf diesem Gerät gelöscht. Sichere deinen Plan vorher, wenn du etwas behalten willst.', 'Alles zurücksetzen', () => {
      resetAll();
      go('#/heute');
    });
  }
  async function onImport(e: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const input = e.currentTarget;
    await importFile(input.files?.[0]);
    input.value = '';
  }
  const allergens = Object.entries(ALLERGENS).filter(([k]) => k !== 'ei');
</script>

{#snippet chev()}<Icon name="chev" />{/snippet}

<div class="view settings">
  <div class="vhead"><h1>Einstellungen & Wissen</h1></div>

  <section class="section"><div class="shead"><h2>Wissen</h2></div>
    <nav class="card guidelist">
      <a href="#/wissen/edelstahl"><span class="gi"><svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="14" cy="17" rx="11" ry="7" fill="#c9d0d4" stroke="#5d676d" /><path d="M24 15l7-3" stroke="#5d676d" stroke-width="3" stroke-linecap="round" /><circle cx="11" cy="16" r="2" fill="#9cc9e0" /><circle cx="16" cy="18" r="1.5" fill="#9cc9e0" /></svg></span><span><b>Kochen mit Edelstahl</b><small>Vorheizen, Wassertropfen-Test, nichts kleben lassen</small></span>{@render chev()}</a>
      <a href="#/wissen/thermobox"><span class="gi"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="6" width="14" height="22" rx="4" fill="#c9d0d4" stroke="#5d676d" /><rect x="9" y="4" width="14" height="5" rx="2" fill="#3f5a4c" /><rect x="9" y="15" width="14" height="5" fill="#3f5a4c" /></svg></span><span><b>Thermobox richtig nutzen</b><small>Heiß bleibt sicher: so geht's bis mittags</small></span>{@render chev()}</a>
      <a href="#/wissen/ziege"><span class="gi"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 4h10v5l3 4v15H8V13l3-4z" fill="#fbfaf6" stroke="#3f5a4c" /><rect x="8" y="16" width="16" height="7" fill="#e3eadb" /><path d="M13 19c1-2 5-2 6 0" stroke="#3f5a4c" fill="none" /></svg></span><span><b>Kochen mit Ziegenmilch</b><small>Was sich ändert und wie es cremig bleibt</small></span>{@render chev()}</a>
      <a href="#/wissen/lagern"><span class="gi"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="4" width="18" height="25" rx="3" fill="#e3eadb" stroke="#3f5a4c" /><path d="M7 13h18M11 8v3M11 17v4" stroke="#3f5a4c" stroke-width="2" /></svg></span><span><b>Vorkochen & Lagern</b><small>Abkühlen, Haltbarkeit, Einfrieren, Auftauen</small></span>{@render chev()}</a>
    </nav>
  </section>

  <section class="section"><div class="shead"><h2>Tagesziel</h2></div>
    <div class="card">
      <div class="setrow"><span><b>Energie pro Tag</b><small>Zum Zulegen etwa 300–500 kcal mehr, als du im Alltag verbrauchst</small></span><Stepper value={s.goalKcal} minWidth={58} labelLess="100 kcal weniger" labelMore="100 kcal mehr" onchange={d => goalDelta(d * 100)} /></div>
      <div class="setrow"><span><b>Eiweiß pro Tag</b><small>Für Kraftaufbau etwa 1,6–2 g je kg Körpergewicht</small></span><Stepper value={s.goalProtein} display="{s.goalProtein} g" minWidth={58} labelLess="5 g weniger" labelMore="5 g mehr" onchange={d => proteinDelta(d * 5)} /></div>
      <a class="setrow" href="#/gewicht" style="text-decoration:none;color:inherit"><span><b>Gewicht & Verlauf</b><small>Einmal pro Woche eintragen. Du bekommst Hinweise zu deinem Tagesziel.</small></span>{@render chev()}</a>
    </div>
  </section>

  <section class="section"><div class="shead"><h2>Haushalt</h2></div>
    <div class="card">
      <div class="setrow"><span><b>Personen</b><small>Mengen und Einkauf passen sich an</small></span><Stepper value={s.persons} labelLess="Weniger Personen" labelMore="Mehr Personen" onchange={personsDelta} /></div>
      <div class="setrow" style="display:block"><b>Portionsgröße</b><small style="margin-bottom:8px">Für kleineren oder größeren Hunger. Gilt für alle Mengen.</small><Seg label="Portionsgröße" value={s.appetite} options={[[0.8, 'Klein'], [1, 'Normal'], [1.25, 'Groß'], [1.5, 'Sehr groß']]} onchange={v => { s.appetite = v; }} /></div>
    </div>
  </section>

  <section class="section"><div class="shead"><h2>Mahlzeiten planen</h2></div>
    <div class="card">
      {#each SLOTS as sl (sl)}
        <Switch title={SLOT_LABEL[sl]} checked={s.slots[sl]} onchange={v => { s.slots[sl] = v; }} />
      {/each}
      <div class="setrow" style="display:block"><b>Thermobox-Tage</b><small style="margin-bottom:8px">An diesen Tagen nimmst du dein Mittagessen in der Box mit</small>
        <div class="daygrid" role="group" aria-label="Thermobox-Tage">{#each DAYS_SHORT as d, i (d)}<button type="button" aria-pressed={s.thermosDays.includes(i)} onclick={() => toggleThermos(i)}>{d}</button>{/each}</div>
      </div>
      <div class="setrow" style="display:block"><b>Größe deiner Thermobox</b><small style="margin-bottom:8px">Die Rezepte zeigen, ob eine Portion hineinpasst</small><Seg label="Größe der Thermobox" value={s.boxMl} options={[[500, '500 ml'], [650, '650 ml'], [750, '750 ml'], [1000, '1 l']]} onchange={v => { s.boxMl = v; }} /></div>
      <div class="setrow" style="display:block"><b>Großer Einkauf</b><small style="margin-bottom:8px">Danach richtet sich, wann Fisch und Fleisch ins Gefrierfach sollten</small><Seg label="Großer Einkauf" value={s.shopDay} options={[[-3, 'Freitag'], [-2, 'Samstag'], [-1, 'Sonntag']]} onchange={v => { s.shopDay = v; }} /></div>
    </div>
  </section>

  <section class="section"><div class="shead"><h2>Ernährung</h2></div>
    <div class="card">
      <div class="setrow" style="display:block"><b>Ernährungsform</b><small style="margin-bottom:8px">Alle Rezepte sind ohne Ei, Brot und Schwein</small><Seg label="Ernährungsform" value={s.diet} options={[['all', 'Alles'], ['pesc', 'Fisch ok'], ['veg', 'Vegetarisch'], ['vegan', 'Vegan']]} onchange={v => { s.diet = v; }} /></div>
      <div class="setrow" style="display:block"><b>Milchprodukte</b><small style="margin-bottom:8px">Ziege & Schaf: Quark, Joghurt, Milch, Käse & Co. werden in allen Rezepten, Nährwerten und im Einkauf ersetzt</small><Seg label="Milchprodukte" value={s.milk} options={[['cow', 'Kuh'], ['goat', 'Ziege & Schaf']]} onchange={setMilk} />{#if s.milk === 'goat'}<a class="linkbtn" href="#/wissen/ziege">Tipps zum Kochen mit Ziegenmilch</a>{/if}</div>
      <div class="setrow" style="display:block"><b>Allergene ausschließen</b><small style="margin-bottom:8px">Rezepte mit diesen Zutaten werden ausgeblendet und nicht vorgeschlagen</small>
        <div class="tags">{#each allergens as [k, l] (k)}<button type="button" class="chip" aria-pressed={s.exclude.includes(k)} onclick={() => toggleExclude(k)}>{l}</button>{/each}</div>
      </div>
    </div>
  </section>

  <section class="section"><div class="shead"><h2>Küche</h2></div>
    <div class="card">
      <a class="setrow" href="#/vorrat" style="text-decoration:none;color:inherit"><span><b>Vorratsschrank</b><small>{s.pantry.length} Artikel immer im Haus. Sie stehen nicht auf der Einkaufsliste.</small></span>{@render chev()}</a>
      <a class="setrow" href="#/editor/neu" style="text-decoration:none;color:inherit"><span><b>Eigenes Rezept anlegen</b><small>{app.custom.length ? `${app.custom.length} ${app.custom.length === 1 ? 'eigenes Rezept' : 'eigene Rezepte'}` : 'Die Nährwerte rechnet die App für dich aus'}</small></span>{@render chev()}</a>
      <div class="setrow"><span><b>Ausgeblendete Rezepte</b><small>{app.blocked.length ? app.blocked.length + ' werden nicht vorgeschlagen' : 'Keine'}</small></span>{#if app.blocked.length}<button class="btn light sm" type="button" onclick={() => { app.blocked = []; }}>Alle wieder vorschlagen</button>{/if}</div>
    </div>
  </section>

  <section class="section"><div class="shead"><h2>Darstellung</h2></div>
    <div class="card"><div class="setrow" style="display:block"><b>Farbschema</b><Seg label="Farbschema" value={s.theme} options={[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']]} onchange={v => { s.theme = v; }} /></div></div>
  </section>

  <section class="section"><div class="shead"><h2>Daten</h2></div>
    <div class="card">
      <div class="setrow"><span><b>Speicherung</b><small>{storage.ok ? 'Dein Plan bleibt auf diesem Gerät gespeichert – ohne Konto, ohne Cloud.' : 'Dieser Browser erlaubt keine dauerhafte Speicherung. Sichere deinen Plan regelmäßig.'}</small></span></div>
      <div class="setrow"><span><b>Plan sichern</b><small>Als Datei speichern, zum Beispiel für ein neues Handy</small></span><button class="btn light sm" type="button" onclick={exportState}>Sichern</button></div>
      <div class="setrow"><span><b>Plan laden</b><small>Auch alte Morgenwerk-Frühstücksdateien</small></span><button class="btn light sm" type="button" onclick={() => fileInput?.click()}>Laden</button><input bind:this={fileInput} type="file" accept="application/json,.json" hidden aria-label="Plan-Datei laden" onchange={onImport} /></div>
      <div class="setrow"><span><b>Alles zurücksetzen</b><small>Löscht Pläne, Favoriten und Einstellungen</small></span><button class="btn light sm" type="button" style="color:var(--danger)" onclick={askReset}>Zurücksetzen</button></div>
    </div>
  </section>

  {#if installable}
    <section class="section"><div class="card pad"><b>Als App installieren</b><p class="small muted" style="margin:4px 0 10px">Startet wie eine normale App und funktioniert offline.</p><button class="btn orange" type="button" onclick={() => oninstall?.()}>Installieren</button></div></section>
  {/if}
  <section class="section"><div class="card pad small muted"><b style="color:var(--ink)">Auf dem iPhone installieren</b><br />Tippe in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“. Auf Android findest du „App installieren“ im Chrome-Menü.</div></section>
  <p class="small muted section">Morgenwerk mit {db.R.length} Rezepten. Nährwerte sind Richtwerte. Hinweise zur Lebensmittelsicherheit orientieren sich am Bundesinstitut für Risikobewertung (BfR).</p>
</div>
