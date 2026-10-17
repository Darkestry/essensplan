# Morgenwerk · Essensplan

Installierbare Web-App (PWA) für den kompletten Wochenplan: Frühstück, Thermobox-Mittag, Abendessen, Snacks – mit Tagesziel (Zunehmen), Gewichtsverlauf, Einkaufsliste, Meal-Prep-Ablauf, Kochmodus mit Timern und eigenen Rezepten. Alle Rezepte ohne Ei, Brot und Schwein, für unbeschichtetes Edelstahl-Kochgeschirr; optional mit Ziegen-/Schafsmilchprodukten. Daten bleiben auf dem Gerät, offline nutzbar.

**Stack:** Svelte 5 (Runes) · TypeScript (strict) · Vite 6 · vite-plugin-pwa (Workbox). Läuft mit Node ≥ 22.

## Befehle

```bash
npm install          # einmalig
npm run dev          # Entwicklung mit Hot Reload → http://localhost:5173
npm test             # Tests der Kernlogik (Node-Test-Runner)
npm run check        # Typprüfung (svelte-check)
npm run build        # validiert Rezepte, testet, prüft Typen, baut nach dist/
npm run preview      # gebaute App lokal ansehen → http://localhost:8765
```

## Struktur

| Pfad | Inhalt |
|---|---|
| `src/lib/core/` | Gesamte Logik als reine TypeScript-Funktionen (Plan, Einkauf, Meal-Prep, Rezepte, Zustand) – ohne UI, getestet in `tests/` |
| `src/lib/app.svelte.ts` | Reaktiver Zustand + automatisches Speichern (localStorage) |
| `src/lib/views/`, `components/`, `pickers/` | Svelte-Komponenten |
| `src/lib/art/art.ts` | Illustrationen (werden einmal erzeugt und als Bild gecacht) |
| `data/foods.json`, `data/foods-new-*.json` | Zutaten mit Nährwerten, Allergenen, Packungsgrößen, Ziegenmilch-Ersatz |
| `data/recipes-*.json` | Rezepte – werden beim Build gebündelt, Nährwerte rechnet die App |
| `docs/REZEPT-SCHEMA.md` | Regeln & Format für Rezepte |
| `tools/validate.cjs` | Prüft alle Rezepte (läuft automatisch bei `npm run build`) |
| `legacy/` | Die alte Vanilla-JS-Version (nur noch Referenz) |

## Rezepte ändern oder ergänzen

JSON in `data/` bearbeiten, dann `npm run validate` – oder direkt in der App unter *Rezepte → + Eigenes Rezept*.
