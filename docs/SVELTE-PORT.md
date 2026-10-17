# Port der Vanilla-App nach Svelte 5 + TypeScript – Konventionen

Die alte App liegt unter `legacy/` (HTML-Strings in `legacy/js/views/*.js`, Event-Delegation in `legacy/js/main.js`).
Die neue App: Vite 6 + Svelte 5 (Runes) + TypeScript strict. Verhalten, Texte und CSS-Klassen 1:1 übernehmen.

## Bausteine (schon vorhanden – benutzen, nicht neu bauen)

| Datei | Inhalt |
|---|---|
| `src/lib/core/*.ts` | Gesamte Logik, typisiert: `plan.ts` (Einträge, Tagessummen, Booster, Gewicht, autofill, allowed, quickTime, isBlocked, isFavorite, toggleIn), `shopping.ts`, `prep.ts`, `recipes.ts` (SLOTS, SLOT_LABEL, ALLERGENS, DIET_LABEL, GROUP_ORDER, goatText, sanitizeCustom, prepareRecipe), `util.ts` (Datum, `norm`, `fmt`, `roundQty`, DAYS …), `types.ts` |
| `src/lib/app.svelte.ts` | `app` = reaktiver Zustand (AppState), `db.F` / `db.R` / `db.byId` (aufbereitete Rezepte), `storage.ok`, `importState`, `resetAll`. **Speichern passiert automatisch.** |
| `src/lib/actions.ts` | `confirm`, `planRecipe`, `planEntry`, `autofillWeek`, `replanWeek`, `copyPrevWeek`, `emptyWeek`, `toggleFavorite`, `toggleBlocked`, `shareList`, `exportState`, `importFile` |
| `src/lib/ui.svelte.ts` | `toast(msg, {label, run}?)`, `buzz()`, `openPicker(Component, props)`, `closePicker()` |
| `src/lib/router.svelte.ts` | `router.route` / `router.base`, `go(hash)`, `closeOverlay()` |
| `src/lib/timer.svelte.ts` | `startTimer(seconds, label)` |
| `src/lib/art/art.ts` | `dishUrl(r)`, `stepUrl(r, step, i)`, `heroUrl()`, `waterTestUrl()`, `thermosUrl()` → **als `<img src=…>` verwenden**, nie als `{@html}` |
| `src/lib/components/` | `Icon` (name: chev, back, close, dots, heart, search, plus, share, print, moon), `Thumb` (Gerichtsbild), `Stepper`, `Seg`, `Switch`, `WeekNav`, `TaskItem` |
| `src/lib/pickers/Confirm.svelte` | Muster für Bottom-Sheet-Inhalte (`picker-head` / `picker-body` / `picker-foot`) |
| `src/app.css` | Globales Stylesheet (Kopie der alten CSS) – **gleiche Klassennamen wie im Legacy-HTML verwenden** |

## Regeln

- Svelte 5 Runes: `let { … }: Props = $props()`, `$state`, `$derived`, `$effect` nur wenn nötig. Events: `onclick={…}`, kein `on:click`.
- Keine `data-action`-Delegation mehr – Handler direkt am Element.
- Logik **nicht** duplizieren: core-Funktionen aufrufen. Sie mutieren `app` direkt (reaktiv). Teure Berechnungen in `$derived` (z. B. `const list = $derived(shopping(monday))`).
- Views bekommen Routen-Parameter als Props `a?: string`, `b?: string` (z. B. `#/einkauf/2026-10-19` → `a = '2026-10-19'`). Datum prüfen mit `isDate(a)`, Woche mit `mondayOfIso(a)`; ohne Parameter `mondayOf()` bzw. `todayIso()`.
- Wurzelelement jeder Seite: `<div class="view">…</div>` (wie Legacy).
- Bilder: `<Thumb recipe={r} />` bzw. `<img src={stepUrl(r, s, i)} alt="…" loading="lazy" decoding="async" width="360" height="190">`.
- Listen mit Schlüssel: `{#each list as r (r.id)}`.
- Barrierefreiheit wie Legacy (aria-label, aria-pressed, Labels an Inputs). svelte-check darf **keine Warnungen** melden (a11y inklusive).
- Imports mit `.ts`-Endung (`'../core/plan.ts'`), Svelte-Dateien mit `.svelte`.
- Prüfen: `npx svelte-check --threshold warning` muss für deine Dateien 0 Fehler / 0 Warnungen liefern.
