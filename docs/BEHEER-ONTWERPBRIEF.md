# Ontwerpbrief: beheerkant mooier en rustiger

Vastgelegd op 11 november 2026 op verzoek van Martijn: "de beheerkant is qua layout en styling nog erg clunky en ouderwets". Deze brief is de opdracht voor Codex. Het is een ontwerp- en bouwopdracht in kleine PR's, geen herbouw van de app. Martijn beslist over het ontwerp en de merge.

## Waar het om gaat

De beheerkant is alles buiten de boetiek-iframe: de bovenbalk, het scherm "Jouw collectie" met inloggen, en het invoerscherm "Nieuw stuk". Op `main` (`8ca8e4a`) is dat:

| Onderdeel | Bestand | Wat er nu staat |
|---|---|---|
| Bovenbalk en statusregel | `app/index.html`, `app/style.css` (43 regels) | Een rij met tekstknoppen: Boetiek, Beheer, Nieuw stuk, Collectie vernieuwen, Uitloggen. Systeemletter op 15 px. Status op 0,82 rem en de proefmelding op 0,75 rem, dus kleiner dan 16 px. |
| Inloggen en "Jouw collectie" | `app/index.html`, rendering in `refresh()` in `app/main.js` | Een kaal formulier. Daarna een tekstlijst "titel — Beschikbaar/Verkocht" met de knoppen "Bewerken" en "Markeer verkocht". Geen foto's, prijs of filters. |
| Nieuw stuk (invoer) | `concept/intake-prototype.html` en `demo/intake-bridge.js`, gepatcht in `scripts/build-cloud.mjs`; `app/intake-extension.js` | Stappen voor foto's, Gemini, controleren en opslaan, in de stijl van het oudere prototype. |

## Ontwerpfilosofie: waar alles aan moet voldoen

Dit komt uit `AGENTS.md`, `docs/CONCEPT.md` en de goedgekeurde boetiek:

- **Eén familie met de boetiek.** `concept/ontdekken-optie-b.html` is de stijlbron: kleuren, letters, knoppen en iconen. De beheerkant krijgt geen eigen tweede stijl. `main.js` neemt de kleurtokens `--bg`, `--fg`, `--muted` en `--line` al over uit de winkel (`syncStyle`); bouw daarop voort.
- **Minimalisme: beeld draagt.** Toon tekst alleen waar Nikki die nodig heeft om te beslissen of te handelen. Zet overige uitleg achter een uitklapkop.
- **Vaste regels:**
  - tekst minstens 16 px;
  - knoppen minstens 44 px;
  - universele iconen zonder woorden, met `aria-label`;
  - alles op elk scherm op dezelfde plek;
  - geen tekst over foto's;
  - Nederlands.
- **Rust en ritme:** royale witruimte, één duidelijke primaire actie per scherm, en status als korte melding in plaats van een vaste regel.
- **Mobiel eerst.** Nikki werkt vooral op haar telefoon (390 en 320 px). Desktop is een nette, gecentreerde variant.

## Skills en richtlijnen

Op de niet-gemergede branch `codex/design-skills-and-discovery-brief` (commit `eed53f6`) staan vastgezette, gelicenseerde skills in `.agents/skills/`, met bronnen en SHA-256-hashes in `sources.json`:

| Skill | Gebruik hier |
|---|---|
| `frontend-design` (Anthropic) | Visuele richting, compositie en zelfkritiek. Het hoofdhulpmiddel voor het ontwerp. |
| `ui-ux-pro-max` | Lokale UX-data. Zoek bijvoorbeeld `python .agents/skills/ui-ux-pro-max/scripts/search.py "admin list mobile" --domain ux`. Controleer elk resultaat tegen de regels hierboven. |
| `web-design-guidelines` (Vercel) | Review van de gebouwde interface vóór de PR. Haal de regels op zoals de skill voorschrijft, en meld het als dat niet lukt. |

**Stap 0:** neem alleen `.agents/skills/` (en de verwijzing in `AGENTS.md`) over uit die branch, in een eigen kleine PR. Neem de rest van die oude branch niet mee: die loopt ver achter op `main`. Voeg geen Tailwind, React of andere frontendpakketten toe; de app is gewone JavaScript en CSS.

Ter vergelijking: aan de kant van Claude Code bestaan vergelijkbare skills (`frontend-design`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`, `design:design-system`). Die zijn niet in de repository nodig.

## Voorgestelde richting (ter keuze voor Martijn)

1. **Bovenbalk:** merknaam links in de serif van optie B. Rechts iconen voor Boetiek, Collectie (beheer), Nieuw stuk (+), Vernieuwen en Account/Uitloggen, met dezelfde vorm als in de boetiek. De proefmelding wordt een klein label of komt achter een info-icoon. Statusmeldingen worden een korte melding die verdwijnt, met een fout die blijft staan.
2. **Inloggen:** één rustige, gecentreerde kaart met merknaam, twee velden en één knop. Duidelijke foutmelding onder het veld.
3. **Jouw collectie:** een beeldgedreven lijst of raster met per stuk:
   - de hoofdfoto;
   - titel en prijs;
   - een statuslabel Beschikbaar/Verkocht;
   - iconen voor Bewerken (potlood) en Markeer verkocht (label), met de bestaande bevestiging.

   Daarbij een filter Alle/Beschikbaar/Verkocht. Bij een lege collectie verschijnt een uitnodigende knop "Nieuw stuk".
4. **Nieuw stuk:** visueel gelijktrekken met dezelfde tokens, letters en knoppen. Grote fototegels met een duidelijke hoofdfoto, een stappenindicator en één primaire knop onderaan. De inhoud en volgorde van de stappen blijven hetzelfde.

Lever per onderdeel eerst schermafbeeldingen of een mock op 390 en 320 px en desktop, naast de huidige versie. Bouw pas verder na akkoord van Martijn.

## Harde grenzen

- **Geen wijzigingen aan data, API, rechten, Supabase of opslag.** Publicatie houdt de bevestiging en de validatie. "Markeer verkocht" houdt de bevestiging. Een verkocht stuk blijft verkocht.
- **Geen extra velden tonen.** Toon geen privévelden (kosten, opslaglocatie, notities) en geen tokens. Toon niets dat niet al in de publieke of geautoriseerde gegevens zit.
- **Fotolinks:** foto's in de beheerlijst vragen getekende links voor ook verkochte stukken. Gebruik de bestaande `api.imageUrls` in één batch, en houd rekening met de vernieuwing elke 40 minuten. Een foto die ontbreekt mag de lijst niet breken.
- **De boetiek-iframe zelf blijft ongewijzigd.** Dat is de goedgekeurde winkel; zie `AGENTS.md`, "Geldende versie van de winkel".
- **Tests:** `tests/cloud-browser.cjs` gebruikt deze selectors:
  - `#login`, `#email`, `#password`, `#login button`;
  - `#new`, `#reload`, `#status`, `[data-screen=shop]`;
  - `#items li > span` met de tekst "titel — Beschikbaar/Verkocht";
  - de knoppen "Bewerken" en "Markeer verkocht".

  Behoud ze, of pas test en code bewust samen aan, met dezelfde dekking. Voeg tests toe voor 16 px, 44 px, toetsenbordfocus en de lege staat.
- **Controles per PR:** `npm run build`, `npm test`, `npm run test:browser`, `npm run check` en `git diff --check`. Lever schermafbeeldingen voor en na op 390 en 320 px.

## Besluiten van Martijn (11 november 2026)

**Vastgesteld ontwerp voor "Jouw collectie":** het scherm "Jouw collectie" in het Claude Design-artefact "Beheerkant Nikki's Boetiek" (https://claude.ai/artifact/QJQ9iW4aZkmPKtiqW7nmE6), zoals goedgekeurd door Martijn op 11 november 2026. Het artefact is privé; Martijn deelt het of levert schermafbeeldingen aan. Hoofdpunten:

- een raster van twee kolommen, met als eerste vakje de +-kaart;
- per stuk een fototegel met daaronder titel, prijs en een statuslabel, plus de iconen potlood (bewerken) en label (markeer verkocht), elk 44 px;
- filterknoppen Alle, Beschikbaar en Verkocht;
- een bovenbalk met de merknaam in Newsreader en drie lijniconen: een kledinghanger (naar de boetiek), vernieuwen en account.


Deze besluiten gaan vóór de voorgestelde richting hierboven:

1. **"Jouw collectie" wordt een raster** van mooie, aanraakbare tegels. Elke tegel toont de hoofdfoto van het stuk, met titel, prijs en status naast of onder de foto, niet eroverheen.
   - **Het eerste vakje linksboven in het raster is een +-kaart.** Die heeft dezelfde opbouw als een stuk: een tegel in fotoformaat in de zachte zandkleur `#F3ECE3`, met een lichte ronde +, en daaronder "Nieuw stuk" en in de zachte kleur "Foto maken". Daar begint het toevoegen van een nieuw stuk. (Bijgesteld op 11 november 2026; dit vervangt de eerdere knop rechtsboven.)
   - **De + opent meteen de camera.** Op een telefoon kan dat met een bestandsveld met `accept="image/*"` en `capture="environment"`; de gemaakte foto komt direct in de fotostap van het invoerscherm. Waar geen camera is (desktop), opent dezelfde knop de bestandskeuze. Foto's uit de galerij kiezen moet in het invoerscherm mogelijk blijven.
   - Bewerken en Markeer verkocht blijven bereikbaar vanuit een tegel, met de bestaande bevestigingen.
2. **De bovenbalk gebruikt iconen, als dat elegant kan.** Maak ze in dezelfde lijnstijl en grootte als de iconen van de boetiek, met `aria-label`. Is een icoon niet ondubbelzinnig, kies dan een rustige oplossing (bijvoorbeeld een korte tooltip of een menu) in plaats van een rij tekstknoppen, en leg die keuze voor in de PR.
3. **Het invoerscherm gaat mee** in dezelfde reeks: zelfde tokens, letters, knoppen en iconen, grote fototegels met een duidelijke hoofdfoto, een stappenindicator en één primaire knop. De inhoud en de controles blijven gelijk: Gemini-voorstellen, de verplichte controle, de bevestiging bij opslaan, en EXIF verwijderen en verkleinen.

**Volgorde van de PR's voor Codex:**
- stap 0: de skills;
- daarna bovenbalk met inloggen;
- daarna het collectieraster met de +/camera-knop;
- daarna het invoerscherm.

Lever per stap eerst een mock op 390 en 320 px en desktop, naast de huidige versie, en bouw pas na akkoord.

## Vervolg: inloggen, Nieuw stuk, fotocoach en begeleid meten

Op 12 november 2026 vastgelegd. Martijn deelt het Claude Design-artefact "Beheerkant Nikki's Boetiek" met Codex en werkt het daar samen verder uit. "Jouw collectie" ligt vast; dit zijn de open onderdelen.

### 1. Inloggen en Nieuw stuk afmaken in het ontwerp

- In het artefact staan al eerste versies van **Inloggen**, **Nieuw stuk · foto's** en **Nieuw stuk · controleren**. Werk ze verder uit in dezelfde stijl als "Jouw collectie", tot Martijn ze vaststelt.
- Houd de bestaande stappen en controles: foto's → (Gemini-)voorstellen → verplichte controle → bevestigen en opslaan.
- Na de + op "Jouw collectie" opent de camera. De eerste foto komt direct in de fotostap.

### 2. Fotocoach (nieuw scherm of onderdeel van de fotostap)

- Na elke foto geeft Gemini korte, concrete aanwijzingen: "jas niet helemaal in beeld", "te donker", "kraag scheef".
- Gemini zegt ook welke foto's nog ontbreken: voorkant, achterkant, etiket, details.
- De bestaande analyse geeft per foto al een rol en "bruikbaar"; bouw daarop voort.
- Coaching is advies: Nikki kan altijd doorgaan.
- Geen tekst over de foto. De aanwijzingen staan eronder of ernaast.

### 3. Begeleid meten (nieuw scherm in de controlestap)

- **Standaard: begeleid meten met het meetlint.** Per maat, dus borstbreedte, schouderbreedte, mouwlengte en ruglengte, laat het scherm zien waar en hoe Nikki meet, bijvoorbeeld met een eenvoudige lijntekening van een plat gelegde jas met het meetpunt.
- Nikki maakt een foto van het meetlint op dat punt. De AI leest het getal af en vult het in als voorstel. Nikki bevestigt met één tik of past het aan.
- **Proef, alleen na akkoord van Martijn:** een schatting van alle maten in één keer, van een foto op een meetmat met een raster van bekende afmetingen. Laat zo'n schatting duidelijk als schatting zien. Nikki moet elke waarde bevestigen of corrigeren.
- **Niet doen:** maten schatten van een foto zonder maatstaf.
- **Harde regels:**
  - maten in cm;
  - een ontbrekende maat blijft leeg (`null`);
  - plat gemeten is geen lichaamsomtrek;
  - geen enkele door AI voorgestelde maat wordt opgeslagen of gepubliceerd zonder bevestiging van Nikki;
  - geen verzonnen maat- of pasvormclaims.

### Grenzen en volgorde

- **Eerst ontwerp, dan bouwen.** Lever per scherm een ontwerp in het artefact op 390 px (en 320 px als controle). Bouw pas na vaststelling door Martijn.
- **De frontend kan zonder backendwijziging** in kleine PR's volgens de werkwijze hierboven.
- **De AI-onderdelen zijn wél een backendwijziging:** het meetlint aflezen, de fotocoach-aanwijzingen en eventueel de meetmat. Ze vragen een aanpassing van de Supabase-functie `analyse` of een nieuwe functie, en dus een eigen PR met:
  - een gedocumenteerd contract;
  - tests met nagebootste antwoorden;
  - een aparte melding dat live Gemini niet getest is zolang een account ontbreekt.

  Productieschrijfacties en het uitrollen van functies gebeuren alleen met akkoord van Martijn.
- **Gegevens:** geen privévelden, kosten of tokens in de browser. Foto's blijven alleen voor het analyseren en opslaan van het stuk. EXIF verwijderen en verkleinen blijven.

### Meer foto's voor de analyse, waarvan een deel intern (Martijn, 12 november 2026)

- De huidige grens van vier foto's (in `supabase/functions/analyse/handler.mjs` en `app/intake-extension.js`, toegelicht in `docs/SUPABASE-START.md`) was een voorzichtige standaard tegen kosten en misbruik, geen besluit van Martijn.
- **Gewenst:**
  - vier foto's van alle kanten voor de carrousel;
  - een foto van het etiket;
  - een foto van het maatlabel (als dat er is);
  - eventueel foto's van het meetlint.

  Alle foto's gaan naar de analyse; alleen de carrouselfoto's verschijnen in de boetiek.
- **Uitwerking (aparte backend-PR, met akkoord van Martijn):**
  - een kenmerk per foto, bijvoorbeeld `public: false` of een rol "Etiket" of "Maatlabel", als gedocumenteerde contractwijziging;
  - een hogere grens per analyse (voorstel: 8), terwijl de daglimieten blijven;
  - interne foto's worden aan de serverkant nooit aan de publieke catalogus of de getekende links voor bezoekers gegeven. Dat geldt voor de rechten en de fotolinks, niet alleen voor de weergave;
  - tests voor die scheiding tussen publiek en intern;
  - de eerste echte analyses meten op kosten.
- **In het ontwerp:** de fotostap toont twee groepen, "Voor de boetiek" (vier kanten, met hoofdfoto) en "Alleen voor controle" (etiket, maatlabel, meetlint). De fotocoach vraagt om de foto's die nog ontbreken.

### Protocol voor detailfoto's (concept, Martijn, 12 november 2026; Nikki vult aan en keurt goed)

Details zijn belangrijk bij vintage mode. Een detailfoto met een vaste rol krijgt in de analyse extra gewicht.

**Rollen voor detailfoto's** (standaard intern, zie hierboven):
- Rits (trekker en tanden);
- Knopen;
- Kraag en revers;
- Voering en binnenkant, bij bont en shearling ook de huidkant;
- Etiket en maatlabel;
- Naden en stiksels;
- Zakken, manchetten en zoom;
- Gebrek (vlek, kale plek, scheur).

**Extra gewicht, concreet:**
- In de analyse telt een foto met een detailrol als bewijs voor dat kenmerk. Gemini baseert zijn voorstel voor dat veld op die foto en vermeldt dat, bijvoorbeeld "metalen rits (zie detailfoto)". Het krijgt een hogere zekerheid dan een voorstel van een overzichtsfoto.
- Bij de controle ziet Nikki per kenmerk welke foto het onderbouwt, en bevestigt het.
- Bevestigde details kunnen detailkenmerken worden voor het smaakprofiel, bijvoorbeeld "metalen rits" of "sjaalkraag".
- De fotocoach vraagt per soort stuk om de relevante details, bijvoorbeeld bij een leren jack de rits en de kraag.
- De zichtbare gebreken komen eerlijk in de beschrijving.

**Grenzen:**
- Een periode, merk of echtheid alleen na bevestiging door Nikki. Een AI-aanwijzing (zoals "rits lijkt uit de jaren 60") is een hint, geen verkoopclaim.
- De lijst met rollen en de bijbehorende kenmerken zijn een contractwijziging: documenteren, testen, en akkoord van Martijn.

### Uniform en minimaal (Martijn, 14 november 2026)

- Alle iconen en knoppen van dezelfde soort zien er hetzelfde uit. Geen opvallend vakje of streepje voor het actieve scherm; `aria-pressed` blijft voor schermlezers.
- Geen geel of oranje in de werkende schermen. De gele melding met de oranje streep in het huidige invoerscherm ("Gemini bekijkt maximaal vier foto's") wordt een rustige regel in crème en bruin, met de nieuwe grens van 8 foto's. Alleen het tijdelijke opmerkingenpotloodje is geel.
- Uitleg over functies die (nog) niet werken of tijdelijk zijn ("Dit is een oefenscherm…", "Gemini bekijkt…", proefmeldingen) staat niet als vast tekstblok in het scherm. Ze verschijnt één keer als rustig venster dat Nikki wegtikt (onthouden op het toestel), en is daarna terug te lezen via een klein info-icoon. Fouten en dingen die Nikki moet doen blijven wel direct in het scherm staan.
- De naam staat voluit: Guaranteed Secondhand Fur. Het app-icoon is de kantrand met GSF (`app/icons/gsf-kantrand.svg`).
- Bovenbalk van de beheerkant (Martijn, 14 november 2026, variant A): de naam op twee regels (Guaranteed / Secondhand Fur) met drie iconen erachter: Boetiek, Vernieuwen en Account. Uitloggen blijft op de collectiepagina. Een naam op één regel met drie of vier iconen past niet op 320 px.
- Foto's: maximaal 8 per stuk. Per foto kan Nikki aanzetten dat hij **alleen voor controle** is (label, naden, binnenkant, gebreken). Die foto's ziet Gemini wel, bezoekers nooit, en ze kunnen geen hoofdfoto zijn. In het nieuwe invoerscherm blijft dat een aan/uit-knop met dezelfde tekst.
