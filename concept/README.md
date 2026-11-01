# Websiteconcept (skelet)

[site-skeleton.html](site-skeleton.html) is een werkend skelet van de winkel, geen eindontwerp. Eén HTML-bestand zonder build of externe afbeeldingen. Openen in een browser is genoeg.

- Binnenkomen (`#home`): meteen een carrousel met stukken, nauwelijks tekst. Naam en prijs staan in een smalle band bovenaan de foto (de foto begint daaronder, zodat de tekst nooit over een hoofd valt); kenmerken en hartje staan in een doorschijnend paneel onderaan in het midden. Hartjes op het hele stuk (knop rechtsonder in de foto met teller, of lang drukken op de foto) of op losse kenmerken (bontsoort, model, periode, materiaal, lengte, kleur, pasvorm) leren de site wat iemand mooi vindt; de tellers zijn voorbeeldgetallen; na drie hartjes verschijnt de Perfect fit-popup.
- Bladeren (`#browse`): carrousels per groep, bovenaan een persoonlijke rij.
- Productpagina (`#product`): fotocarrousel, prijs, platte maten; conditie en herkomst achter uitklapkopjes.
- Materialen (`#materials`): bontsoorten en materialen in een raster, met hartjes. Missie (`#mission`): korte missietekst (voorstel).
- Perfect fit: popup die om een e-mailadres vraagt, met daarna een plaatshouder voor de AI-meethulp.
- Getekende jassen in plaats van foto's. Alle stukken, prijzen en maten zijn voorbeelden. Het smaak-leren is een demoregel, geen echte machine learning.
- Minimalistisch en bewust neutraal: kleur, letters en sfeer bepaalt Nikki. Paginateksten in het Nederlands. Gele notities (Nederlands) verschijnen via de knop *Notes*.
- Er wordt niets opgeslagen of verstuurd; er is geen checkout.

## Invoerprototype voor Nikki

[intake-prototype.html](intake-prototype.html) laat Nikki ervaren hoe invoeren met automatische voorstellen gaat. Scherm 1: foto's maken of kiezen in willekeurige volgorde, dan *Verwerken*. Scherm 2: één compacte checklist met het hele pad tot publiceren (Foto's, Wat is het, Bontsoort, Maten, Bijzonderheden, Titel en prijs). Tik aan wat klopt; het voorstel staat al aan. Een keuze die nog niet bestaat typ je via *+ nieuw* en die staat de volgende keer klaar. Daarna *Publiceren* en zie je welke voorbeeldklanten een mail zouden krijgen.

- De AI werkt alleen in de gepubliceerde Claude-versie (artifact), op het Claude-account van wie het opent. Als los bestand of in Gemini zit er geen AI in; dan vult ze alles zelf in.
- Er wordt niets opgeslagen, niets verstuurd en niets naar Airtable geschreven. De klanten zijn verzonnen voorbeelden.
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

Het skelet toont per stuk een foto als die in `PHOTOS` (in de code) staat, anders een tekening. In Git is `PHOTOS` leeg. De gepubliceerde, privé conceptversie krijgt sfeerfoto's die Martijn aanleverde; die staan bewust niet in de repository, omdat de beeldrechten niet bij ons liggen en er herkenbare personen op staan. Voor de echte site komen hier foto's van Nikki's eigen jassen. Een nieuwe publicatie vanuit Git toont dus weer tekeningen, tot de foto's opnieuw worden ingevoegd.

## Verder werken in Gemini

Gebruik Gemini om de gekozen stijl verder te verfijnen.

1. Download `site-skeleton.html` uit GitHub (knop *Download raw file*) of krijg het bestand van Martijn.
2. Open Gemini, kies **Canvas**, upload het bestand en vraag Gemini er een webpagina-voorbeeld van te maken.
3. Gebruik bijvoorbeeld deze opdracht:

> Dit is een werkend skelet voor een webshop in vintage bont, leer en shearling, voor Nikki. Behoud de structuur, teksten en alle werkende onderdelen (carrousels, hartjes met teller, lang drukken op de foto, Perfect fit-popup, stijlknop en Mijn keuze). Houd je aan de regels in het commentaar bovenaan het bestand: maten plat in cm, bontsoort altijd benoemen maar alleen zoals Nikki die heeft vastgesteld, geen verzonnen claims, alle stukken zijn voorbeelden.
> Mijn favoriete stijl is [naam]. Werk die verder uit: [wensen, bijv. meer roze, ander lettertype, ronde foto's]. Pas alleen de kleur- en lettervariabelen bij `:root[data-style="…"]` en de knopvormen aan, niet de indeling. Zorg dat alles goed leesbaar blijft (voldoende contrast) en werkt op een telefoon.

4. Stuur het resultaat (het HTML-bestand of de Gemini-link) naar Martijn. Claude of Codex zet het daarna terug in deze repository.

Gemini heeft geen toegang tot GitHub of Airtable van dit project. Werk daarom met kopieën en lever wijzigingen aan via Martijn.
