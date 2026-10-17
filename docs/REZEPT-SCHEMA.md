# Rezept-Schema & Küchenregeln

## Harte Regeln (gelten für ALLE Rezepte)

1. **Kein Ei** – auch nicht versteckt (keine Eiernudeln, keine Mayonnaise, kein Grana Padano, keine fertigen Gnocchi/Spätzle/Panade).
2. **Kein Brot** – kein Brot, Brötchen, Toast, Wraps, Tortillas, Fladenbrot, Pizzateig, Blätterteig, Croutons.
3. **Kein Schwein und keine Fleischwaren** – kein Schweinefleisch, Speck, Schinken, Wurst, Salami, Aufschnitt, Gelatine, Schmalz; auch kein Rinderspeck/Putenschinken/Chorizo. Erlaubt: Hähnchen, Pute, Rind (Hack/Gulasch), Fisch, Garnelen.
4. **Kochgeschirr ausschließlich unbeschichteter Edelstahl** (Pfannen, Töpfe, Bräter). Kein Waffeleisen, kein Sandwichmaker, keine beschichteten Pfannen, kein Gusseisen. Vorhanden: Backofen (mit Backpapier/Auflaufform aus Glas oder Keramik), Pürierstab/Mixer, Mikrowelle.
5. **Edelstahl-Technik korrekt beschreiben**, wenn eine Pfanne benutzt wird:
   - Pfanne leer 2–3 Minuten bei mittlerer Hitze vorheizen; Wassertropfen-Test: ein Tropfen perlt als Kugel über den Boden (Leidenfrost-Effekt) → dann erst Öl, kurz warten, bis es schlierig fließt, dann Bratgut.
   - Bratgut trocken tupfen und Raumtemperatur-nah; Pfanne nicht überfüllen.
   - **Nicht zu früh bewegen**: Eiweiß/Stärke klebt zuerst und löst sich von selbst, sobald eine Kruste entstanden ist.
   - Für eifreie Teige (Pfannkuchen, Galettes, Puffer) ausreichend Fett, ordentliche Hitze, kleinere/dickere Formen oder lieber Ofen.
   - Bratrückstände (Fond) mit Flüssigkeit ablöschen und mitverwenden, wo sinnvoll.
   - Säure (Tomate, Zitrone, Wein) in Edelstahl unproblematisch.
6. **Lebensmittelsicherheit** (BfR-orientiert): Geflügel/Hack im Kern ≥ 72 °C bzw. durchgegart; Lachs 55–60 °C (durchgegart ≥ 63 °C für Schwangere/Immungeschwächte); vorgekochten Reis rasch abkühlen, max. 1–2 Tage kühlen oder einfrieren, beim Aufwärmen ≥ 70 °C an allen Stellen; TK-Beeren für Rohverzehr erhitzen; grüne Bohnen nie roh.
6a. **Haltbarkeit (`storage.fridgeDays`, konservativ, Kühlschrank ≤ 5 °C)** – wird von tools/validate.cjs erzwungen: vegetarisch gekocht höchstens 2 Tage (BfR: vorgekochte Speisen 2–3 Tage, wir nehmen die Untergrenze); mit Fleisch, Geflügel oder Fisch 1; mit gegartem Reis 1 (FSA/NHS) – wird Reis separat serviert, muss die Notiz „Reis … nur bis zum nächsten Tag“ enthalten; mit rohen Bestandteilen 1; trockene Riegel/Kugeln ohne Frischprodukte bis 5. Gefrierdauer höchstens 2 Monate (Reisgerichte 1 Monat). Thermobox: innerhalb von 4 Stunden essen.
7. **Thermobox (Mittag unter der Woche)**: Essen morgens im Topf **sprudelnd aufkochen** (≥ 75 °C), Speisegefäß vorher 5–10 Minuten mit kochendem Wasser vorheizen, Wasser ausgießen, randvoll füllen, sofort verschließen; innerhalb von 4 Stunden essen (Temperatur bleibt so über 60 °C). Geeignet: Eintöpfe, Currys, Chili, Suppen, Dal, Schmorgerichte, Risotto-artiges. Ungeeignet: Knuspriges, Salate, Pasta mit wenig Sauce (wird pappig), Fisch (Geruch, wird trocken). Toppings (Kräuter, Joghurt, Nüsse) in einer separaten kleinen Dose mitnehmen.
8. Eingekauft wird ausschließlich im Bio-Markt (Alnatura, denn's, Bio-Company …): Zutaten müssen dort üblich sein; Hinweise wie „nur im Bio-Markt“ entfallen.

## Dateiformat

Jede Datei ist ein JSON-Array von Rezepten. Alle Mengen gelten für **1 Portion** (eine sättigende Mahlzeit für eine erwachsene Person). Nährwerte, Allergene und vegetarisch/vegan werden von der App **automatisch** aus `data/foods.json` berechnet – nicht angeben.

```json
{
  "id": "d07",
  "meals": ["dinner", "lunch"],
  "title": "Kurzer, appetitlicher Name",
  "subtitle": "Ein Satz, der Lust macht (max. ~70 Zeichen).",
  "origin": "z. B. Italienisch inspiriert",
  "time": { "active": 20, "total": 35, "quick": 15 },
  "difficulty": 1,
  "tags": ["schnell", "mealprep", "thermobox", "ofen", "onepot", "einfrieren", "proteinreich", "wochenende"],
  "storage": { "fridgeDays": 3, "freeze": true, "thermos": true, "note": "Kurz und konkret, wie man lagert und aufwärmt." },
  "components": [ { "key": "cooked-potato", "q": 400 } ],
  "tools": ["Edelstahlpfanne 28 cm", "Holzspatel"],
  "ingredients": [ { "k": "onion", "q": 80, "note": "optional kurzer Hinweis" } ],
  "steps": [
    { "title": "Kurz, aktiv formuliert", "text": "2–4 Sätze, präzise Hitze, Zeit, Erkennungsmerkmal.", "action": "pan", "items": ["onion"], "timer": 240 }
  ],
  "tips": ["1–3 echte Profi-Tipps oder Fehlerhilfen"],
  "art": { "dish": "bowl", "base": { "type": "stew", "color": "#b5462d" }, "side": { "type": "rice", "color": "#f3ecd9" }, "sauce": { "style": "dollop", "color": "#f6f1e4" }, "garnish": ["parsley", "chili"] }
}
```

### Felder

- `id`: `b01…` Frühstück, `l01…` Mittag (Thermobox), `d01…` Abendessen, `s01…` Snacks. Fortlaufend, eindeutig.
- `meals`: eine oder mehrere von `breakfast`, `lunch`, `dinner`, `snack`. Abendessen, die sich gut als Thermobox-Mittag am nächsten Tag eignen, bekommen zusätzlich `lunch` und `storage.thermos: true`.
- `time.active`: aktive Arbeitszeit in Minuten. `time.total`: Gesamtzeit von null an (inkl. Ofen/Köcheln/Abkühlen). `time.quick`: Gesamtzeit, wenn `components` vorbereitet sind – sonst `null`.
- `difficulty`: 1 einfach, 2 mittel, 3 anspruchsvoll.
- `tags`: nur aus der Liste oben.
- `storage.fridgeDays`: wie viele Tage das **fertige** Gericht gekühlt hält (0 = frisch essen). `freeze`: einfrierbar. `thermos`: eignet sich für die Thermobox.
- `components` (optional): vorkochbare Bausteine, die die App für Meal-Prep bündelt. Erlaubte Keys: `cooked-potato` (gegarte Pellkartoffeln, q = Rohgewicht), `cooked-rice` (gegarter Reis, q = Trockengewicht), `cooked-sweetpotato`, `cooked-lentils` (q = Trockengewicht), `cooked-quinoa` (q = Trockengewicht), `roasted-veg` (Ofengemüse, q = Rohgewicht gesamt). Die Zutaten selbst stehen trotzdem in `ingredients`.
- `tools`: Edelstahl explizit benennen ("Edelstahlpfanne 28 cm", "Edelstahltopf 3 l", "Edelstahl-Bräter mit Deckel"). Außerdem Backblech + Backpapier, Auflaufform (Glas/Keramik), Pürierstab, Mikrowelle, Thermobox 500 ml, Küchenthermometer.
- `ingredients[].k`: **muss** ein Schlüssel aus `data/foods.json` sein. Fehlt etwas Wichtiges, eine neue Zutat in `data/foods-new-<dein-kürzel>.json` im selben Format wie foods.json anlegen (realistische Nährwerte je 100 g/ml, Allergene!). Sparsam damit sein.
- `ingredients[].q`: Zahl in der Einheit der Zutat (g oder ml). Gewürze realistisch (Salz 1,5–3 g, Pfeffer 0,5 g, Paprikapulver 2 g, Öl 10–20 g pro Portion).
- `steps`: 4–6 Schritte. `action` aus: `cut`, `grate`, `squeeze`, `shape`, `mix`, `mash`, `blend` (Pürierstab), `pan` (braten in Edelstahlpfanne), `flip` (wenden), `toast` (ohne Fett rösten), `pot` (kochen/köcheln/schmoren im Topf), `oven` (Backofen), `deglaze` (ablöschen), `jar` (Thermobox füllen), `plate` (anrichten). `items`: 1–3 Zutaten-Keys, die im Schritt sichtbar sind. `timer`: Sekunden, nur wenn es eine echte Wartezeit gibt.
- `art`: Beschreibung für die automatisch gezeichnete Illustration.
  - `dish`: `plate` | `bowl` | `jar` (Thermobox) | `pan` (in der Edelstahlpfanne serviert) | `tray` (Ofenform)
  - `base.type` / `side.type`: `slices` | `cubes` | `patties` | `pancakes` | `porridge` | `soup` | `stew` | `curry` | `mash` | `rice` | `grain` | `pasta` | `fillet` | `strips` | `beans` | `salad` | `roastveg` | `gratin` | `bites` | `dip` | `fruit`
  - `color`: realistische Hex-Farbe des Gerichts.
  - `sauce` (optional): `style` `dollop` | `drizzle` | `pool`, `color`.
  - `garnish`: 0–4 Zutaten-Keys für Toppings.

## Inhaltliche Qualität

- Deutsch, du-Form, klar und ruhig. Keine Werbesprache, keine Emojis.
- Zeiten ehrlich (inkl. Vorheizen der Pfanne, Wasser aufkochen).
- Jeder Schritt: Was tun, wie heiß, wie lange, woran erkenne ich, dass es passt.
- Ausgewogen: Gemüse + Eiweißquelle + Sättigungsbeilage. Ziel ist **Zunehmen**: Frühstück 950–1150 kcal (sehr sättigend, energiedicht statt nur mehr Volumen; Eiweiß ≥ 35 g), Mittag 550–800 kcal, Abend 600–900 kcal, Snack 500–800 kcal (Zunehmen); Eiweiß Hauptmahlzeiten möglichst ≥ 25 g.
- Abwechslung: Küchen, Hauptzutaten, Garmethoden. Nicht ständig Quark.
- Zutatenüberschneidungen innerhalb einer Woche sind erwünscht (Einkauf), aber kein Rezept-Klon.

## Prüfen

`node tools/validate.cjs` prüft alle Dateien `data/recipes-*.json` und gibt Nährwerte pro Rezept aus. Fehler beheben, bis es sauber durchläuft.
