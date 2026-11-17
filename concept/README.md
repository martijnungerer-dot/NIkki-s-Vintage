# Websiteconcept (skelet)

## Voor Nikki

Begin met [de HTML-handleiding](start-hier-nikki.html). Download de projectmap als ZIP, pak hem uit en open dit bestand in `concept/` in je browser. De handleiding bevat de Gemini-startopdracht, uitleg van winkel en invoer, inspiratie en vragen die één voor één verschijnen.

Alles in deze map is uitsluitend een skelet om gevoel bij te krijgen. Een werkende winkel en voorraadkoppeling zijn buiten deze ontwerpronde. Airtable versus rechtstreeks beheer in het winkelplatform wordt nog onderzocht.


[site-skeleton.html](site-skeleton.html) is een werkend skelet van de winkel, geen eindontwerp. Eén HTML-bestand zonder build of externe afbeeldingen. Openen in een browser is genoeg.

- Binnenkomen (`#home`): meteen een carrousel met stukken, nauwelijks tekst. Naam en prijs staan in een smalle band bovenaan de foto (de foto begint daaronder, zodat de tekst nooit over een hoofd valt); de kenmerken staan midden onderin als licht doorschijnende knopjes zonder vlak erachter, en het hartje voor het hele stuk met teller staat rechtsonder. Swipen telt niet als "niet mooi"; alleen aangeklikte hartjes tellen. Hartjes op het hele stuk (knop rechtsonder in de foto met teller, of lang drukken op de foto) of op losse kenmerken (bontsoort, model, periode, materiaal, lengte, kleur, pasvorm) leren de site wat iemand mooi vindt; de tellers zijn voorbeeldgetallen; na drie hartjes verschijnt de Perfect fit-popup.
- Onder de startcarrousel staat "Ook nieuw" met de volgende zes stukken (computer: op een rij; telefoon: opzij scrollen), met rechts naast de kop het linkje "Bekijk alles". Klik je op een stuk, dan springt de startcarrousel naar dat stuk en swipe je daar verder.
- Bladeren (`#browse`): carrousels per groep, bovenaan een persoonlijke rij.
- Productpagina (`#product`): fotocarrousel, prijs, platte maten; conditie en herkomst achter uitklapkopjes.
- Materialen (`#materials`): bontsoorten en materialen in een raster, met hartjes. Missie (`#mission`): korte missietekst (voorstel).
- Perfect fit: popup die om een e-mailadres vraagt, met daarna een plaatshouder voor de AI-meethulp.
- Getekende jassen in plaats van foto's. Alle stukken, prijzen en maten zijn voorbeelden. Het smaak-leren is een demoregel, geen echte machine learning.
- Minimalistisch en bewust neutraal: kleur, letters en sfeer bepaalt Nikki. Paginateksten in het Nederlands. Gele notities (Nederlands) verschijnen via de knop *Notes*.
- Er is geen checkout of e-mailverzending. Stijlkeuzes worden lokaal onthouden. Foto’s kunnen in een privé-HTML worden ingesloten via Sfeerfoto’s.

## Ontdekken, optie B (gekozen ontwerp, november 2026)

[ontdekken-optie-b.html](ontdekken-optie-b.html) is het gekozen ontwerp voor het shopscherm, overgenomen uit het Claude Design-canvas. Eén zelfstandig bestand, werkt offline. Dit is het uitgangspunt voor verder werk (ook in ChatGPT/Codex); verander de indeling niet zonder overleg met Martijn.

- **Indeling (van boven naar onder):** merknaam links met accounticoon rechts; grote omlijste foto; daaronder naam en prijs als twee subtiele knoppen van 44 px; onderaan in een zacht eigen vlak het vorige stuk (met terugpijltje), de drie volgende stukken en de menuknop.
- **Smalle schermen (akkoord Martijn):** onderste knoppen blijven minimaal 44 × 44 px met dezelfde verhouding 52:64. De tussenruimte mag van 8 naar 6 px; past de rij dan niet, blijven twee volgende stukken over. Op 390 px verandert niets. Deze regel geldt voor de referentie én de cloudpilot.
- **Foto:** opzij vegen of de pijltjes in de foto voor andere foto's van hetzelfde stuk; omhoog/omlaag vegen (of scrollen) voor een ander stuk; twee keer tikken om in te zoomen. Hartje en delen staan rechtsonder in de foto, de bolletjes onderin.
- **Naam:** opent een venster dat uit de knop groeit, met verkooptekst en platte maten (plaatshouders).
- **Prijs:** één tik legt het stuk in de winkelmand of haalt het eruit. Bevestiging: de knop kleurt donkerder en het mandje achter het bedrag krijgt een vinkje. Geen venster.
- **Menu:** Collectie, Mijn items, Winkelmand. De winkelmand toont de gekozen stukken met totaal; afrekenen doet nog niets.
- **Ontwerpregels:** geen tekst over foto's; knoppen minstens 44 px; universele iconen zonder woorden; alles op elk scherm op dezelfde plek; tekst minstens 16 px; geen verzonnen materiaal-, maat- of herkomstclaims.
- **Stijl:** lichte, warme basis (achtergrond `#FAF6F0`, tekst `#2E2420`, knoppen `#F3ECE3`), lettertype Newsreader met Georgia als terugval. Andere stijlen voor Nikki staan alleen in een privé-artifact.
- **Foto's:** de sfeerfoto's uit het ontwerp staan niet in Git (beeldrechten, herkenbare personen). Het bestand toont getekende jassen. Eigen foto's kunnen lokaal in `concept/fotos/` (genegeerd door Git) via het veld `foto` in de lijst met stukken.
- **Controle:** `node tests/ontdekken-optie-b.cjs` (Playwright) op 390 en 320 px, offline.
- **Cloudpilot:** de build in `app/` leest deze HTML/CSS rechtstreeks en vult hem via de bestaande NikkiStore met de publieke catalogus en beveiligde fotolinks. De menu-bestemmingen zijn daar alleen plaatshouders; het mandje bewaart lokaal stuk-ID's, zonder checkout. `npm run test:browser` vergelijkt de app met deze referentie op 390, 320 en 280 px. Zie [schermafbeeldingen](../docs/screenshots/README.md).

## Zoeken als gesprek (mock, november 2026)

[zoeken-gesprek.html](zoeken-gesprek.html): de zoekbalk uit bovenbalk B ("Wat zoek je?") als gesprek voor bezoekers. Martijn koos op 16 november 2026 voor een zoekbalk en voor variant B. Alleen een mock met een nagespeelde AI en voorbeeldstukken; de winkel is niet veranderd.

- **Telefoon:** geen apart scherm. Het gesprek leeft in de zoekbalk: daaronder één zin en hooguit één rij knoppen. De gevonden stukken staan in de grote foto en de onderrij (vier vakjes, leeg en uit als er minder zijn). Wie gaat bladeren, ziet de strook inklappen tot één regel ("2 van 3"); "Verder vragen" opent hem weer. Het kruisje in de zoekbalk stopt het zoeken.
- **Laptop (vanaf 900 px):** het hele gesprek in een kolom naast de winkel, met de gevonden stukken als raster.
- **Hulp bij zoeken (17 november):** een knop rechtsboven (schuifjes, waar in optie B het accounticoon stond) met vier standen: *Uit* (geen AI; de zoekbalk zoekt op woorden zoals de Collectie-zoekfunctie, op de laptop verdwijnt de gesprekskolom), *Zakelijk* (korte antwoorden, alleen knoppen om te verfijnen), *Gewoon* (standaard) en *Meer uitleg* (zegt ook waarom, bijvoorbeeld wat "warm" betekent). De keuze wordt in de browser onthouden.
- **Uitvergroten:** op de telefoon opent het pijltjesicoon in de strook het hele gesprek (alles wat gevraagd en geantwoord is); een tik op een stuk of het verkleinicoon sluit het weer. Op de laptop staat het hele gesprek al in de kolom.
- **Links:** een stuk dat het gesprek bij naam noemt, staat cursief in de zin en als knop eronder ("Lange wollen jas · € 180 →"); een tik toont het in de grote foto. Ook in het teruggekeken gesprek.
- **Terughoudend aanraden:** stukken alleen bij naam als er hooguit twee zijn (of één "dichtbij" als niets past); geen "perfect voor jou" of andere aanprijzing; bij veel uitkomsten blader je zelf.
- **Regels:** hooguit één vervolgvraag, en alleen als die helpt (bont, lengte, prijs). Maat alleen als de bezoeker erom vraagt: meet een jas die goed zit plat van oksel tot oksel; het antwoord zegt "past waarschijnlijk", nooit "jouw maat". Niets gevonden: eerlijk zeggen en iets dichtbij voorstellen. Alleen kenmerken uit de catalogus.
- **Controle:** `node tests/zoeken-gesprek.cjs` op 390, 320 × 568 en 1280 px, offline. Schermafbeeldingen in `docs/screenshots/zoeken-gesprek/`.

## Invoerprototype voor Nikki

[intake-prototype.html](intake-prototype.html) laat Nikki ervaren hoe invoeren met automatische voorstellen gaat. Scherm 1: foto's maken of kiezen in willekeurige volgorde, dan *Verwerken*. Scherm 2: één compacte checklist met het hele pad tot publiceren (Foto's, Wat is het, Bontsoort, Maten, Bijzonderheden, Titel en prijs). Tik aan wat klopt; het voorstel staat al aan. Een keuze die nog niet bestaat typ je via *+ nieuw* en die staat de volgende keer klaar. Daarna *Publiceren (proef)* en zie je welke voorbeeldklanten een mail zouden krijgen.

- De AI werkt alleen in de gepubliceerde Claude-versie (artifact), op het Claude-account van wie het opent. Als los bestand of in Gemini zit er geen AI in; dan vult ze alles zelf in.
- Het kledingstuk wordt niet opgeslagen of naar Airtable geschreven. Eigen keuzewoorden en een correctieteller worden lokaal onthouden. Bij automatische analyse in Claude worden geselecteerde foto’s naar Claude gestuurd; de losse handmatige versie doet dat niet. De klanten zijn verzonnen voorbeelden.
- *Bevat het bont?* (Ja / Alleen kraag of rand / Nee) is een vaste keuze, los van de materiaalnaam. Bij Ja of kraag/rand is de soort verplicht en vinkt Nikki aan dat ze die zelf heeft gecontroleerd. Een gekozen soort bij Nee moet eerst gewist worden.
- Per foto is de plek aan te passen en is een hoofdfoto aan te wijzen; zonder keuze geldt de foto met plek Voorkant. De uploadvolgorde bepaalt niets.
- Terug naar foto's en opnieuw verwerken bewaart maten, prijs en gemaakte keuzes; alleen *Volgend stuk* begint leeg.
- Leren: eigen keuzes en aanpassingen op voorstellen worden in deze browser onthouden. In de echte versie worden ze trainingsdata voor betere voorstellen (server-side).

## Nieuw stuk als gesprek (mock, november 2026)

[invoer-gesprek.html](invoer-gesprek.html) laat zien hoe invoeren voelt als de AI het gesprek leidt. Eén zelfstandig bestand in de stijl van optie B. De AI is nagespeeld: hij "ziet" altijd dezelfde jas en de reacties zijn vaste zinnen. Er wordt niets opgeslagen.

- **Eén geheel (versie 2).** Bovenaan het podium: eerst een groot cameravlak, daarna de foto groot in beeld, en bij een maatvraag de tekening van waar het meetlint ligt. Terwijl de AI "kijkt" trekt er een lichtbaan over de foto. Daaronder de vraag, die woord voor woord verschijnt, met de eerdere antwoorden als rij knoppen erboven (tik om te wijzigen).
- **Eén vraag per keer.** Eerst de foto's, dan vragen zoals "Wat voor bont is dit?". Antwoorden met een knop, door te typen of te dicteren, of door te praten.
- **Praten:** het vakje met de golfjes staat op elke vraag op dezelfde plek. Rust is lage streepjes, een lopende golf betekent dat de AI de vraag voorleest, dansende streepjes dat hij luistert. De golfjes bewegen onregelmatig en gaan hoger zodra de spraakherkenning een stem hoort; ze volgen nog niet het echte volume (dat komt pas met een live stem). Het begint pas na een tik. Het gebruikt de voorleesstem en spraakherkenning van de browser; waar die ontbreken, zegt de mock dat en blijft typen werken.
- **Nooit vastlopen:** elke vraag heeft "Weet ik nog niet", ook de maten. Aan het eind staat wat de boetiek nog nodig heeft, en het stuk kan als concept bewaard worden.
- **Regels:** de bontsoort wordt nooit voorgesteld en komt alleen van Nikki. Wat de AI wel zag, legt hij voor als "klopt dat?". Maten in cm, tot 300. De complimenten ("O, mooi spul.") zijn voor Nikki en komen niet in de titel of het overzicht.
- **Controle:** `node tests/invoer-gesprek.cjs` op 390 en 320 px. Zie de [schermafbeeldingen](../docs/screenshots/invoer-gesprek/README.md).

Sinds 15 november 2026 is dit het echte scherm Nieuw stuk in de app (`app/intake/`), met de bestaande fotoanalyse. Deze mock blijft als ontwerpbron bestaan. Nog niet gebouwd: reacties en vraagtekst uit de serverfunctie `analyse`, en het prijsvoorstel uit eigen verkopen (in de mock een voorbeeld).

## Stijlen kiezen (voor Nikki)

Linksonder in het skelet staat een stijlknop. Daarmee wisselt Nikki tussen vijf stijlen; de indeling blijft gelijk, alleen kleuren, letters en knopvormen veranderen.

| Stijl | Gevoel | Kleuren en letters |
|---|---|---|
| Ivoor | strak, minimalistisch (standaard) | ivoor, espresso; Libre Caslon en Work Sans |
| Parisienne | chic met een vleugje roze | poederroze, crème, zwart; Cormorant Garamond en Jost |
| Bonbon | lief en speels | zacht roze, framboos; Fredoka en Nunito |
| Hollywood | glamour, avond | zwart, champagne, roze accent; Playfair Display en Montserrat |
| Boudoir | vintage, warm | perzik, oudroze, bordeaux; Bodoni Moda en Lato |

- Het hartje naast de stijlnaam markeert een stijl die ze mooi vindt.
- *Mijn keuze* vraagt: mooiste stijl, chic of speels (schuifje) en wat ze zou veranderen. *Kopieer mijn antwoorden* zet alles als korte tekst op het klembord, om naar Martijn te sturen.
- Keuzes worden alleen in haar eigen browser onthouden; er wordt niets verstuurd.
- Elke stijl geeft de foto's een eigen lijst: Ivoor een dunne lijn, Parisienne een boog met gouden rand, Bonbon afgeronde hoeken met een sticker, Hollywood een spotlicht, Boudoir een ovaal op behangpatroon.

## Foto's

De knop **Sfeerfoto’s** laat Nikki per plek een JPEG, PNG of WebP toevoegen (maximaal 8 MB per foto). **Bewaar HTML met foto’s** downloadt één zelfstandig HTML-bestand met de beelden én de gekozen beginstijl. Alle vijf stijlen blijven beschikbaar. Foto’s worden niet naar een server geüpload en zijn pas bewaard na deze export. Ze blijven buiten Git. Het label bij elke foto maakt duidelijk dat productgegevens verzonnen voorbeelden zijn; er worden geen kenmerken uit de foto afgeleid.

Een aangeleverd `.htm`-bestand is een opgeslagen webpagina en kan niet als foto worden geïmporteerd. Gebruik in de browser ‘Afbeelding opslaan als’ en kies daarna het afbeeldingsbestand. De tekeningen blijven staan op plekken waar geen foto is toegevoegd.

## Verder werken in Gemini

Gebruik Gemini om de gekozen stijl verder te verfijnen.

1. Download `site-skeleton.html` uit GitHub (knop *Download raw file*) of krijg het bestand van Martijn.
2. Open Gemini, kies **Canvas**, upload het bestand en vraag Gemini er een webpagina-voorbeeld van te maken.
3. Gebruik bijvoorbeeld deze opdracht:

> Dit is een werkend skelet voor een webshop in vintage bont, leer en shearling, voor Nikki. Behoud de structuur, teksten en alle werkende onderdelen (carrousels, hartjes met teller, lang drukken op de foto, Perfect fit-popup, stijlknop en Mijn keuze). Houd je aan de regels in het commentaar bovenaan het bestand: maten plat in cm, bontsoort altijd benoemen maar alleen zoals Nikki die heeft vastgesteld, geen verzonnen claims, alle stukken zijn voorbeelden.
> Mijn favoriete stijl is [naam]. Werk die verder uit: [wensen, bijv. meer roze, ander lettertype, ronde foto's]. Pas alleen de kleur- en lettervariabelen bij `:root[data-style="…"]` en de knopvormen aan, niet de indeling. Zorg dat alles goed leesbaar blijft (voldoende contrast) en werkt op een telefoon.

4. Stuur het resultaat (het HTML-bestand of de Gemini-link) naar Martijn. Claude of Codex zet het daarna terug in deze repository.

Gemini heeft geen toegang tot GitHub of Airtable van dit project. Werk daarom met kopieën en lever wijzigingen aan via Martijn.


## Controles voor ontwikkelaars

`node scripts/check-project.mjs` controleert de fundering. De aanvullende browsercontrole is `node tests/prototypes.cjs` met Playwright en Chromium geïnstalleerd. Eventueel `CHROMIUM_PATH=/usr/bin/chromium` instellen voor een bestaande browser. Er is geen npm-project of productiebuild toegevoegd; Playwright is een testvereiste, geen afhankelijkheid van de HTML-bestanden.

De test controleert mobiele documentmodus en breedte, de vijf stijlen en stijlkeuze, foto-import/export/heropenen (met synthetische testpixel), de handleiding, numerieke invoer, onverwachte bontclassificaties en behoud van invoer. Externe aanvragen worden geblokkeerd. De Claude-analyse en Gemini Canvas zijn niet live getest.
