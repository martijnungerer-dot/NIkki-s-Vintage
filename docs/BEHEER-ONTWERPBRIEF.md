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

Deze besluiten gaan vóór de voorgestelde richting hierboven:

1. **"Jouw collectie" wordt een raster** van mooie, aanraakbare tegels. Elke tegel toont de hoofdfoto van het stuk, met titel, prijs en status naast of onder de foto, niet eroverheen.
   - **Bovenaan staat een knop met een +.** Daar begint het toevoegen van een nieuw stuk.
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
