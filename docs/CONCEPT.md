# Verkoopconcept: vintage outerwear die past

Status: **brainstorm**. Niets in dit document is een bouwopdracht of definitief productbesluit, tenzij het onder "Vastgesteld" staat. Bron: brainstorm van Martijn met ChatGPT en Claude, november 2026.

## Vastgesteld door Martijn

- **Naam (14 november 2026): GSF, voluit Guaranteed Secondhand Fur.** De website heet niet meer Nikki's Boetiek. Bij elk stuk gaat een broche mee (ontwerp in uitvoering, wel vaststaand; beeld: [brand/gsf-broche.webp](brand/gsf-broche.webp), met de tekst "Reworn. Respected. Responsible."). De broche is ook het app-icoon.
- Assortiment: vooral vintage bontjassen, leren jassen, shearling en vergelijkbare outerwear.
- Inkoop: Nikki koopt zelf in op markten en via connecties en houdt eigen voorraad. Geen marketplace van andere verkopers, voor nu.
- Focus: de website en de verkoopervaring. De meet-/verstelbare paspop staat **on hold** (zie onderaan).

## Richting voor de website (Martijn, 1 november 2026)

- **Minimalisme.** Beeld draagt de site; tekst alleen waar een bezoeker die nodig heeft om te beslissen (titel, prijs, maten, conditie). Overige uitleg achter uitklapkopjes.
- **Binnenkomen = carrousel** met verschillende stukken, zonder tekstblokken. Bladeren door de collectie komt daarna, ook in carrouselvorm.
- **Smaak leren met machine learning.** Hartjes en kijkgedrag vormen het signaal; de site toont daarop eerst wat iemand waarschijnlijk mooi vindt en mailt het perfecte stuk als suggestie.
- **Perfect fit = popup** die om een e-mailadres vraagt.
- **Bontsoort altijd benoemen.** Bij bont staat de soort (nerts, vos, persianer, enzovoort) zichtbaar bij het stuk en is een eigen kenmerk om een hartje aan te geven. Nikki stelt de soort vast vóór publicatie; kan dat niet betrouwbaar, dan wordt het stuk niet als die soort verkocht. Voorstel voor de publisher: bont zonder vastgestelde soort niet publiceren.
- **Nederlandstalig.** De site is voorlopig in het Nederlands.
- **AI-meethulp** begeleidt klanten bij het opmeten van hun eigen kleding. Nog uit te werken (zie hieronder).

Het skelet in [concept/](../concept/README.md) volgt deze richting. Het smaak-leren is daar een eenvoudige demoregel, geen echte machine learning.

## Het probleem

Bij een gewone webshop kies je een model en daarna een maat. Bij Nikki is er één jas met één pasvorm, vaak uit een ander modetijdperk, met labelmaten die niet overeenkomen met moderne maten. De vraag is niet "heb je mijn maat?" maar "past dít ene stuk mij, en vind ik het mooi?". De verkoopervaring moet die onzekerheid op afstand verkleinen.

## Concept in drie delen (werktitels)

1. **Pasprofiel** ("Fit Passport"). De klant legt één keer vast wat haar past. Voorkeursroute: de platte maten van een eigen jas die goed zit, gemeten volgens dezelfde methode als Nikki ([flat-v1](MEASUREMENTS.md)). Dan vergelijken we kledingstuk met kledingstuk, zonder omrekening van lichaamsmaten. Lichaamsmaten invoeren kan als eenvoudiger alternatief; schatten uit smartphonefoto's niet in de eerste versie.
2. **Dossier per kledingstuk** ("Garment DNA"). Bestaat grotendeels al in Airtable: maten, constructie, materiaal met onderbouwing, conditie, foto's van details en gebreken.
3. **Omgekeerd winkelen** ("The Perfect Find"). De klant hoeft niet steeds te zoeken. Komt er een stuk binnen dat bij haar maten en smaak past, dan krijgt ze een melding. Nikki ziet daarnaast waar vraag naar is voordat ze inkoopt.

Idee van Martijn voor de smaakkant: een **swipe-systeem** (à la Tinder) om snel een algemeen beeld te krijgen van wat iemand mooi vindt.

## Wat uitgewerkt moet worden

### Smaakprofiel (swipen)
- Waarop wordt geswiped? Echte voorraad is na verkoop weg en in het begin klein. Een vaste set inspiratiebeelden of stijlen is waarschijnlijk stabieler.
- Welke kenmerken leren we? Bijvoorbeeld categorie, materiaal, lengte, silhouet, kleur, periode. Nikki moet die per stuk betrouwbaar kunnen invullen; dat vraagt nieuwe Airtable-velden (schemawijziging, documenteren).
- Naast swipen een paar harde voorkeuren ("geen bont", "alleen lang").

### Maatprofiel en pasvormvergelijking
- Platte breedte is geen lichaamsomtrek. Een jas met 54 cm borstbreedte plat is níet "108 cm borstomvang" als harde maat: voering en dikte van bont of shearling verkleinen de binnenruimte.
- Laag 1: rekenkundige vergelijking met marges (bijv. borstbreedte binnen ±2 cm van het referentiestuk, plus de tolerantie per meting). Gewone software, geen AI.
- Laag 2: regels voor materiaal en constructie (stug leer, dikke voering, raglan, schoudervulling).
- Laag 3: begrijpelijke uitleg, bijv. "de mouwen zijn waarschijnlijk iets korter dan je referentiejas".
- Geen matchpercentages of pasgaranties totdat we gemeten hebben hoe betrouwbaar het is. Altijd formuleren als vergelijking, niet als belofte.

### Matching en meldingen
- Wanneer is iets "in de gading"? Drempel instellen; te veel meldingen leidt tot afmelden.
- Eén exemplaar, veel geïnteresseerden: iedereen tegelijk (wie het eerst komt), beste matches eerst met een kort voorrangsvenster, of een korte reservering. Voorrang of reservering moet via het winkelplatform lopen, anders ontstaat dubbelverkoop.
- Wat ziet iemand die te laat is? Bijvoorbeeld "verkocht" met vergelijkbare stukken of "houd me op de hoogte".
- Kanaal: e-mail eerst. Webpush werkt beperkt op iPhone; WhatsApp/sms later bekijken.

### Account en privacy (AVG)
- Smaak, maten en contactgegevens zijn persoonsgegevens: toestemming, double opt-in, eenvoudig afmelden en profiel verwijderen.
- Klantgegevens horen niet in Airtable of Git, maar in het winkelplatform of een aparte klant-/e-mailtool. Dat weegt mee in de platformkeuze (P1).
- Open: is een account verplicht of volstaat een e-mailadres?

### Materiaal en herkomst
- Diersoort, zekerheid van identificatie, herkomst en bewijs per stuk vastleggen (velden bestaan grotendeels: Species, Material evidence, Provenance notes, Sale eligibility).
- Voor sommige soorten gelden handelsregels (onder andere CITES) en de EU verbiedt handel in honden- en kattenbont. Dit moet voor de lancering inhoudelijk worden geverifieerd; deze projectdocumenten zijn geen juridische beoordeling. AI mag diersoort of legaliteit nooit zelfstandig bevestigen.

### Smaak leren (machine learning)
- Begin eenvoudig: kenmerken per stuk (materiaal, lengte, silhouet, kleur) plus hartjes geven een score. Pas met genoeg gebruikers en verkopen loont een echt lerend model.
- Koude start: een nieuwe bezoeker heeft nog geen hartjes; toon dan een gevarieerde mix, geen "populair"-lijst die steeds dezelfde stukken laat zien.
- Profilering voor gepersonaliseerde e-mails vraagt onder de AVG duidelijke uitleg en toestemming. Het gedrag van bezoekers zonder account niet langer bewaren dan nodig.
- Een gesuggereerd stuk kan al verkocht zijn als de mail wordt geopend; de mail linkt naar de actuele beschikbaarheid in het winkelplatform.

### Hartjes op kenmerken
Bezoekers kunnen in de startcarrousel een hartje geven aan het hele stuk én aan losse kenmerken: model (silhouet), periode, materiaal, lengte, kleur en pasvorm. Dat geeft per klik een veel preciezer signaal dan een hartje voor de hele jas.
- Dit vraagt gestructureerde velden in Airtable (bijv. keuzelijsten voor model, lengte, kleur, pasvorm en periode per decennium). Nu is er alleen het vrije tekstveld Era notes. Schemawijziging nog niet uitgevoerd; eerst met Nikki de lijsten vaststellen.
- Een periode wordt alleen getoond als die onderbouwd is (label, constructie, herkomst). Onbekend = geen kenmerk tonen, geen gok.

### AI-meethulp (nog uit te werken)
Doel: de klant meet een eigen jas die goed zit, zo nauwkeurig dat we die met Nikki's platte maten kunnen vergelijken. Opties om te bespreken:
- **Stap-voor-stap met meetlint**: AI legt per maat uit waar je meet, met een tekening, en controleert of de waarden logisch zijn (bijvoorbeeld mouw korter dan ruglengte).
- **Foto met referentievoorwerp**: jas plat op de grond, van bovenaf gefotografeerd, met een liniaal, een A4-vel of een bankpas ernaast als schaal. AI schat de maten uit de foto en laat de klant ze bevestigen.
- **Meetmat of meetkaart van de winkel**: een geprint vel of een pakketje met vaste markeringen, zodat foto's betrouwbaarder zijn.
- **AR-meten met de telefoon**: bestaat, maar is bij zachte en dikke stof waarschijnlijk te onnauwkeurig voor de eerste versie.
Open vragen: welke nauwkeurigheid is nodig (±1 cm?), hoe ga je om met perspectief en een niet helemaal plat liggende jas, worden klantfoto's bewaard (liever niet), en hoe meten we of de hulp werkt? Eerst testen met een paar mensen en hun echte jassen, de uitkomst vergelijken met handmatig meten.

### Contentkant: invoer met AI (zelfde project, apart onderdeel)
Nikki fotografeert een stuk met haar telefoon; AI stelt kenmerken en teksten voor; Nikki controleert, meet met het meetlint en keurt goed; het stuk gaat naar Airtable en na publicatie in de winkel; klanten met passende hartjes, maten en toestemming krijgen het als suggestie. Het deelt de database en kenmerken met de website en hoort dus in dit project, als eigen scherm.
- AI stelt voor, Nikki beslist. Bontsoort en periode altijd door Nikki bevestigd; waarschuwing bij mogelijk verboden of beschermde soorten.
- Maten nooit uit foto's.
- Mails pas als het stuk echt te koop staat; bij meerdere kandidaten geldt wie het eerst komt.
- Eerste echte versie: Airtable-app voor foto's plus een server-side AI-stap die velden vooraf invult (P2). Een eigen app pas als dat werkt.
- Prototype om de ervaring te proeven: [concept/intake-prototype.html](../concept/intake-prototype.html).

## Eerst testen, dan bouwen

1. **Vraagtest zonder techniek.** Een eenvoudig formulier: een paar stijlbeelden kiezen, platte maten van een favoriete jas invullen, e-mail met toestemming. Nikki mailt handmatig wie matcht bij nieuwe stukken. Meten: aanmeldingen, klikken, verkopen.
2. **Pasvormproef.** Ongeveer tien echte jassen meten volgens flat-v1 en vijf tot tien mensen met verschillende maten laten passen. Voorspelde pasvorm vergelijken met hun ervaring, per zone (schouders, borst, mouwen, lengte).
3. Pas daarna automatiseren: matching, profielen, meldingen.

Pasvormfeedback na passen of aankoop kan op termijn een eigen dataset voor vintage outerwear opleveren. Dat is een mogelijk onderscheidend voordeel, geen aanname voor de eerste versie.

## Niet in de eerste versie

- Fotorealistische virtuele paskamer: bij volumineuze jassen geeft dat snel een onjuiste indruk van de pasvorm.
- Lichaamsmaten schatten uit foto's.
- AI-gegenereerde productfoto's als vervanging voor echte foto's.

## On hold: de paspop

Martijn noemde een opblaasbare of verstelbare paspop. De beschrijving is nog onvolledig; het doel (stukken meten, klantmaten nabootsen of presentatie) moet nog worden vastgelegd. Interessant voor later, buiten de huidige scope.

## Niet-geverifieerde claims uit de brainstorm

De ChatGPT-brainstorm noemde onder meer retourpercentages tot circa 50% in Europese mode (Zalando), circa 23% van consumenten die generatieve AI als startpunt gebruikt (McKinsey, State of Fashion 2026) en bouwbudgetten van €300–€1.500. Deze cijfers zijn niet gecontroleerd en zijn geen basis voor besluiten.

## Open vragen voor Nikki en Martijn

- Doelgroep, en hoeveel stukken komen er ongeveer per week of maand binnen?
- Prijsklasse van een typisch stuk?
- Mag een goede match voorrang krijgen, of is iedereen gelijk?
- Welke stijlkenmerken kan Nikki per stuk betrouwbaar invullen?
- Is passen op afspraak (fysiek) een optie naast online verkoop?
- Wat is precies het doel van de paspop?
