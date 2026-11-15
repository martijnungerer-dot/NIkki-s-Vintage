# Voortgang

Korte logboekregels, nieuwste bovenaan. Alleen feiten die zijn gecontroleerd; plannen staan in [PLAN.md](PLAN.md), ideeën in [CONCEPT.md](CONCEPT.md). Geen privéveldwaarden, klantgegevens of secrets.

## Huidige stand

- Fase: P0 afgerond; P1 (productkeuzes en proefinvoer) en concept-brainstorm lopen.
- Airtable (`appcR1TGKaoc4XAU4`): 0 records in Garments op 1 november 2026.
- Webshop: cloudpilot gepubliceerd op Cloudflare Workers; nog geen winkelplatform of checkout. Supabase-tabellen en privéfoto-opslag zijn ingericht en database-rechten live gecontroleerd. Websiteverbinding staat klaar in code; login en volledige invoerroute wachten op een beheerder en deployment. Gemini is nog niet aangesloten.

## Logboek

### 15 november 2026 — vijf aanpassingen aan de boetiek
- Op verzoek van Martijn ("doe allemaal"), zo dicht mogelijk bij optie B: (1) de titelknop onder de foto heeft een i-icoon in plaats van het pijltje; (2) de iconen in de foto en de bolletjes staan op een ronde, donkere achtergrond (wit daarop is minstens 3:1, ook op een witte jas) en meer/minder zoals dit zijn duimpjes; (3) de sorteerkeuze in Collectie begint met "Onze volgorde" onder het kopje "Sorteren op" (prijs laag–hoog zat er al in); (4) de ingang voor beheer is de laatste regel "Beheer" in het menu, het poppetje rechtsboven is weg; (5) Mijn smaak toont "Met bont", "Zonder bont", "€ 200–350", "Vanaf € 600" en bij andere waarden het soort kenmerk (kleur, lengte, materiaal).
- Open keuze voor Martijn: variant A (duimpjes, Beheer in het menu; gebouwd) of variant B (plus/min, slotje rechtsboven). Schermafbeeldingen voor en na op 390 en 320 px naast optie B in `docs/screenshots/boetiek-vijf-punten/`. AGENTS.md is nog niet aangepast; dat volgt na de keuze.
- Tests: i-icoon, contrast van de achtergronden, geen poppetje, menuregel Beheer, sorteeropties en smaaklabels. `npm test` (78/78) en alle browsertests slagen lokaal. Geen wijziging aan data of server.

### 15 november 2026 — oude opslagfunctie afgesloten
- Nieuwe migratie `20261115120000_close_save_garment.sql`: beheerders (rol `authenticated`) mogen `save_garment` niet meer rechtstreeks aanroepen. `save_garment_with_private` roept hem intern nog aan, dus opslaan loopt altijd langs de controle van de foto's alleen voor controle.
- De website heeft geen terugval meer naar de oude functie. Ontbreekt de nieuwe functie of de tabel `garment_private` (404), dan volgt een duidelijke fout en wordt er niets opgeslagen; bewerken stopt in plaats van interne foto's stil weg te laten.
- Tests: database (PGlite) controleert dat ook een beheerder `save_garment` niet direct kan aanroepen en dat opslaan via de nieuwe functie blijft werken; API-test controleert dat de oude route niet meer wordt aangeroepen. `npm test` (78/78) en de browsertests slagen lokaal. Uitrollen door Martijn: `npx.cmd supabase db push --remote`, daarna `npm.cmd run check:live`. Live niet getest.

### 15 november 2026 — review door zes Fable-agents verwerkt
- Zes agents (beveiliging, invoer, boetiek, Gemini, bediening op 390/320 px, tests/bouw) reviewden main `7cfadf3`; geen kritieke of ernstige beveiligingsproblemen. Besluiten per bevinding in [REVIEW-GEBRUIKSVRIENDELIJKHEID.md](REVIEW-GEBRUIKSVRIENDELIJKHEID.md).
- Belangrijkst: op verzoek van Martijn stelt Gemini ook materiaal, bont, bontsoort en periode voor; elk onderdeel dat Gemini invulde wacht op één tik op Klopt, en claimwoorden in titel/beschrijving blijven staan maar moeten bevestigd worden; concept wordt gewist bij uitloggen en alleen na inloggen teruggezet; uploadfouten, late Gemini-antwoorden en versieconflicten na verkoop afgehandeld; duidelijke melding bij een verkeerd wachtwoord; livecontrole kijkt naar de nieuwe migratie.
- `npm test` (78/78) en alle browsertests slagen lokaal. Uitrollen na merge: `npx.cmd supabase functions deploy analyse` en `npx.cmd supabase functions deploy personalise`. Live niet getest.

### 15 november 2026 — concepten bewaren
- Een half ingevoerd stuk, foto's inbegrepen, wordt elke twee seconden en bij het naar de achtergrond gaan bewaard in IndexedDB op het toestel zelf (database `gsf-intake`). Na verversen of heropenen staat het terug, met een melding; zat je in Nieuw stuk, dan kom je daar terug. Ook het Gemini-voorstel en de versie van een bewerkt stuk gaan mee.
- Gewist na opslaan, bij bewust opnieuw beginnen en bij het openen van een opgeslagen stuk. De waarschuwing bij verlaten verschijnt alleen nog als de laatste invoer niet bewaard kon worden (bijvoorbeeld geblokkeerde opslag).
- Bewaard op het toestel, niet op de server; uitloggen wist het concept niet, zodat werk niet verloren gaat. Alleen Nikki's eigen invoer, geen privévelden.
- Browsertest: invullen, verversen, terugzetten, afmaken, opslaan, concept gewist; en een toestel zonder IndexedDB. `npm test` (69/69) en alle browsertests slagen.

### 15 november 2026 — codereview Gemini verwerkt
- Tweede Gemini-review op één tekstbestand met regelnummers (`GSF-code-voor-review.txt`); besluiten in [REVIEW-GEBRUIKSVRIENDELIJKHEID.md](REVIEW-GEBRUIKSVRIENDELIJKHEID.md).
- Invoer: tekst in "+ nieuw" blijft staan, focus blijft op dezelfde knop, verwijderen in Controleren, dubbele foto's één keer bewaard, drie uploads tegelijk met teller, foto's tot 30 MB, na opslaan begint Nieuw stuk leeg, waarschuwing bij verlaten met niet-opgeslagen invoer, Terug-knop binnen de app. Boetiek: melding in de winkelmand bij een verkocht stuk.
- Fotoanalyse: Nikki's keuzelijsten gaan als data mee naar Gemini, JSON in een markdown-omlijsting wordt gelezen, plafond 8192 tokens. Uitrollen: `npx.cmd supabase functions deploy analyse`.
- `npm test` (69/69) en alle browsertests slagen lokaal. Live Supabase/Gemini niet getest.

### 15 november 2026 — review gebruiksvriendelijkheid verwerkt
- Gemini-review nagekeken en gemeten; besluiten per bevinding in [REVIEW-GEBRUIKSVRIENDELIJKHEID.md](REVIEW-GEBRUIKSVRIENDELIJKHEID.md). Boetiek en beheer voldoen gemeten aan 44 px / 16 px / 4,5:1.
- Invoerscherm: alle bediening minstens 44 px met 8 px ruimte op de fotokaarten, alle tekst minstens 16 px, statusregels niet meer afgekapt. De melding wat nog ontbreekt staat boven de opslagknop (donkerrood). "Volgend stuk" is secundair en vraagt bevestiging bij niet-opgeslagen invoer. Browsertest controleert de maten in het invoerscherm.

### 15 november 2026 — na verversen terug op hetzelfde scherm
- Na verversen kwam je altijd in de boetiek terecht. De app onthoudt nu per tabblad (`sessionStorage`) of je in het beheer zat en keert daarheen terug. Vanuit Nieuw stuk kom je op Jouw collectie terecht, omdat een niet-opgeslagen stuk niet bewaard blijft. Een gedeelde link of resetlink in het adres gaat voor. Browsertest toegevoegd.

### 15 november 2026 — opslaan bij bewerken op de telefoon
- Martijn kon op zijn telefoon een bewerkt stuk niet opslaan: de knop bleef grijs zonder reden. Nagespeeld: een onderdeel onder de vouw (in de test Bijzonderheden) was nog niet afgevinkt.
- De opslagknop blijft nu tikbaar. Is nog iets open, dan opent een tik dat onderdeel, scrolt ernaartoe en noemt wat ontbreekt; er wordt niets opgeslagen. Bij bewerken heet de knop meteen "Wijziging opslaan". Browsertest toegevoegd; schermafbeelding in `docs/screenshots/acht-fotos/`.

### 15 november 2026 — 8 foto's, foto's alleen voor controle en het Gemini-voorstel bewaard
- `gemini-3.5-flash-lite` als `PERSONALISE_MODEL` (door Martijn in Supabase gezet): `npm run check:live` geeft alle regels OK, met als laatste "Gemini rangschikt: 1 stukken, 1 met een gekozen foto".
- Invoer: maximaal 8 foto's; Gemini bekijkt ze allemaal. Per foto een aan/uit-knop "Alleen voor controle". Zo'n foto kan geen hoofdfoto zijn.
- Nieuwe migratie `20261115090000_internal_photos.sql`: tabel `garment_private` (alleen beheerders) met de interne foto's en het laatste Gemini-voorstel, en de serverfunctie `save_garment_with_private`, die de bestaande `save_garment` aanroept. Interne foto's staan nooit in `garments.data.images`; daardoor zijn ze via de catalogus en de opslagregel `garment_photo_read` niet zichtbaar voor bezoekers. Een bewerking zonder nieuwe analyse houdt het eerdere voorstel. Zolang de migratie niet is uitgevoerd, slaat de website zonder interne foto's op de oude manier op en weigert ze stukken met interne foto's.
- Fotoanalyse (`analyse`): 8 foto's, vast antwoordschema, `temperature` 1, kort nadenken (met herhaling zonder als het model dat niet kent), 90 seconden en een logregel `analyse failed: …` met de reden. Optioneel apart model via `ANALYSE_MODEL`.
- Bovenbalk beheer: Martijn kiest variant A (naam op twee regels, drie iconen); vastgelegd in de ontwerpbrief.
- Nieuwe tests voor database (PGlite: rechten, geen interne paden of foto's voor bezoekers, ook na omzetten van een openbare foto), API (splitsen, terugval vóór de migratie, laden bij bewerken), fotoanalyse (8 foto's, schema, herhaling, logregels) en de browserroute (8 foto's, intern markeren, opslaan, bezoeker ziet één foto, bewerken behoudt alles). Live Supabase/Gemini niet getest.

### 14 november 2026 — smaakfunctie live, Gemini nog in terugval
- Martijn heeft `personalise` uitgerold, `ALLOWED_ORIGINS` gezet en de Gemini-sleutel onder de juiste naam `GEMINI_API_KEY` gezet. `npm run check:live` op zijn computer: website, catalogus, publieke velden, afscherming en herkomstcontrole OK; de smaakfunctie valt terug zonder Gemini.
- De secret `GEMINI_MODEL` komt (via de SHA-256-controlecode, zonder de waarde te tonen) overeen met `gemini-3.8-flash`, het model dat Google AI Studio voor dit project toont. Het gebruiksoverzicht van AI Studio telt één aanvraag, dus Gemini werd bereikt.
- Log na uitrol van PR #42: `personalise fallback: TIMEOUT (model gemini-3.8-flash)`. Daarop: Gemini krijgt nu de instelling om kort na te denken (met een herhaling zonder als een model die niet kent), 40 seconden op de server en 50 in de browser, die intussen al de eigen volgorde toont.
- Ook na PR #43 (kort nadenken, 40 s) nog `TIMEOUT`. Op advies van een tweede LLM: vast antwoordschema (`responseSchema`), `temperature` 1 zoals Google voor Gemini 3 aanraadt, `thinkingLevel` minimal en een plafond van 4096 tokens, tegen herhalingslussen en lang nadenken.
- De functie schrijft de reden van een terugval nu als korte code in de functielogs (zonder sleutel, profiel of catalogus) en leest JSON tussen een markdown-omlijsting. Nog uitrollen met `npx.cmd supabase functions deploy personalise`.

### 14 november 2026 — Wachtwoord vergeten
- PR #39 (naam Guaranteed Secondhand Fur, app-icoon) gemerged op `main` (`563e935`). Drie latere commits (gelijke iconen in de bovenbalk, ontwerpbrief uniform en minimaal, meldingen als eenmalig venster) gaan mee in de volgende PR.
- Inlogformulier met drie standen in dezelfde velden: inloggen, link vragen en nieuw wachtwoord kiezen. De link vragen gaat via Supabase `/auth/v1/recover` met een neutrale melding; de token uit de link wordt meteen uit de adresbalk gehaald en pas na opslaan en de beheerderscontrole bewaard. Een verlopen link biedt direct een nieuwe aan.
- Nieuwe tests: API (redirect, 429, opslag pas na staff-controle, 401/422), het uitlezen van de link en de browserroute op 390/320 px. `npm run build`, `npm test` (57/57), `npm run test:browser`, `npm run check` en `git diff --check` slagen lokaal. Live Supabase-mail niet getest; de Site URL en Redirect URL moeten nog in Supabase worden ingesteld (zie SUPABASE-START.md).

### 14 november 2026 — migraties `personalise_usage` en `review_notes` live
- Martijn heeft op zijn Windows-computer `npx.cmd supabase db push --remote` gedraaid tegen project `naxjrskfdedwvoeltigs`. De CLI paste precies twee migraties toe: `20261110210000_personalise_usage.sql` en `20261114120000_review_notes.sql`. Er werd verder niets toegevoegd of gewijzigd.
- Opmerkingenlaag (PR #38) gecontroleerd: opmerkingen van het gele potloodje staan in `public.review_notes`, gelezen via de SQL Editor.
- De live site toont de naam uit PR #39 ("Guaranteed Secondhand Fur").
- Niet gecontroleerd: of `supabase functions deploy personalise` al is uitgevoerd en of `npm run check:live` slaagt.
- Documentatie bijgewerkt: de huidige CLI vraagt `--remote` bij `db push`; in Windows PowerShell `npx.cmd`.

### 14 november 2026 — PR #36 op de gemergede fase 0
- `main` opgehaald op `b636a36` (PR #37). Zeven conflicten in PR #36 via een gewone merge opgelost; één set beheermodules en alle API/UI-koppelingen in `app/admin/index.js`. `main.js` blijft gelijk aan fase 0.
- Beide Claude Code-reviews verwerkt: action-bewaking, lokale authenticatiefouten, wachtwoord wissen/verbergen vóór staff/controls/refresh, zichtbare fouten na authenticatie, juiste submitselector, wisselende toegankelijke naam zonder aria-pressed en geen focus op de alert.
- Eén rij in de bovenbalk, Newsreader voor alle beheertekst, witte kaart op `#9B3A2F`, proefmelding onder de kaart, geen statusregel boven inloggen en opgeschoonde CSS. [Beelden op 390/320 px](screenshots/beheer-login/README.md), met werkelijk gerenderde Newsreader; de rechtstreekse Claude Design-vergelijking blijft geblokkeerd door de netwerkproxy.
- [PR-reeks](BEHEER-PR-REEKS.md) aangevuld met snel bewerken, vijf seconden ongedaan maken, concepten bewaren, uploadwachtrij en reeksen fotograferen. Geen backend- of winkelwijziging.
- `npm run build`, `npm test` (51/51), de volledige `npm run test:browser`, `npm run check` en `git diff --check` slagen lokaal. Nieuwe beheertests slagen voor login/logout, 401/403, vernieuwingsfout na login en herstel, dubbele submit, oude fotolinks tijdens login, ontbrekende configuratie, toetsenbord en mobiele layout. De bestaande deelt-test wacht nu op de asynchrone kopieerbevestiging vóór klembordcontrole. Live Supabase/Gemini en telefooncamera niet getest.

### 13 november 2026 — fase 0 gecorrigeerd voor eigen PR
- Beide Claude Code-reviews op PR #36 gelezen. `function show` vóór `createAdmin` gezet; de configuratiecontrole selecteert `[type=submit]` en de bestaande knop heeft dat type expliciet gekregen.
- Vanaf opnieuw opgehaalde main `516df19`; bestaande fase-0-geschiedenis behouden. Build en 51 tests slagen. De browsersuite slaagt voor cloud-UI en layout, maar faalt op de bestaande klembordrace in de deelt-test; die test slaagt bij afzonderlijke herhaling. Project- en diffcontrole slagen.
- Nieuwe voor/na-beelden op 390 en 320 px: vijf pixelgelijk, collectie 320 px met 70 vrijwel gelijke randpixels (maximaal 2/255). [Bewijs en beperkingen](screenshots/beheer-fase-0/README.md), waaronder fallbackfont en geblokkeerde toegang tot Claude Design.
- PR #36 wacht op Martijns merge van fase 0. De ontwerp-, login- en documentatiecorrecties voor die PR zijn nog niet uitgevoerd.

### 12 november 2026 — beheer fase 0, stap 2 voorbereid voor review
- Vanaf main `516df19`, branch `codex/beheer-fase-0-modules`: `app/main.js` opgesplitst in `app/admin/` en optie-B-tokens toegevoegd. Bestaande werking, testselectors en bevestigingen behouden; geen boetiek- of backendwijziging.
- Build, 51 tests, volledige bestaande browsersuite, projectcheck en diffcheck geslaagd. De baseline had een bestaande timingfout bij de klembordcontrole (`tests/storefront-share.cjs:65`); die is niet gewijzigd of opgelost.
- Inloggen, collectie en boetiek zijn pixelgelijk voor/na op 390 en 320 px. [Beelden, beperkingen en overdracht](screenshots/beheer-fase-0/README.md). Nog niet gemerged of gepubliceerd; live Supabase/Gemini niet getest.

### 12 november 2026 — opslag geblokkeerd, plannen voor de beheerkant
- `app/store-screens/personalise.js` vangt nu een geblokkeerde browseropslag op. Daardoor laadt de collectie, in Nikki's volgorde en zonder AI-aanroep. Daarvoor faalde het laden; dat liet een nieuwe test eerst zien. Alle tests geslaagd.
- Beheerkant: het ontwerp van "Jouw collectie" is door Martijn vastgesteld in Claude Design. De ontwerpbrief (PR #30, #33 en #34) en het plan in vijf fasen ([BEHEER-PLAN.md](BEHEER-PLAN.md)) staan op main. Er is nog niets van gebouwd.

### 11 november 2026 — Mijn smaak (onderdeel 4, PR #27)
- "Mijn smaak" in het Shop-menu: persoonlijke volgorde aan/uit, kenmerken los vergeten, alles wissen, en meer/minder zoals dit in de foto. Leren gebeurt alleen lokaal.
- Loslaten van meer/minder zet het profiel van vóór de tik terug en past de tussentijdse hartjes en mandacties opnieuw toe. Dat is per constructie exact, na Gemini- en Codex-reviews die elk met een falende test zijn aangetoond.
- Alle unit- en browsertests geslaagd. Gemerged als `8ca8e4a`. Niet live getest.

### 11 november 2026 — livegang voorbereid
- [LIVEGANG.md](LIVEGANG.md): stappen voor Gemini-sleutel, budget, modelkeuze met kostenschatting (~$0,005 per aanvraag met een Flash-Lite-model; slechtste geval de daglimiet), secrets, uitrol, controle en terugdraaien.
- `npm run check:live` (`scripts/check-live.mjs`) controleert na uitrol: website, catalogus (alleen gepubliceerd, alleen publieke velden), herkomstcontrole, lege aanvraag gratis, en of Gemini echt rangschikt zonder meer terug te geven dan volgorde en fotorol. Getest tegen de echte serverfunctie met nagebootste diensten (4 tests).
- Serverfunctie: optioneel `PERSONALISE_MODEL`, zodat rangschikken een goedkoper model kan gebruiken dan fotoanalyse.
- Live niet gecontroleerd: deze agentomgeving mag de website en Supabase niet bereiken. Martijn draait de controle na uitrol op zijn eigen computer.

### 11 november 2026 — delen en stuklinks (onderdeel B)
- Begonnen op main 5d5e74e (PR #26 gemerged). Codex bouwt tegelijk "Mijn smaak" (onderdeel 4); dit werk raakt andere bestanden.
- Het deelicoon werkt nu. Op een telefoon opent één tik het deelmenu met titel en link, anders wordt de link gekopieerd en staat er twee seconden een vinkje in hetzelfde icoon. De link bevat alleen de stuk-ID (`#stuk=<id>`), nooit een fotolink of token. Wie hem opent, komt op dat stuk uit. Een onbekend, ongeldig of verkocht stuk toont gewoon de winkel, en het `#stuk`-deel verdwijnt na gebruik uit de adresbalk.
- Losse browsertest `tests/storefront-share.cjs` (deelmenu, kopiëren, vinkje, 44 px, links, verkocht, geen schrijfacties) geslaagd op 390 en 320 px, net als de bestaande tests. [Beelden](screenshots/delen/README.md). Niet getest op een echte telefoon.

### 10 november 2026 — Gemini-review verwerkt
- Martijn liet Gemini de code van PR #24–26 reviewen. Alle bevindingen gecontroleerd: drie hoog (terugbladeren bevroor de volgorde, te weinig uitvoertokens, sessiecache verviel na een hartje), vier middel en twee laag. Ze zijn verwerkt, met één afwijking van het voorstel: geen `thinkingBudget: 0`, omdat niet elk model dat accepteert. Details en drie open beslispunten in [REVIEW-SMAAKPROFIEL.md](REVIEW-SMAAKPROFIEL.md).
- 46 unit-/databasetests en browsertests geslaagd, met nieuwe tests voor elke herstelde bevinding. Niet live getest.

### 10 november 2026 — persoonlijke volgorde met AI (onderdelen 5 en 6)
- Serverfunctie `personalise`: openbaar zonder login, met controle op herkomst, een body van hoogstens 8 kB, een daglimiet per anonieme bezoeker (20) en in totaal (2000, nieuwe migratie), en terugval op de lokale volgorde bij een storing of zonder Gemini-sleutel. Er worden geen IP-adressen bewaard.
- Winkel: `app/store-screens/personalise.js` opent op het best passende stuk, past het AI-antwoord toe op alles na het stuk in beeld, toont per stuk de gekozen foto, en houdt de volgorde vast tijdens de sessie. De kern kreeg `api.personalise`. Zonder profiel blijft alles zoals het was; een profiel ontstaat pas met onderdeel 4.
- 42 unit-/databasetests (5 server- en 1 databaseblok nieuw) en browsertests met nagebootste serverfunctie geslaagd. Niet live getest: uitrol, migratie en Gemini wachten op Martijn ([SUPABASE-START.md](SUPABASE-START.md), stap 6).

### 10 november 2026 — besluiten Martijn verwerkt, Mijn favorieten en Betalen
- Twaalf besluiten van Martijn vastgelegd in [SMAAKPROFIEL.md](SMAAKPROFIEL.md). De belangrijkste: AI rangschikt, de winkel herordent en kiest de hoofdfoto per bezoeker, "Mijn smaak" komt in het Shop-menu, meer/minder zoals dit staat in de foto, en zo dicht mogelijk bij optie B blijven.
- "Mijn items" heet nu "Mijn favorieten". In de winkelmand staat weer een knop, nu "Betalen". Die doorloopt een voorbeeldbetaling in twee stappen; er wordt niets betaald of gereserveerd, en de browsertest controleert dat er geen schrijfacties zijn. [Beelden](screenshots/winkelmand/README.md).
- Verdeling: de volgende Claude Code-sessie bouwt "Mijn smaak" en meer/minder zoals dit. Deze sessie bouwt daarna de server-proxy en het herordenen met de AI-volgorde en de hoofdfoto per bezoeker.

### 10 november 2026 — smaakprofiel: datamodel, signaalverwerking, prompt en controle
- Martijns opdracht voor een smaakprofiel ontbrak in de eerste versie van deze taak. Nu uitgewerkt in [SMAAKPROFIEL.md](SMAAKPROFIEL.md), gebaseerd op de door Nikki ingevulde publieke kenmerken (materiaal, model, kleur, lengte, pasvorm, periode, bijzonderheden, bont, prijsklasse). Niets wordt uit foto's afgeleid.
- Klaar: `app/taste/` (TypeScript-contract, opslag met verval, signaalverwerking, lokale rangschikking, stabiele sessievolgorde) en `supabase/functions/personalise/prompt.mjs` (payload, systeemprompt, controle van het AI-antwoord). De kern geeft nu de extra publieke velden door en zendt signalen uit via `NikkiShop.onSignal`. De winkel gedraagt zich nog hetzelfde en slaat nog geen profiel op.
- Volgende Claude Code-sessie: venster "Mijn smaak" (blauwdruk in `app/store-screens/taste.js`). Herordenen, server-proxy en A/B-test wachten op Martijn; zes vragen staan in het plan.
- 37 unit-/databasetests (14 nieuw), browsertests met controle van de signalen, projectcheck en TypeScript-controle geslaagd. Geen handler, migratie, uitrol of live Gemini-test.

### 10 november 2026 — frontendplan in losse onderdelen, winkelmand gebouwd
- Codex was hiermee begonnen maar stopte op zijn limiet. Er stond niets van gepusht; het laatste Codex-werk (PR #23) was al gemerged. Claude Code heeft de taak overgenomen vanaf main 5bc7199.
- [FRONTEND-PLAN.md](FRONTEND-PLAN.md): de open punten als losse onderdelen met eigenaar. De kern `app/store-extension.js` heeft onderaan een klein contract `window.NikkiShop`. Elk onderdeel staat in een eigen bestand in `app/store-screens/`, dat de build achter de kern toevoegt.
- Onderdeel A, Winkelmand-overzicht, gebouwd in `app/store-screens/cart.js`, volgens de mand uit optie B. Afrekenen is vervangen door de proefmelding. Onderdeel B, Delen en stuklinks, staat klaar als startbestand voor de volgende Claude Code-sessie. C tot en met G wachten op Martijn.
- Build, 23 unit-/databasetests, cloudbrowserworkflow, storefronttests met de nieuwe mandtest en de zelfstandige optie-B-test geslaagd. [Beelden voor/na naast optie B](screenshots/winkelmand/README.md). Hoofdwinkel ongewijzigd (de geometriecontrole blijft groen). Geen schema-, rechten-, voorraad- of backend-schrijfacties. Live Supabase/Gemini en fysieke iOS/Safari niet getest; merge blijft bij Martijn.

### 10 november 2026 — Collectie en Mijn items ingevuld
- Begonnen op de nieuwste goedgekeurde main d730413, inclusief PR #20–22; nieuwe branch voor deze aanvulling. Hoofdwinkel, onderrij en bestaande opslagarchitectuur behouden.
- Collectie toont de publieke catalogus met zoeken, materiaalfilter en sortering; Mijn items toont lokale hartjes. Foto opent de bestaande winkel, naam opent details en keert terug naar dezelfde lijst; prijs en hartje gebruiken bestaande lokale opslag.
- Build, 23 unit-/databasetests, cloudbrowserworkflow, collectie-/hartjestests en zelfstandige referentiecontrole geslaagd. De hoofdwinkel is visueel ongewijzigd en de geometriecontrole blijft groen. [Vensters voor/na](screenshots/collectie-mijn-items/README.md), [functieoverzicht en open punten](FUNCTIONALITEIT.md).
- Geen schema-, rechten-, voorraad- of nieuwe backend-schrijfacties. Live Supabase/Gemini en fysieke iOS/Safari-apparaten niet opnieuw getest; merge blijft bij Martijn.

### 10 november 2026 — geldende versie van de winkel vastgelegd
- Martijn heeft de cloudwinkel op `main` goedgekeurd. In AGENTS.md staat nu dat deze versie het uitgangspunt is voor elke agent, met de afgesproken afwijkingen van de referentie, en dat oude branches, previews en prototypes geen uitgangspunt meer zijn.

### 10 november 2026 — lege vakjes in de onderrij terug
- Op verzoek van Martijn blijven de vier vakjes in de onderrij altijd staan, ook leeg. Bij één stuk is het vakje "vorige" leeg in plaats van een herhaling van het huidige stuk. De extra fotoruimte op lage schermen blijft.

### 10 november 2026 — onderrij zonder lege vakjes, meer foto op lage schermen
- Na vergelijking met het artifact door Martijn: de onderrij van de cloudwinkel toont alleen stukken die bestaan (geen lege vakjes; bij één stuk alleen het menu). Op schermen lager dan 760 px gaat de bovenmarge van de ontwerpschets naar de foto; op 844 px blijft het scherm gelijk aan optie B.
- Gecontroleerd met de bestaande en uitgebreide browsertests (nagebootste diensten). De foto blijft op een laag scherm minder hoog dan in het artifact, omdat alles op één scherm past; niet getest op een echte telefoon.

### 10 november 2026 — review van PR #19 verwerkt
- Gepubliceerde ID's staan los van fotobeschikbaarheid: de lokale mand overleeft tijdelijke foto-uitval, maar verwijdert verkochte/teruggetrokken stukken. Het SVG-vinkje wordt bij een lege weergave verborgen; de vorige-stukknop wijst niet naar het huidige stuk.
- Met Martijns akkoord verdwijnt alleen in de app het presentatiekader. Mobiel tot 480 px schermvullend, daarboven 390 px gecentreerd; binnenindeling en onderrij gebruiken dezelfde referentieregels bij de werkelijke breedte. Status alleen bij laden of een probleem, zonder verschuiving.
- Materiaal en toepasselijke bontsoort uit bestaande velden veilig getoond; Winkelmand vermeldt dat afrekenen nog niet kan. Geen schema-, rechten-, voorraad- of winkelschrijfacties toegevoegd.
- Build, 23 unit-/databasetests, cloudbrowserworkflow, uitgebreide vergelijkingstest en zelfstandige optie-B-test geslaagd. Schermafbeeldingen op 390/320 px bijgewerkt. Veilige randen gesimuleerd; fysiek iOS/Safari en live Supabase/Gemini niet opnieuw getest. Merge blijft bij Martijn.

### 9 november 2026 — cloudwinkel volgt optie B
- De cloudbuild gebruikt de HTML/CSS van `concept/ontdekken-optie-b.html` rechtstreeks. De bestaande publieke Supabase-catalogus, NikkiStore en beveiligde fotolinks vullen de winkel; prijs wisselt alleen lokale stuk-ID's, naam toont verkooptekst en bestaande platte maten. Menu-bestemmingen zijn plaatshouders.
- De afgesproken smalle-schermregel geldt in referentie en app: minimaal 44 × 44 px, dezelfde verhouding, 8 naar 6 px tussenruimte, zo nodig twee volgende stukken. Op 390 px blijft de onderrij gelijk.
- Build, 23 unit-/database-/opslagtests, cloudbrowserworkflow en nieuwe vergelijkingstest op 390/320/280 px geslaagd. Ook de zelfstandige optie-B-test slaagt. [Schermafbeeldingen naast de referentie](screenshots/README.md) gebruiken testgegevens en de offline fontterugval. Geen live Supabase/Gemini-test, schemawijziging of deployment.

### 9 november 2026 — optie B vastgelegd als ontwerpbron
- Op verzoek van Martijn staat in AGENTS.md dat `concept/ontdekken-optie-b.html` leidend is voor de winkelinterface, dat nieuwe schermen dezelfde stijl volgen en dat de bestaande architectuur in `app/` en `supabase/` wordt hergebruikt.

### 9 november 2026 — ontwerp Ontdekken optie B vastgelegd
- Martijn heeft in het Claude Design-canvas optie B gekozen voor het shopscherm. Overgenomen als zelfstandig bestand `concept/ontdekken-optie-b.html`, met beschrijving in [concept/README.md](../concept/README.md), zodat ChatGPT/Codex verder kan.
- Sfeerfoto's niet in Git: het bestand toont getekende jassen; lokale foto's kunnen in de genegeerde map `concept/fotos/`. Prijzen, verkooptekst en maten zijn plaatshouders.
- Gecontroleerd met `node tests/ontdekken-optie-b.cjs` (Chromium, offline, 390 en 320 px). Niet getest op een echte telefoon; de cloudpilot in `app/` is niet aangepast.

### 5 november 2026 — fotonavigatie op de startpagina hersteld
- Eigen branch `codex/carousel-photo-navigation`, gebaseerd op gecontroleerde `origin/main` `3050a02455066d623f6f501eb9f60563ded68c33`. De startpijlen bladerden alleen tussen kledingstukken; bij één stuk waren andere opgeslagen foto's daar niet bereikbaar. Na afstemming blijven de pijlen uitsluitend voor kledingstukken. Ze staan onderaan in de foto en verdwijnen bij één stuk. Foto’s kies je via miniaturen: rechts op telefoon, onder de foto op desktop. Een ander kledingstuk begint bij zijn hoofdfoto; de teller vermeldt het kledingstuk.
- Build, projectcheck, 23 unit-/databasetests en de browserworkflow met systeem-Chromium geslaagd. Browsercontrole dekt beide pijlen tussen stukken, miniatuurselectie met muis en toetsenbord, de hoofdfoto bij wisselen en de plaatsing op 320, 390 en 1440 pixels breed. Externe diensten nagebootst; geen live publicatie of Gemini-analyse uitgevoerd.
- Volgens Martijn zijn beheerdersaccount, staff-toegang, Edge Function `analyse` en de drie Gemini/origin-instellingen ingericht. Inloggen op de live website is door Martijn bevestigd. Een echte geslaagde Gemini-analyse en beschikbaarheid van het ingestelde model zijn nog niet bevestigd; geen geheime waarden gelezen.

### 4 november 2026 — Supabase-pilot ingericht
- Bestaand project `naxjrskfdedwvoeltigs`: catalogus, staff, analysequota en privébucket aangemaakt; 0 stukken en 0 gebruikers bij controle. Alleen project-URL en bestaande publishable key naar de websiteconfiguratie.
- Supabase gaf standaard rechtstreekse functieaanroeprechten aan anon. Aanvullende migratie trekt die in; de bestaande staffcontrole blijft staan. Live SQL-proeven blokkeren anonieme wijzigingen en RPC-aanroepen en weigeren authenticated zonder staff. Alle drie tabellen hebben RLS; bucket is privé, maximaal 2 MB per JPG/PNG/WebP.
- Migratiebestandsnamen volgen de werkelijke remote registraties `20261104193047` en `20261104193519`. Lokale tests simuleren nu ook de standaard Supabase-grants. Build, unit-/databasetests, browsertests en projectcheck slagen; echte Auth-login, Storage-upload en de volledige invoerroute zijn nog niet getest. Geen Gemini-aanroep gedaan.

### 4 november 2026 — cloudopmaak voor desktop en lege collectie
- Vanaf main 52d5bcd: begrensde desktopcarrousel, schermvullend winkelvenster, stijlafhankelijke bediening en een verzorgde lege-collectieweergave zonder losse pijlen. Foto's ontbreken nog in de repository; geen voorbeeldvoorraad, Supabase-inrichting of live publicatie toegevoegd.
- Lokaal gecontroleerd op 390, 1440 en 1920 pixels breed; build, unit-/databasetests, browserworkflow en projectcheck slagen. Het workers.dev-adres was vanuit het browserhulpmiddel niet bereikbaar; controle uitgevoerd met de repositorycode en nagebootste diensten.

### 4 november 2026 — opgeslagen foto's hergebruikt
- Opvolging bouw-PR: bestaande fotopaden slaan hercoderen en data-URL-inlezen over; nieuwe foto's blijven hergecodeerd. Productfotopositie blijft bij verversen behouden; setup-node vastgezet op de geverifieerde v4.4.0-SHA. Alleen nagebootste diensten, geen schema- of voorraadwijzigingen.
- Build, unit-/databasetests, browsercontrole en projectcheck geslaagd; nieuwe browserproeven bewijzen EXIF-verwijdering, nul herverwerking bij tekstwijziging en linkvernieuwing bij terugkeer naar een oud tabblad.

### 4 november 2026 — bouwankers gecontroleerd
- Vanaf main c21247b: vaste invoegmarkeringen, expliciete aantallen voor alle bronvervangingen en fouttests voor ontbrekende/dubbele ankers. Cloudbuild leest de gedeelde bronweergaven rechtstreeks. Geen live diensten of schemawijzigingen.

### 3 november 2026 — review cloudpilot verwerkt
- Claude-review van PR #10. Opgelost: één onbereikbare foto blokkeerde de hele collectie (foto's worden nu in één batch getekend; een stuk zonder bereikbare foto wordt overgeslagen en staff ziet een melding); elke verversing zette bezoekers terug op de startpagina (weergave, carrouselpositie en scroll blijven nu staan); fotolinks verliepen in een tabblad dat lang op de achtergrond stond (verversen bij terugkeer); validatiefouten bij opslaan geven nu een concrete melding; een niet-beheerder wordt ook op de server uitgelogd.
- Gecontroleerd met `npm test` (unit- en databasetests) en `npm run test:browser` (Chromium, nagebootste diensten). De verversing bij een zichtbaar geworden tabblad is niet automatisch getest. Geen live Supabase of Gemini gebruikt.

### 3 november 2026 — Supabase/Gemini-cloudpilot voorbereid
- Martijn heeft ingestemd met de volgende bouwstap: veilige AI-voorstellen en gezamenlijke opslag. Code toegevoegd in `app/` en `supabase/`, met [starthandleiding](SUPABASE-START.md). De bestaande vijf stijlen, invoer en carrousel worden hergebruikt. Nieuwe beheerfuncties: opgeslagen stukken openen, wijzigen en verkocht markeren.
- Supabase is de proefrichting voor deze catalogus; Airtable is niet gewijzigd en er is nog geen winkelplatform aangesloten. De SQL-status is geen checkout-voorraad. Geen betaald abonnement, deployment, migratie op afstand of echte AI-aanroep uitgevoerd.
- Lokale controle: PostgreSQL-testengine voor de echte migratie en rechten; servertests met nagebootste diensten; mobiele browserworkflow met nagebootste opslag en AI. Na accountconfiguratie zijn echte verbindingstests vereist.

### 1 november 2026 — voorbereiding voor Nikki en Gemini
- Scope bevestigd door Martijn: uitsluitend een skelet om gevoel bij te krijgen. Keuze Airtable versus direct contentbeheer in een winkelplatform wordt onderzocht; geen integratie gebouwd.
- Beide prototypes hebben standaard mobiele viewport, UTF-8 en standards mode. Invoer accepteert alleen positieve eindige decimale maten en prijzen, controleert optionele maten en weigert een titel met alleen spaties. Onverwachte AI-bontclassificaties passeren de checklist niet.
- Alle vijf stijlen, stijl-hartjes en Mijn keuze behouden. Sfeerfoto’s lokaal toevoegen en exporteren naar één HTML-bestand met ingesloten beelden en gekozen beginstijl.
- Handleiding voor Nikki toegevoegd: werking, mogelijke toekomstige gegevensstroom, inspiratie, Gemini-overdracht en één vraag tegelijk. De platformkeuze wordt niet als definitief gepresenteerd.
- Chromium-controles geslaagd met externe aanvragen geblokkeerd: mobiel, vijf stijlen, foto-export/heropenen, handleiding en invoer. Foto-export gebruikt een synthetisch testbeeld. Claude en Gemini zelf niet live getest.
- Gebruikersbeelden nog niet ingebouwd: vier inline referenties zijn zichtbaar in chat, maar niet als afbeeldingsbestand beschikbaar. Het downloadbare bestand bontjas 4.htm bevat een zoekpagina. Wachten op JPG/PNG/WebP; geen nieuwe beelden gegenereerd of aangenomen als echte voorraad.


### 1 november 2026 — foto's in skelet en stijlbord
- Design-canvas "Stijlen voor Nikki" met vijf stijlen, gevuld met sfeerfoto's van Martijn (één foto met een ander merklogo niet gebruikt). Bontsoort bij deze foto's als [soort]: onbekend.
- Skelet kan per stuk een foto tonen (anders tekening), met een eigen fotolijst per stijl. Sfeerfoto's alleen in de gepubliceerde privéversie, niet in Git (beeldrechten).

### 1 november 2026 — stijlknop voor Nikki
- Skelet: stijlknop met vijf stijlen (Ivoor, Parisienne, Bonbon, Hollywood, Boudoir), hartje per stijl en *Mijn keuze* met kopieerbare antwoorden. Contrast per stijl nagemeten (tekst minstens 12:1, gedempte tekst minstens 5,6:1). Eerder deze dag: hartje met voorbeeldteller in de foto en lang drukken om te liken.
- Gemini-opdracht in `concept/README.md` bijgewerkt: verfijnen van de gekozen stijl.

### 1 november 2026 — review Codex verwerkt
- Drie bevindingen uit de Codex-review van PR #3 opgelost in het invoerprototype: bontclassificatie los van de materiaalnaam (eigen materiaalnaam kon de soortcontrole omzeilen), maten/prijs/keuzes blijven bewaard bij terug naar foto's, fotoplek weer aanpasbaar en hoofdfoto expliciet te kiezen. De drie reproducties uit de review lokaal nagespeeld in headless Chromium; alle drie opgelost.

### 1 november 2026 — invoerscherm als checklist
- Invoerprototype vereenvoudigd: twee knoppen (Verwerken, Publiceren), geen AI-woorden in beeld, en de controle als één checklist met het hele pad tot publiceren. Keuzes via aantikken; nieuwe waarden via *+ nieuw* worden onthouden in de browser. Volledige route zonder automatische voorstellen lokaal getest; de automatische voorstellen alleen te testen in de gepubliceerde versie.

### 1 november 2026 — invoerprototype
- Prototype voor Nikki's invoer met AI toegevoegd (`concept/intake-prototype.html`): foto's, AI-voorstellen, controle, maten, demo-matching met voorbeeldklanten. Niets opgeslagen of verstuurd. Handmatige route lokaal getest; de echte AI-aanroep is alleen in de gepubliceerde versie te testen.
- Skelet: kenmerken tussen naam/prijs en hartje; hartjes ook in de collectierijen.

### 1 november 2026 — skelet v0.3
- Pagina's Materialen en Missie toegevoegd; hartjes op losse kenmerken in de startcarrousel.
- Skelet volledig Nederlandstalig. Bontsoort wordt bij bont altijd genoemd (voorbeelden: nerts, vos, persianer) en is een kenmerk met hartje.

### 1 november 2026 — skelet v0.2
- Skelet omgebouwd naar Martijns richting: carrousel bij binnenkomst, bladeren in carrousels, hartjes als smaaksignaal (demoregel), Perfect fit als e-mailpopup, plaatshouder voor AI-meethulp. Minimalistisch, notities standaard verborgen.
- Richting en open vragen (machine learning, AI-meethulp) vastgelegd in [CONCEPT.md](CONCEPT.md).

### 1 november 2026 — websiteskelet
- Werkend HTML-skelet toegevoegd in [concept/](../concept/README.md): collectie met filters, productpagina met platte maten en vergelijking, en The Perfect Find (swipen, maten van eigen jas, toestemming). Getekende jassen, alleen voorbeelddata, geen opslag of checkout.
- Beschreven hoe Nikki het skelet in Gemini verder kan vormgeven. Merknaam in het concept: Guaranteed Second-hand Fur (werknaam).

### 1 november 2026 — Claude neemt over van ChatGPT/Codex
- Claude Code (cloudsessie) leest de repository en de Airtable-base. Read-only gecontroleerd: drie tabellen met het schema uit `airtable/schema.json`, 0 kledingstukken.
- Brainstorm over verkoopervaring vastgelegd in [CONCEPT.md](CONCEPT.md): pasprofiel, dossier per kledingstuk, omgekeerd winkelen en swipen. Paspop on hold.
- Startroutine voor Claude toegevoegd aan `CLAUDE.md`.
- Gezien in deze omgeving: Node.js 22, niet 24 zoals de README noemt. De huidige projectcheck slaagt daarmee.
