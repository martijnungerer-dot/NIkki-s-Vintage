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

## Invoerprototype voor Nikki

[intake-prototype.html](intake-prototype.html) laat Nikki ervaren hoe invoeren met automatische voorstellen gaat. Scherm 1: foto's maken of kiezen in willekeurige volgorde, dan *Verwerken*. Scherm 2: één compacte checklist met het hele pad tot publiceren (Foto's, Wat is het, Bontsoort, Maten, Bijzonderheden, Titel en prijs). Tik aan wat klopt; het voorstel staat al aan. Een keuze die nog niet bestaat typ je via *+ nieuw* en die staat de volgende keer klaar. Daarna *Publiceren (proef)* en zie je welke voorbeeldklanten een mail zouden krijgen.

- De AI werkt alleen in de gepubliceerde Claude-versie (artifact), op het Claude-account van wie het opent. Als los bestand of in Gemini zit er geen AI in; dan vult ze alles zelf in.
- Het kledingstuk wordt niet opgeslagen of naar Airtable geschreven. Eigen keuzewoorden en een correctieteller worden lokaal onthouden. Bij automatische analyse in Claude worden geselecteerde foto’s naar Claude gestuurd; de losse handmatige versie doet dat niet. De klanten zijn verzonnen voorbeelden.
- *Bevat het bont?* (Ja / Alleen kraag of rand / Nee) is een vaste keuze, los van de materiaalnaam. Bij Ja of kraag/rand is de soort verplicht en vinkt Nikki aan dat ze die zelf heeft gecontroleerd. Een gekozen soort bij Nee moet eerst gewist worden.
- Per foto is de plek aan te passen en is een hoofdfoto aan te wijzen; zonder keuze geldt de foto met plek Voorkant. De uploadvolgorde bepaalt niets.
- Terug naar foto's en opnieuw verwerken bewaart maten, prijs en gemaakte keuzes; alleen *Volgend stuk* begint leeg.
- Leren: eigen keuzes en aanpassingen op voorstellen worden in deze browser onthouden. In de echte versie worden ze trainingsdata voor betere voorstellen (server-side).

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
