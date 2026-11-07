# Ontwerpbrief — Nikki’s Boetiek

Datum: 7 november 2026. Status: analyse en ontwerpafspraken; nog geen goedgekeurd uitvoeringsontwerp. Eigenaar besluitvorming: Martijn. Codebasis gecontroleerd: `main` op `2682a0f` (PR #16).

## Vastgelegd met Martijn

- De frontend krijgt een veel minimalistischere mobiele winkelervaring. Kleding en foto's krijgen de meeste ruimte; de eerdere schetsen bevatten te veel knoppen.
- Ontdekken is de landingspagina. De bezoeker wordt meegenomen van kledingstuk naar kledingstuk, met een ervaring geïnspireerd op Instagram en rondkijken in een echte boetiek. Martijn kiest één kledingstuk per scherm zoals Reels, met linksonder een kleine preview van het volgende kledingstuk. Die preview is geen extra foto van het huidige stuk.
- Niet direct aan winkelen gerelateerde zaken komen achter het accounticoon, waaronder beheer. Het openen van algemene informatie mag geen beheerderslogin vereisen.
- Eerst skills beschikbaar maken en projectafspraken vastleggen, daarna het ontwerp samen beoordelen, daarna pas de frontend bouwen. Het totale bereik van de functionele vernieuwing is nog niet definitief afgesproken.
- Eigen branches en PR's; Martijn beslist over merge en release.

## Bestaande eerste pagina: analyse van de code

| Onderdeel | Huidig gedrag | Betekenis voor herontwerp |
|---|---|---|
| Buitenste appbalk | Boetiek, Beheer, na login Nieuw stuk, collectie vernieuwen en uitloggen | Verminderen van zichtbare beheerbediening; functies moeten bereikbaar blijven |
| Winkelnavigatie | Collectie, Materialen, Missie, Perfect fit en notities | Meerdere navigatielagen dragen bij aan drukte |
| Grote carrousel | Horizontaal tussen kledingstukken; pijlen onderaan in de foto; teller | Wordt opnieuw ontworpen vanuit het gewenste gedrag van Ontdekken |
| Foto's per stuk | Miniaturen rechts op mobiel, onderaan op desktop | Eerder gebouwd maar mag na ontwerpkeuze worden vervangen door horizontaal vegen tussen foto's |
| Naam en prijs | In de foto; titel opent productdetails | Beslisinformatie zichtbaar houden zonder grote extra knop |
| Hartjes | Voor kledingstuk en voor losse kenmerken; lokale demovoorkeuren in geheugen | Bewaren, smaakvoorkeur en winkelmand uit elkaar houden; duurzame favorieten zijn extra werk |
| Perfect fit | Prototype met popup na drie hartjes; geen bewezen klantdienst | Bespreken vóór behoud of verwijderen; voorgesteld: geen ongevraagde onderbreking tijdens ontdekken |
| Ook nieuw | Extra collectiekaarten onder de carrousel | Kan overbodig worden als Ontdekken zelf een doorlopende reeks wordt |
| Stijlkeuze/Mijn keuze | Vijf stijlen en feedback op stijl | Niet verwarren met bewaarde kledingstukken; voorgesteld onder account/voorkeuren plaatsen |
| Catalogus verversen | Behoudt zichtbare positie; ondertekende fotolinks worden vernieuwd | Behoud van positie en geldige foto's blijven functionele eisen |

Bronnen: [app/index.html](../app/index.html), [store-extension.js](../app/store-extension.js), [site-skeleton.html](../concept/site-skeleton.html) en [build-connected-demo.mjs](../scripts/build-connected-demo.mjs). De bouwstap past prototypegedrag aan voor echte catalogusrecords, waaronder de voorbeeldtellers. Deze analyse is van code; het bewijst geen huidige live deployment.

## Voorgesteld gedrag van Ontdekken — nog te beoordelen

| Actie | Voorstel | Zichtbare bediening |
|---|---|---|
| Binnenkomen | Meteen een echt beschikbaar kledingstuk; geen grote introductie | Foto, compacte naam en prijs |
| Verder ontdekken | Verticaal naar het volgende kledingstuk | Geen permanente grote knopbalk |
| Andere foto | Horizontaal door de foto's van hetzelfde stuk | Kleine fototeller of stipjes; een bedienbaar alternatief voor vegen |
| Details bekijken | Tik op het stuk of de producttitel; open een detailpaneel | Geen grote dubbele 'Bekijk details'-knop |
| Bewaren | Hartje aan/uit met duidelijke terugkoppeling | Eén hartje; geen fictieve populariteitsgetallen |
| Navigeren | Tik op compact menu linksonder of rechtsonder | Opent een kort paneel met tekstlabels |
| Terug naar ontdekken | Sluit details/menu of keer terug vanuit collectie | Zelfde kledingstuk, foto en positie |

Eén kledingstuk per scherm is gekozen. Twee nieuwe visuele voorstellen zijn gemaakt: A beeldvullend en B met lichte omlijsting. De keuze tussen die twee staat nog open; het Shop-menu rechtsonder is een voorstel. De eerdere miniaturen en schetsen worden niet automatisch eisen voor deze nieuwe ervaring.

## Klein winkelmenu

Martijn stelt een klein touchmenu in een onderhoek voor om ruimte voor kleding te behouden. Aanbevolen uitwerking ter beoordeling: één knop met begrijpelijk label, die met één tik een kort menu opent. Geen bediening die alleen met lang drukken, hover of slepen werkt. 'Klein' betekent weinig schermruimte, niet een moeilijk raakbaar doel.

Voorgestelde bestemmingen: Ontdekken, Collectie, Mijn items en later Winkelmand/Afrekenen. Account biedt de niet-winkelfuncties. De betekenis van Mijn items is nog open: favorieten of een combinatie met winkelmand/aankopen. Die functies niet stilzwijgend samenvoegen. Linksonder versus rechtsonder wordt op telefoon beoordeeld; nog geen keuze vastleggen.

Een verborgen menu bespaart ruimte, maar maakt routes minder zichtbaar en kost een extra tik. Daarom testen met iemand die het ontwerp nog niet kent: kan die een favoriet terugvinden en verder winkelen zonder uitleg? Menu mag productinformatie, hartje en belangrijke fotodetails niet afdekken. Houd rekening met telefoonsafe-areas, browserbalken, toetsenbordfocus en schermlezers. Richtwaarde: bedienbare doelen minimaal 44 bij 44 CSS-pixels.

## Wat nog niet bestaat

- Een winkelmand, betaling, reservering en betrouwbare checkoutvoorraad. De huidige `published/sold`-status is catalogusbeheer, geen winkelvoorraadsysteem. Een menu-item Betalen zou pas echt werken na afzonderlijke commerce-integratie; geen werkende betaling simuleren op de live site.
- Klantaccounts en favorieten die tussen apparaten synchroniseren. De huidige login is voor staff; die niet behandelen als klantaccount.
- AI-zoeken en AI-personalisatie voor bezoekers. Fotoanalyse voor de beheerder is een afzonderlijke functie. Json-render is niet geïnstalleerd. AI-zoeken blijft een mogelijke vervolgstap; geen eis voor de eerste ontwerpbeoordeling.

## Open vragen — één voor één

1. Verticale beweging is beantwoord: één kledingstuk per scherm zoals Reels, plus preview van het volgende stuk linksonder. Visuele uitwerking A (beeldvullend) of B (licht omlijst) is nog te kiezen.
2. Wat betekent Mijn items: alleen favorieten of ook mand/aankopen?
3. Welke informatie moet permanent zichtbaar zijn bij de foto: alleen naam/prijs of ook maat/beschikbaarheid?
4. Waar voelt het winkelmenu bereikbaar zonder te storen? Account als aparte ingang of via dit menu?
5. Welke bestaande functies behouden/verplaatsen/vervangen we, waaronder kenmerkenhartjes, Perfect fit, stijlkeuze en het invoerscherm?
6. Wanneer valt checkout binnen scope en welk systeem beheert dan het unieke exemplaar?

Geen stilzwijgende instemming uit een onbeantwoorde vraag afleiden. Voorlopige aanbevelingen mogen wel als zodanig in schetsen zichtbaar worden gemaakt.

## Beoordeling vóór de bouw

Na beantwoording van de belangrijkste vragen: maak een compacte schermschets van Ontdekken, het geopende winkelmenu en productdetails. Laat zien hoe teruggaan werkt en onderscheid bestaande functies van uitbreidingen. Martijn beoordeelt die concrete uitwerking voordat applicatiecode verandert.

Bij latere implementatie: test op 320 en 390 pixels breed en desktop, met meerdere stukken en meerdere foto's, langzame/lading-mislukte foto's, lege collectie, verkochte stukken, heropenen en toetsenbordbediening. Producten mogen niet dubbel verschijnen om een eindeloze collectie te suggereren. Voorkom dat nieuwe resultaten of verversing de bezoeker van positie laten springen. Behoud de relevante bestaande database-, opslag- en invoercontroles. Algemene skilladviezen zijn aanvullend; deze projectbrief en expliciete gebruikerskeuzes zijn leidend.
