<script lang="ts">
  // Wissensseiten: Edelstahl, Thermobox, Ziegenmilch, Vorkochen & Lagern.
  import { thermosUrl, waterTestUrl } from '../art/art.ts';

  let { a }: { a?: string } = $props();

  const TITLES: Record<string, string> = {
    edelstahl: 'Kochen mit Edelstahl',
    thermobox: 'Thermobox richtig nutzen',
    ziege: 'Kochen mit Ziegenmilch',
    lagern: 'Vorkochen & Lagern',
  };
  const title = $derived(a && Object.prototype.hasOwnProperty.call(TITLES, a) ? TITLES[a] : '');
</script>

{#if !title}
  <div class="view"><h1>Diese Seite gibt es nicht</h1><a href="#/mehr">Zurück zu Mehr</a></div>
{:else}
  <div class="view guide">
    <div class="vhead"><a class="linkbtn" href="#/mehr">Zurück zu Mehr</a><h1 style="margin-top:8px">{title}</h1></div>
    {#if a === 'edelstahl'}
      <p class="lead">Edelstahl ist unverwüstlich, ofenfest, spülmaschinenfest und schafft die besten Röstaromen. Kleben ist kein Materialfehler, sondern fast immer eine Frage von Temperatur und Geduld.</p>
      <div class="art"><img src={waterTestUrl()} alt="Wassertropfen-Test: Tropfen rollen als Kügelchen über die heiße Pfanne" decoding="async" /></div>
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
      <p class="src">Tipp: Salz erst ins heiße Wasser geben. Salz in kaltem Wasser kann bei Edelstahl kleine Lochfraß-Punkte verursachen.</p>
    {:else if a === 'thermobox'}
      <p class="lead">Ein gutes Speisegefäß hält Essen stundenlang heiß. Damit es sicher bleibt, muss es <b>heiß genug hinein</b> und <b>nicht zu lange darin</b> bleiben: Bakterien vermehren sich vor allem zwischen 10 und 60 °C.</p>
      <div class="art"><img src={thermosUrl()} alt="Vorgeheizte Thermobox, randvoll mit heißem Essen gefüllt" decoding="async" /></div>
      <h2>So geht's morgens (10 Minuten)</h2>
      <ol>
        <li><b>Box vorheizen:</b> Wasserkocher an, Box mit kochendem Wasser füllen, Deckel drauf, 5–10 Minuten stehen lassen.</li>
        <li><b>Essen aufkochen:</b> Die Portion (aus dem Kühlschrank oder am Vorabend aufgetaut) im Topf mit einem Schluck Wasser <b>sprudelnd aufkochen</b> und unter Rühren 2 Minuten kochen lassen. Eintöpfe dicken im Kühlschrank nach – lieber etwas flüssiger einfüllen.</li>
        <li><b>Umfüllen:</b> Wasser ausgießen, Essen sofort einfüllen – <b>randvoll</b>, denn Luft kühlt. Deckel sofort schließen.</li>
        <li><b>Toppings separat:</b> Joghurt, frische Kräuter, Nüsse oder Zitrone in eine kleine Extra-Dose.</li>
        <li><b>Innerhalb von 4 Stunden essen.</b> Ist das Essen mittags nur noch lauwarm (unter 60 °C), nicht mehr essen.</li>
      </ol>
      <h2>Was eignet sich</h2>
      <p><b>Sehr gut:</b> Eintöpfe, Currys, Chili, Dal, Gulasch, Suppen, Risotto, Schmorgerichte.<br /><b>Weniger gut:</b> Nudeln mit wenig Sauce (werden weich), Knuspriges, Salate, Fisch (trocknet aus, riecht).</p>
      <h2>Reis in der Box</h2>
      <p>Reis kann Sporen von <i>Bacillus cereus</i> enthalten. Deshalb: gegarten Reis rasch abkühlen, spätestens am nächsten Tag verwenden, morgens kochend heiß einfüllen und nicht lauwarm stehen lassen.</p>
      <h2>Pflege</h2>
      <p>Nach dem Essen mit heißem Wasser ausspülen, abends offen trocknen lassen. Dichtungsring regelmäßig herausnehmen und reinigen. Keine kohlensäurehaltigen Getränke einfüllen.</p>
    {:else if a === 'ziege'}
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
      <p>Ziegenmilch enthält ähnlich viel Laktose wie Kuhmilch. Bei einer <b>Kuhmilchallergie</b> ist sie kein Ersatz – die Eiweiße sind sehr ähnlich (Kreuzreaktion bei den meisten Betroffenen). Für Menschen, die Kuhmilch einfach schlechter vertragen oder den Geschmack mögen, ist sie dagegen eine gute Wahl.</p>
    {:else if a === 'lagern'}
      <p class="lead">Vorkochen spart dir unter der Woche viel Zeit, wenn Abkühlen, Lagern und Aufwärmen stimmen.</p>
      <h2>Richtig abkühlen</h2>
      <ul><li>Gekochtes in <b>flache, kleine Behälter</b> verteilen – große Töpfe kühlen innen stundenlang nicht ab.</li><li>Höchstens 2 Stunden bei Zimmertemperatur stehen lassen, dann in den Kühlschrank (unteres Fach). <b>Reis</b> innerhalb von 1 Stunde kühlen.</li><li>Deckel erst schließen, wenn das Essen nicht mehr dampft.</li></ul>
      <h2>Kühlschrank-Temperatur</h2>
      <p>Das BfR empfiehlt <b>höchstens 7 °C, besser 5 °C</b>. Leg ein Thermometer für einen Tag ins mittlere Fach – viele Kühlschränke sind wärmer als gedacht. Die Zeiten unten liegen bewusst am unteren Rand der offiziellen Empfehlungen und gelten auch bei 5–6 °C; ist dein Kühlschrank wärmer, lieber gleich einfrieren. Im Zweifel: wegwerfen.</p>
      <h2>Wie lange hält was? (gekühlt)</h2>
      <ul>
        <li><b>Gekochter Reis und Reisgerichte:</b> nur bis zum nächsten Tag – sonst portionsweise einfrieren. Nur einmal aufwärmen.</li>
        <li><b>Vorgekochte Kartoffeln, Linsen, Quinoa, Ofengemüse:</b> höchstens 2 Tage.</li>
        <li><b>Vegetarische Eintöpfe, Currys, Dal, Suppen:</b> höchstens 2 Tage.</li>
        <li><b>Gerichte mit Fleisch, Geflügel oder Fisch:</b> nur bis zum nächsten Tag – für später sofort einfrieren.</li>
        <li><b>Mit rohen Zutaten</b> (Dips, Kräuterquark, Tzatziki, Overnight Oats): nur bis zum nächsten Tag.</li>
        <li><b>Rohes Hackfleisch:</b> am Einkaufstag verarbeiten oder einfrieren. <b>Frischer Fisch:</b> 1 Tag. <b>Geflügel:</b> 1–2 Tage.</li>
      </ul>
      <h2>Einfrieren & Auftauen</h2>
      <ul><li>Portionsweise und flach einfrieren, beschriften (Gericht + Datum). Gekochte Gerichte höchstens 2 Monate, Reisgerichte 1 Monat lagern (bei −18 °C).</li><li><b>Auftauen im Kühlschrank</b> über Nacht – nicht auf der Arbeitsplatte. Eilig: Mikrowelle (Auftaustufe), dann sofort erhitzen.</li><li>Aufgetautes nicht erneut einfrieren (außer es wurde dazwischen gekocht).</li></ul>
      <h2>Richtig aufwärmen</h2>
      <p>Überall dampfend heiß – mindestens 70 °C für 2 Minuten. In der Mikrowelle zwischendurch umrühren und abgedeckt kurz ruhen lassen, damit sich die Hitze verteilt. Nur einmal aufwärmen.</p>
      <h2>Kerntemperaturen</h2>
      <ul><li>Geflügel und Hackfleisch: mindestens 72 °C (durchgegart, kein rosa Saft).</li><li>Lachs: 55–60 °C für saftig-glasig; für Schwangere, Kleinkinder und Immungeschwächte ≥ 63 °C.</li><li>Weißer Fisch: bis er sich in Blättern löst. Garnelen: bis sie rundum rosa und undurchsichtig sind.</li></ul>
      <p class="src">Quellen: Bundesinstitut für Risikobewertung (BfR), „Vorkochen für mehrere Tage“ (vorgekochte Speisen 2–3 Tage, mit rohen Bestandteilen 1 Tag, Kühlschrank ≤ 7 °C, besser 5 °C); Food Standards Agency/NHS zu gekochtem Reis (höchstens 1 Tag gekühlt).</p>
    {/if}
  </div>
{/if}

<style>
  .art img { display: block; width: 100%; height: auto; }
</style>
