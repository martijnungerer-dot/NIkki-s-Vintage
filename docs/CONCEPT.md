# Verkoopconcept: vintage outerwear die past

Status: **brainstorm**. Niets in dit document is een bouwopdracht of definitief productbesluit, tenzij het onder "Vastgesteld" staat. Bron: brainstorm van Martijn met ChatGPT en Claude, november 2026.

## Vastgesteld door Martijn

- Assortiment: vooral vintage bontjassen, leren jassen, shearling en vergelijkbare outerwear.
- Inkoop: Nikki koopt zelf in op markten en via connecties en houdt eigen voorraad. Geen marketplace van andere verkopers, voor nu.
- Focus: de website en de verkoopervaring. De meet-/verstelbare paspop staat **on hold** (zie onderaan).

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
