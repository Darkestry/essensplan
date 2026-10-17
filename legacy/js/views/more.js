import { esc, icon, DAYS, DAYS_SHORT } from '../util.js';
import { state, SLOTS, SLOT_LABEL, ALLERGENS, R, storageOK } from '../store.js';
import { waterTestArt, thermosArt } from '../art.js';

const sw = (name, checked, label, sub = '') => `<label class="setrow"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="switch"><input type="checkbox" data-setting="${name}" ${checked ? 'checked' : ''}><i></i></span></label>`;
const seg = (name, value, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${name}" data-value="${v}" aria-pressed="${String(value) === String(v)}">${l}</button>`).join('')}</div>`;

export function renderMore() {
  const s = state.settings;
  return `<div class="view settings">
  <div class="vhead"><div class="eyebrow">Mehr</div><h1>Einstellungen & Wissen</h1></div>

  <section class="section"><div class="shead"><h2>Wissen</h2></div><nav class="card guidelist">
    ${guideLink('edelstahl', 'Kochen mit Edelstahl', 'Vorheizen, Wassertropfen-Test, nichts kleben lassen', '<svg viewBox="0 0 32 32"><ellipse cx="14" cy="17" rx="11" ry="7" fill="#c9d0d4" stroke="#5d676d"/><path d="M24 15l7-3" stroke="#5d676d" stroke-width="3" stroke-linecap="round"/><circle cx="11" cy="16" r="2" fill="#9cc9e0"/><circle cx="16" cy="18" r="1.5" fill="#9cc9e0"/></svg>')}
    ${guideLink('thermobox', 'Thermobox richtig nutzen', 'Heiß bleibt sicher: so geht\'s bis mittags', '<svg viewBox="0 0 32 32"><rect x="9" y="6" width="14" height="22" rx="4" fill="#c9d0d4" stroke="#5d676d"/><rect x="9" y="4" width="14" height="5" rx="2" fill="#3f5a4c"/><rect x="9" y="15" width="14" height="5" fill="#3f5a4c"/></svg>')}
    ${guideLink('ziege', 'Kochen mit Ziegenmilch', 'Was sich ändert und wie es cremig bleibt', '<svg viewBox="0 0 32 32"><path d="M11 4h10v5l3 4v15H8V13l3-4z" fill="#fbfaf6" stroke="#3f5a4c"/><rect x="8" y="16" width="16" height="7" fill="#e3eadb"/><path d="M13 19c1-2 5-2 6 0" stroke="#3f5a4c" fill="none"/></svg>')}
    ${guideLink('lagern', 'Vorkochen & Lagern', 'Abkühlen, Haltbarkeit, Einfrieren, Auftauen', '<svg viewBox="0 0 32 32"><rect x="7" y="4" width="18" height="25" rx="3" fill="#e3eadb" stroke="#3f5a4c"/><path d="M7 13h18M11 8v3M11 17v4" stroke="#3f5a4c" stroke-width="2"/></svg>')}
  </nav></section>

  <section class="section"><div class="shead"><h2>Tagesziel</h2></div>
  <div class="card">
    <div class="setrow"><span><b>Energie pro Tag</b><small>Zum Zunehmen etwa 300–500 kcal über deinem Bedarf</small></span><div class="stepper"><button type="button" data-action="goalDelta" data-delta="-100" aria-label="100 kcal weniger">−</button><output style="min-width:58px">${s.goalKcal}</output><button type="button" data-action="goalDelta" data-delta="100" aria-label="100 kcal mehr">+</button></div></div>
    <div class="setrow"><span><b>Eiweiß pro Tag</b><small>Für Muskelaufbau ca. 1,6–2 g je kg Körpergewicht</small></span><div class="stepper"><button type="button" data-action="proteinDelta" data-delta="-5" aria-label="5 g weniger">−</button><output style="min-width:58px">${s.goalProtein} g</output><button type="button" data-action="proteinDelta" data-delta="5" aria-label="5 g mehr">+</button></div></div>
    <a class="setrow" href="#/gewicht" style="text-decoration:none;color:inherit"><span><b>Gewicht & Verlauf</b><small>Wöchentlich eintragen – die App schlägt Anpassungen vor</small></span>${icon.chev}</a>
  </div></section>

  <section class="section"><div class="shead"><h2>Haushalt</h2></div>
  <div class="card">
    <div class="setrow"><span><b>Personen</b><small>Mengen & Einkauf werden skaliert</small></span><div class="stepper"><button type="button" data-action="persons" data-delta="-1" aria-label="Weniger Personen">−</button><output>${s.persons}</output><button type="button" data-action="persons" data-delta="1" aria-label="Mehr Personen">+</button></div></div>
    <div class="setrow" style="display:block"><b>Portionsgröße</b><small style="margin-bottom:8px">Für weniger oder mehr Hunger – wirkt auf alle Mengen</small>${seg('appetite', s.appetite, [[0.8, 'Klein'], [1, 'Normal'], [1.25, 'Groß'], [1.5, 'Sehr groß']])}</div>
  </div></section>

  <section class="section"><div class="shead"><h2>Mahlzeiten planen</h2></div>
  <div class="card">
    ${SLOTS.map(sl => sw('slot-' + sl, s.slots[sl], SLOT_LABEL[sl])).join('')}
    <div class="setrow" style="display:block"><b>Thermobox-Tage</b><small style="margin-bottom:8px">An diesen Tagen nimmst du dein Mittagessen in der Box mit</small><div class="daygrid">${DAYS_SHORT.map((d, i) => `<button type="button" data-thermosday="${i}" aria-pressed="${s.thermosDays.includes(i)}">${d}</button>`).join('')}</div></div>
    <div class="setrow" style="display:block"><b>Großer Einkauf</b><small style="margin-bottom:8px">Bestimmt, ab wann Fisch & Fleisch eingefroren werden sollten</small>${seg('shopDay', s.shopDay, [[-3, 'Freitag'], [-2, 'Samstag'], [-1, 'Sonntag']])}</div>
  </div></section>

  <section class="section"><div class="shead"><h2>Ernährung</h2></div>
  <div class="card">
    <div class="setrow" style="display:block"><b>Ernährungsform</b><small style="margin-bottom:8px">Alle Rezepte sind ohne Ei, Brot und Schwein</small>${seg('diet', s.diet, [['all', 'Alles'], ['pesc', 'Fisch ok'], ['veg', 'Vegetarisch'], ['vegan', 'Vegan']])}</div>
    <div class="setrow" style="display:block"><b>Milchprodukte</b><small style="margin-bottom:8px">Ziege & Schaf: Quark, Joghurt, Milch, Käse & Co. werden in allen Rezepten, Nährwerten und im Einkauf ersetzt</small>${seg('milk', s.milk, [['cow', 'Kuh'], ['goat', 'Ziege & Schaf']])}${s.milk === 'goat' ? '<a class="linkbtn" href="#/wissen/ziege">Tipps zum Kochen mit Ziegenmilch ›</a>' : ''}</div>
    <div class="setrow" style="display:block"><b>Allergene ausschließen</b><small style="margin-bottom:8px">Rezepte mit diesen Zutaten werden ausgeblendet und nicht vorgeschlagen</small><div class="tags">${Object.entries(ALLERGENS).filter(([k]) => k !== 'ei').map(([k, l]) => `<button type="button" class="chip" data-exclude="${k}" aria-pressed="${s.exclude.includes(k)}">${esc(l)}</button>`).join('')}</div></div>
  </div></section>

  <section class="section"><div class="shead"><h2>Küche</h2></div><div class="card">
    <a class="setrow" href="#/vorrat" style="text-decoration:none;color:inherit"><span><b>Vorratsschrank</b><small>${s.pantry.length} Artikel immer im Haus – erscheinen nicht auf der Einkaufsliste</small></span>${icon.chev}</a>
    <a class="setrow" href="#/editor/neu" style="text-decoration:none;color:inherit"><span><b>Eigenes Rezept anlegen</b><small>${state.custom.length ? state.custom.length + ' eigene Rezepte' : 'Mit automatischer Nährwert-Berechnung'}</small></span>${icon.chev}</a>
    <div class="setrow"><span><b>Ausgeblendete Rezepte</b><small>${state.blocked.length ? state.blocked.length + ' werden nicht vorgeschlagen' : 'Keine'}</small></span>${state.blocked.length ? '<button class="btn light sm" type="button" data-action="unblockAll">Alle zurück</button>' : ''}</div>
  </div></section>

  <section class="section"><div class="shead"><h2>Darstellung</h2></div>
  <div class="card"><div class="setrow" style="display:block"><b>Farbschema</b>${seg('theme', s.theme, [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']])}</div></div></section>

  <section class="section"><div class="shead"><h2>Daten</h2></div>
  <div class="card">
    <div class="setrow"><span><b>Speicherung</b><small>${storageOK ? 'Dein Plan bleibt auf diesem Gerät gespeichert – ohne Konto, ohne Cloud.' : 'Dieser Browser erlaubt keine dauerhafte Speicherung. Sichere deinen Plan regelmäßig.'}</small></span></div>
    <div class="setrow"><span><b>Plan sichern</b><small>Als Datei exportieren (z. B. für ein neues Handy)</small></span><button class="btn light sm" type="button" data-action="export">Sichern</button></div>
    <div class="setrow"><span><b>Plan laden</b><small>Auch alte Morgenwerk-Frühstücksdateien</small></span><button class="btn light sm" type="button" data-action="import">Laden</button><input id="importFile" type="file" accept="application/json,.json" hidden></div>
    <div class="setrow"><span><b>Alles zurücksetzen</b><small>Löscht Pläne, Favoriten und Einstellungen</small></span><button class="btn light sm" type="button" data-action="resetAll" style="color:var(--danger)">Löschen</button></div>
  </div></section>

  <section class="section" id="installBox" hidden><div class="card pad"><b>Als App installieren</b><p class="small muted" style="margin:4px 0 10px">Startet wie eine normale App und funktioniert offline.</p><button class="btn orange" type="button" data-action="install">Installieren</button></div></section>
  <section class="section"><div class="card pad small muted"><b style="color:var(--ink)">Auf dem iPhone installieren</b><br>In Safari auf „Teilen“ tippen → „Zum Home-Bildschirm“. Auf Android im Chrome-Menü „App installieren“.</div></section>
  <p class="small muted section">Morgenwerk · ${R.length} Rezepte · Nährwerte sind Richtwerte. Hinweise zur Lebensmittelsicherheit orientieren sich am Bundesinstitut für Risikobewertung (BfR).</p>
  </div>`;
}
function guideLink(id, title, sub, ic) { return `<a href="#/wissen/${id}"><span class="gi">${ic}</span><span><b>${title}</b><small>${sub}</small></span>${icon.chev}</a>`; }

const GUIDES = {
  edelstahl: () => ({ title: 'Kochen mit Edelstahl', html: `
  <p class="lead">Edelstahl ist unverwüstlich, ofenfest, spülmaschinenfest und schafft die besten Röstaromen. Kleben ist kein Materialfehler, sondern fast immer eine Frage von Temperatur und Geduld.</p>
  <div class="art">${waterTestArt()}</div>
  <h2>Die 5 Grundregeln</h2>
  <ol>
    <li><b>Leer vorheizen.</b> Pfanne ohne Fett 2–3 Minuten auf mittlerer Stufe erhitzen (Induktion: Stufe 6–7 von 9). Edelstahl braucht etwas, bis die Hitze gleichmäßig verteilt ist.</li>
    <li><b>Wassertropfen-Test.</b> Ein paar Tropfen Wasser hineinspritzen: Zischen und verdampfen sie sofort, ist die Pfanne noch zu kalt. Rollen sie als <i>Kügelchen</i> über den Boden (Leidenfrost-Effekt), ist sie bereit. Tropfen wegwischen.</li>
    <li><b>Dann erst Fett.</b> Öl hineingeben und 20–30 Sekunden warten, bis es dünn und schlierig fließt. Nicht rauchen lassen. Zum scharfen Anbraten raffiniertes Rapsöl, für mittlere Hitze Olivenöl, Butterschmalz oder Öl mit einem Stück Butter (Butter allein verbrennt schnell).</li>
    <li><b>Trocken & nicht zu voll.</b> Bratgut trockentupfen, nicht direkt aus dem Kühlschrank in die Pfanne, mit Abstand einlegen. Zu viel in der Pfanne kühlt sie ab – es dämpft statt zu braten.</li>
    <li><b>Nicht zu früh bewegen.</b> Fleisch, Fisch, Halloumi und Kartoffeln kleben zuerst an. Sobald die Kruste fertig ist, lösen sie sich von selbst. Klebt es noch: 30–60 Sekunden warten, nicht reißen.</li>
  </ol>
  <h2>Besondere Fälle</h2>
  <h3>Eifreie Teige (Pfannkuchen, Galettes, Puffer)</h3>
  <p>Ohne Ei fehlt Bindung – deshalb: Pfanne gut vorheizen, je Fladen dünn mit öligem Küchenpapier auswischen, lieber kleinere und etwas dickere Fladen backen und erst wenden, wenn die Ränder fest sind und sich der Fladen mit dem Wender rütteln lässt. Der erste Fladen ist oft ein Test – das ist normal. Für Rösti und Socca ist der Ofen mit Backpapier oft die entspanntere Wahl.</p>
  <h3>Fisch auf der Haut</h3>
  <p>Haut sehr trocken tupfen, Pfanne heiß, Öl, Fisch mit der Haut nach unten einlegen und 10 Sekunden leicht andrücken, damit sie sich nicht wölbt. 80 % der Garzeit auf der Haut lassen. Sie löst sich, wenn sie knusprig ist.</p>
  <h3>Fond nutzen</h3>
  <p>Die braunen Rückstände nach dem Anbraten sind pures Aroma. Mit einem Schluck Wasser, Brühe oder Zitronensaft ablöschen und mit dem Holzspatel lösen – fertig ist die Pan-Sauce.</p>
  <h3>Säure ist kein Problem</h3>
  <p>Tomaten, Zitrone und Essig darf man in Edelstahl problemlos lange kochen – anders als in Gusseisen oder Aluminium.</p>
  <h2>Reinigen</h2>
  <ul>
    <li>Angebranntes: noch warm Wasser hineingeben und kurz aufkochen, dann mit dem Holzspatel lösen.</li>
    <li>Hartnäckige Rückstände: 1–2 EL Natron mit wenig Wasser zur Paste, einwirken lassen, mit weichem Schwamm reinigen.</li>
    <li>Regenbogenflecken und weiße Kalkränder: mit etwas Essig oder Zitronensaft auswischen.</li>
    <li>Keine Stahlwolle – sie hinterlässt Kratzer, in denen später mehr klebt.</li>
  </ul>
  <p class="src">Tipp: Salz erst ins heiße Wasser geben. Salz in kaltem Wasser kann bei Edelstahl kleine Lochfraß-Punkte verursachen.</p>` }),
  thermobox: () => ({ title: 'Thermobox richtig nutzen', html: `
  <p class="lead">Ein gutes Speisegefäß hält Essen stundenlang heiß. Damit es sicher bleibt, muss es <b>heiß genug hinein</b> und <b>nicht zu lange darin</b> bleiben: Bakterien vermehren sich vor allem zwischen 10 und 60 °C.</p>
  <div class="art">${thermosArt()}</div>
  <h2>So geht's morgens (10 Minuten)</h2>
  <ol>
    <li><b>Box vorheizen:</b> Wasserkocher an, Box mit kochendem Wasser füllen, Deckel drauf, 5–10 Minuten stehen lassen.</li>
    <li><b>Essen aufkochen:</b> Die Portion (aus dem Kühlschrank oder am Vorabend aufgetaut) im Topf mit einem Schluck Wasser <b>sprudelnd aufkochen</b> und unter Rühren 2 Minuten kochen lassen. Eintöpfe dicken im Kühlschrank nach – lieber etwas flüssiger einfüllen.</li>
    <li><b>Umfüllen:</b> Wasser ausgießen, Essen sofort einfüllen – <b>randvoll</b>, denn Luft kühlt. Deckel sofort schließen.</li>
    <li><b>Toppings separat:</b> Joghurt, frische Kräuter, Nüsse oder Zitrone in eine kleine Extra-Dose.</li>
    <li><b>Innerhalb von etwa 5 Stunden essen.</b> Ist das Essen mittags nur noch lauwarm (unter 60 °C), nicht mehr essen.</li>
  </ol>
  <h2>Was eignet sich</h2>
  <p><b>Sehr gut:</b> Eintöpfe, Currys, Chili, Dal, Gulasch, Suppen, Risotto, Schmorgerichte.<br><b>Weniger gut:</b> Nudeln mit wenig Sauce (werden weich), Knuspriges, Salate, Fisch (trocknet aus, riecht).</p>
  <h2>Reis in der Box</h2>
  <p>Reis kann Sporen von <i>Bacillus cereus</i> enthalten. Deshalb: gegarten Reis rasch abkühlen, spätestens am nächsten Tag verwenden, morgens kochend heiß einfüllen und nicht lauwarm stehen lassen.</p>
  <h2>Pflege</h2>
  <p>Nach dem Essen mit heißem Wasser ausspülen, abends offen trocknen lassen. Dichtungsring regelmäßig herausnehmen und reinigen. Keine kohlensäurehaltigen Getränke einfüllen.</p>` }),
  ziege: () => ({ title: 'Kochen mit Ziegenmilch', html: `
  <p class="lead">Mit der Einstellung „Ziege & Schaf“ tauscht die App in allen Rezepten die Milchprodukte aus – Mengen, Nährwerte und Einkaufsliste passen sich an. Ein paar Dinge verhalten sich anders als bei Kuhmilch:</p>
  <h2>Was ersetzt wird</h2>
  <ul>
    <li><b>Milch → Ziegenmilch.</b> Frische Bio-Ziegenmilch schmeckt milder als H-Milch; der typische Geschmack wird beim langen Kochen etwas kräftiger.</li>
    <li><b>Joghurt → Ziegenjoghurt.</b> Deutlich dünner als griechischer Joghurt und mit weniger Eiweiß. Für Dips 20–30 Minuten in einem Sieb mit Küchenpapier abtropfen lassen.</li>
    <li><b>Quark → Ziegenquark</b> aus dem Kühlregal. Ist er mal aus: 400 g Ziegenjoghurt 1–2 Stunden (oder über Nacht im Kühlschrank) abtropfen lassen – ergibt ca. 250 g cremigen „Quark“.</li>
    <li><b>Sahne, Crème fraîche, Schmand, Frischkäse → Ziegenfrischkäse.</b> Für Saucen mit einem Schluck Kochwasser glatt rühren und erst am Ende bei kleiner Hitze einrühren – nicht sprudelnd kochen.</li>
    <li><b>Butter → Ziegenbutter</b> (oder einfach Olivenöl).</li>
    <li><b>Bergkäse & Parmesan → Ziegengouda oder Pecorino</b> (Schaf). <b>Feta</b> mit „g.U.“ ist immer Schaf/Ziege; „Hirtenkäse“ meist Kuh. <b>Halloumi</b>: Zutatenliste prüfen. <b>Mozzarella → Ziegenkäserolle</b>.</li>
  </ul>
  <h2>Beim Kochen beachten</h2>
  <ul>
    <li>Ziegenmilchprodukte flocken mit Säure und starker Hitze schneller aus: Zitronensaft und Essig erst ganz am Ende zugeben.</li>
    <li>Ziegenfrischkäse macht Saucen cremig, ist aber würziger – lieber etwas weniger nehmen und abschmecken.</li>
    <li>Ziegenmilch rahmt kaum auf – Porridge und Polenta werden gleichmäßig cremig, brauchen aber evtl. einen Schluck mehr Flüssigkeit.</li>
  </ul>
  <h2>Gut zu wissen</h2>
  <p>Ziegenmilch enthält ähnlich viel Laktose wie Kuhmilch. Bei einer <b>Kuhmilchallergie</b> ist sie kein Ersatz – die Eiweiße sind sehr ähnlich (Kreuzreaktion bei den meisten Betroffenen). Für Menschen, die Kuhmilch einfach schlechter vertragen oder den Geschmack mögen, ist sie dagegen eine gute Wahl.</p>` }),
  lagern: () => ({ title: 'Vorkochen & Lagern', html: `
  <p class="lead">Meal-Prep spart unter der Woche viel Zeit – wenn Abkühlen, Lagern und Aufwärmen stimmen.</p>
  <h2>Richtig abkühlen</h2>
  <ul><li>Gekochtes in <b>flache, kleine Behälter</b> verteilen – große Töpfe kühlen innen stundenlang nicht ab.</li><li>Höchstens 2 Stunden bei Zimmertemperatur stehen lassen, dann in den Kühlschrank (≤ 5 °C, unteres Fach).</li><li>Deckel erst schließen, wenn das Essen nicht mehr dampft.</li></ul>
  <h2>Wie lange hält was? (gekühlt)</h2>
  <ul>
    <li><b>Reis:</b> bis zum nächsten Tag – sonst einfrieren.</li>
    <li><b>Kartoffeln, Linsen, Quinoa, Ofengemüse:</b> 2–3 Tage.</li>
    <li><b>Eintöpfe, Currys, Chili:</b> 3 Tage (Hülsenfrüchte-Eintöpfe auch 4).</li>
    <li><b>Gerichte mit Geflügel oder Fisch:</b> 1–2 Tage.</li>
    <li><b>Rohes Hackfleisch:</b> am Einkaufstag verarbeiten oder einfrieren. <b>Frischer Fisch:</b> 1 Tag. <b>Geflügel:</b> 1–2 Tage.</li>
  </ul>
  <h2>Einfrieren & Auftauen</h2>
  <ul><li>Portionsweise und flach einfrieren, beschriften (Gericht + Datum). Eintöpfe halten tiefgekühlt 2–3 Monate.</li><li><b>Auftauen im Kühlschrank</b> über Nacht – nicht auf der Arbeitsplatte. Eilig: Mikrowelle (Auftaustufe), dann sofort erhitzen.</li><li>Aufgetautes nicht erneut einfrieren (außer es wurde dazwischen gekocht).</li></ul>
  <h2>Richtig aufwärmen</h2>
  <p>Überall dampfend heiß – mindestens 70 °C für 2 Minuten. In der Mikrowelle zwischendurch umrühren und abgedeckt kurz ruhen lassen, damit sich die Hitze verteilt. Nur einmal aufwärmen.</p>
  <h2>Kerntemperaturen</h2>
  <ul><li>Geflügel und Hackfleisch: mindestens 72 °C (durchgegart, kein rosa Saft).</li><li>Lachs: 55–60 °C für saftig-glasig; für Schwangere, Kleinkinder und Immungeschwächte ≥ 63 °C.</li><li>Weißer Fisch: bis er sich in Blättern löst. Garnelen: bis sie rundum rosa und undurchsichtig sind.</li></ul>
  <p class="src">Quellen: Bundesinstitut für Risikobewertung (BfR), „Vorkochen für mehrere Tage“ und Verbraucherhinweise zu Bacillus cereus; Bundeszentrum für Ernährung (BZfE).</p>` }),
};
export function renderGuide(id) {
  const g = GUIDES[id]?.();
  if (!g) return `<div class="view"><h1>Nicht gefunden</h1><a href="#/mehr">Zurück</a></div>`;
  return `<div class="view guide"><div class="vhead"><a class="linkbtn" href="#/mehr">‹ Mehr</a><div class="eyebrow" style="margin-top:8px">Wissen</div><h1>${g.title}</h1></div>${g.html}</div>`;
}
