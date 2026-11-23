# Plan: de beheerkant opwaarderen

Vastgelegd op 12 november 2026 op verzoek van Martijn. Dit plan zet alle wensen voor de beheerkant in een werkbare volgorde: het nieuwe uiterlijk, de fotocoach, begeleid meten, detailfoto's en de kleine verbeteringen die het werk prettig maken. Het ontwerp en de regels staan in [BEHEER-ONTWERPBRIEF.md](BEHEER-ONTWERPBRIEF.md); dit document gaat over de volgorde, de bestanden en de afspraken. Martijn beslist over elk ontwerp, elke merge en elke release.

## Uitgangspunten

- **Geen herbouw en geen tweede systeem.** Hergebruik `app/` (de schil, `api.js`, `images.js`, `photo-transfer.js`), de build in `scripts/build-cloud.mjs` en de bestaande Supabase-functies. Gewone JavaScript en CSS, geen nieuwe frameworks.
- **Eén onderdeel per bestand, één eigenaar per PR.** Zo werkt de boetiek al (`app/store-screens/`, zie [FRONTEND-PLAN.md](FRONTEND-PLAN.md)). Bestanden in de nieuwe map `app/admin/` volgen dat patroon.
- **Kleine PR's in een vaste volgorde.** Elke PR is op zichzelf bruikbaar, met tests en schermafbeeldingen op 390 en 320 px.
- **Eerst ontwerpen, dan bouwen.** Elk scherm wordt eerst vastgesteld in het Claude Design-artefact "Beheerkant Nikki's Boetiek".
- **Frontend en backend gescheiden.** Wat alleen de interface verandert, kan snel. Wat contracten, rechten, opslag of AI raakt, gaat in een eigen PR met een gedocumenteerd contract, tests met nagebootste diensten en akkoord van Martijn.

## Bestandsopbouw

`app/main.js` (113 regels) doet nu alles: inloggen, collectie, acties en vernieuwen. Voordat er functies bijkomen, wordt het opgesplitst. Het gedrag verandert daarbij niet en de bestaande tests blijven groen.

| Bestand | Inhoud |
|---|---|
| `app/main.js` | Alleen opstarten, schermwissel en `window.NikkiApp` (het bestaande contract met de boetiek en het invoerscherm). |
| `app/admin/tokens.css` | De kleuren, letters, afrondingen en maten van optie B als variabelen, één bron voor de beheerkant. |
| `app/admin/header.js` | De bovenbalk met iconen. |
| `app/admin/login.js` | Het inlogscherm. |
| `app/admin/collection.js` | Het raster met de +-kaart, filters, zoeken, snel bewerken en "verkocht" met ongedaan maken. |
| `app/admin/drafts.js` | Concepten automatisch bewaren in IndexedDB op het toestel van Nikki. |
| `app/admin/upload-queue.js` | De wachtrij voor werken zonder bereik. |
| `app/admin/checklist.js` | De controlelijst vóór publiceren, als zuivere functie die apart te testen is. |
| `app/admin/preferences.js` | Eerdere keuzes onthouden ("net als vorige", veelgebruikt bovenaan). |
| `tests/admin-*.cjs`, `tests/admin-*.test.mjs` | Een test per onderdeel, aangeroepen vanuit de bestaande testscripts. |

**Het invoerscherm** komt nu uit `concept/intake-prototype.html` (537 regels), dat de build met tekstpatches aanpast. Voor een grote vernieuwing is dat broos. **Besluit voor Martijn, vóór fase 3:**
- **(a, voorstel)** Het invoerscherm wordt een eigen bron onder `app/intake/`, met één bestand per stap: foto's, controleren en opslaan. Het prototype blijft als historisch concept bestaan.
- **(b)** Verder patchen in het prototype.

Optie (a) maakt de fotocoach, het meten en de detailfoto's veel beter onderhoudbaar.

**Besluit van Martijn (12 november 2026): optie (a), een eigen bron onder `app/intake/`.**

- Codex zet het invoerscherm in fase 3 om naar `app/intake/`, met één bestand per stap.
- De werking en de controles blijven eerst gelijk. De bestaande browsertests blijven groen, of worden bewust samen met de code aangepast.
- `concept/intake-prototype.html` en `demo/intake-bridge.js` blijven als historisch concept staan, maar de build gebruikt ze niet meer voor de cloudapp.

**Hetzelfde patroon voor de boetiek (later, alleen met uitdrukkelijk akkoord van Martijn):**
- De boetiek komt nu ook uit een concept (`concept/ontdekken-optie-b.html`) met tekstpatches. Een eigen bron onder `app/store/` zou de app beter onderhoudbaar maken.
- Die omzetting mag het ontwerp, de indeling en het gedrag niet veranderen. Bewijs dat met de bestaande layout- en geometrietests en met schermafbeeldingen die identiek zijn, conform "Geldende versie van de winkel" in `AGENTS.md`.
- Pas na de beheerkant, als aparte PR.

## Fasen

### Fase 0: fundament (geen zichtbare verandering)
1. De ontwerpskills overnemen (`.agents/skills/` uit `codex/design-skills-and-discovery-brief`, verder niets).
2. `app/admin/tokens.css` aanmaken en `app/main.js` opsplitsen zoals hierboven. De tests blijven ongewijzigd groen.

### Fase 1: nieuw uiterlijk en een snellere collectie (alleen frontend)
3. Bovenbalk en inloggen volgens het ontwerp.
4. "Jouw collectie" volgens het vastgestelde ontwerp:
   - het raster met de +-kaart, die de camera opent;
   - de filters en de teller;
   - zoeken en sorteren;
   - foto's via `api.imageUrls` in één batch, met verkleinde voorbeelden.
5. Snel bewerken vanuit een tegel: prijs aanpassen, verkocht.
6. **"Verkocht" met ongedaan maken.** De tegel toont vijf seconden "Ongedaan maken", en pas daarna gaat het verzoek naar de server. Geen serverwijziging nodig. Daarnaast komt een "Bekijk als bezoeker" voor het stuk.

### Fase 2: invoeren zonder verlies (frontend en opslag op het toestel)
7. **Concept automatisch bewaren.** Elk ingevoerd stuk wordt lokaal bewaard, inclusief foto's als blobs. Hervatten kan vanuit een conceptkaart in het raster. Er gaat niets naar de server tot Nikki opslaat.
8. **Uploadwachtrij voor werken zonder bereik.** Bij geen verbinding gaat opslaan in de wachtrij, met de status "wacht op verbinding"; zodra er bereik is, gaat het vanzelf verder. Dat is veilig: foto-uploads worden al als dubbel herkend en opslaan gebruikt versienummers. Toch komen er tests voor herhalen en dubbel indrukken, zodat geen stuk dubbel ontstaat en geen verkocht stuk terugkomt.
9. **Reeksen fotograferen:** meerdere stukken achter elkaar met alleen foto's, als concepten die later worden aangevuld.

### Fase 3: het nieuwe invoerscherm (frontend; eerst het besluit over het invoerscherm)
10. **Foto's:**
    - een vaste volgorde met een kader in de camera (voorkant, achterkant, zijkanten);
    - twee groepen: "Voor de boetiek" en "Alleen voor controle". Die groepen werken pas echt na fase 4;
    - de stappenindicator.
11. **Controleren:**
    - kenmerken als keuzeknoppen;
    - eerdere keuzes bovenaan en "net als vorige";
    - per kenmerk zichtbaar welke foto het onderbouwt.
12. **Controlelijst vóór publiceren:**
    - verplichte foto's aanwezig;
    - maten ingevuld of bewust leeg;
    - bontsoort vastgesteld (regel uit `docs/CONCEPT.md`);
    - gebreken in de tekst.

    Publiceren kan pas als alles klopt. De server blijft zelf valideren.

### Fase 4: AI en foto-opslag (backend, elk een eigen PR met akkoord)
13. **Interne foto's en meer analysefoto's:**
    - een kenmerk per foto, intern of publiek;
    - een grens van 8 foto's per analyse (sinds 22 november 2026: 16 per stuk, overzichtsfoto's kleiner naar Gemini; zie FEEDBACK-OPVOLGING.md);
    - interne foto's worden aan de serverkant nooit aan de publieke catalogus of de getekende links voor bezoekers gegeven;
    - tests voor die scheiding tussen publiek en intern.
14. **Detailrollen** (rits, knopen, kraag en revers, voering en huidkant, etiket en maatlabel, naden, zakken en manchetten, gebrek), met het protocol uit de brief. Eerst laat Nikki de lijst nakijken.
15. **Fotocoach:** aanwijzingen na elke foto en de foto's die nog ontbreken, in de bestaande analysefunctie of een kleine nieuwe functie.
16. **Begeleid meten:** het meetlint aflezen als voorstel, met één tik bevestigen. Een meetmat met schatting alleen als aparte proef.
17. **Spraak voor de beschrijving:** eerst onderzoeken of dat kan met de spraakherkenning van de browser, op het toestel. Anders via de server, als aparte kostenafweging.

Bij elke AI-PR meld je apart dat live Gemini niet getest is zolang een account ontbreekt, en je meet de eerste echte analyses op kosten.

### Fase 5: later, met een verkoopplatform
18. De statussen "Gereserveerd" en "In reparatie", echte reservering, en het voorkomen van dubbelverkoop. Dat bepaalt alleen het winkelplatform.
19. Een melding aan Nikki bij een verkoop, verzendlabels en pakbonnen.
20. Een prijshulp op basis van eigen verkochte stukken. Alleen publieke prijzen; geen inkoopkosten in de browser, en geen verzonnen marktprijzen.

## Afspraken per PR

- **Basis en scope:** begin vanaf de nieuwste `main` en houd één onderdeel per PR.
- **Controles:** `npm run build`, `npm test`, `npm run test:browser`, `npm run check` en `git diff --check`.
- **Schermafbeeldingen** voor en na, op 390 en 320 px.
- **Testselectors:** behoud de selectors uit `tests/cloud-browser.cjs` (zie de brief), of pas ze bewust samen met de test aan.
- **Toegankelijkheid:** tekst minstens 16 px, knoppen minstens 44 px, toetsenbordfocus, en iconen met `aria-label`.
- **Gegevens:**
  - geen privévelden, kosten of tokens in de browser;
  - EXIF verwijderen en verkleinen blijven;
  - maten in cm, en een ontbrekende maat is `null`;
  - niets wordt gepubliceerd zonder bevestiging van Nikki.
- **Documentatie:** werk dit plan en `docs/STATUS.md` bij met wat klaar is. Contractwijzigingen gaan in `docs/DATA-MODEL.md` of in het bijbehorende document.

## Stand

| Fase | Status |
|---|---|
| Ontwerp "Jouw collectie" | Vastgesteld (11 november 2026) |
| Ontwerp inloggen, invoerscherm, fotocoach, meten | Open, in het Claude Design-artefact |
| Besluit invoerscherm | Eigen bron `app/intake/` (12 november 2026) |
| Fase 0, stap 1 | Skills gemerged in PR #31 |
| Fase 0, stap 2 | Gemerged in PR #37 op 13 november 2026 (`b636a36`). [Bewijs en overdracht](screenshots/beheer-fase-0/README.md). |
| Fase 1 | Bovenbalk/inloggen in PR #36, via merge op fase 0; overige onderdelen volgen volgens [de PR-reeks](BEHEER-PR-REEKS.md). |
| Fase 1, collectie | Fotoraster met +-kaart en "verkocht" met ongedaan maken: PR #54 (15 november 2026); verkoopprijs bijhouden: PR #57 |
| Fase 2, concepten | Eén concept op het toestel: PR #50; overgenomen in het nieuwe invoerscherm |
| Fase 3, invoerscherm | Gebouwd op 15 november 2026 als gesprek onder `app/intake/` (`steps.js`, `drafts.js`, `main.js`, `style.css`, `intake.html`), naar de goedgekeurde mock `concept/invoer-gesprek.html`. Dit wijkt af van "één bestand per stap" en van de checklist: het is één vraag per keer, in één keer vervangen op verzoek van Martijn |
| Fase 4, interne foto's | PR #44 e.v.; detailrollen, fotocoach en begeleid meten nog open |
| Vervolg op het gesprek | Open, elk een eigen PR: prijsvoorstel uit `garment_sales`; warme reacties en vraagtekst uit `analyse`; vrije antwoorden door Gemini; spraak testen op Nikki's telefoon; later een live gesprek |
| Fase 5 | Open; wacht op een verkoopplatform |
