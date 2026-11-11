# Voortgang

Korte logboekregels, nieuwste bovenaan. Alleen feiten die zijn gecontroleerd; plannen staan in [PLAN.md](PLAN.md), ideeën in [CONCEPT.md](CONCEPT.md). Geen privéveldwaarden, klantgegevens of secrets.

## Huidige stand

- Fase: P0 afgerond; P1 (productkeuzes en proefinvoer) en concept-brainstorm lopen.
- Airtable (`appcR1TGKaoc4XAU4`): 0 records in Garments op 1 november 2026.
- Webshop: cloudpilot gepubliceerd op Cloudflare Workers; nog geen winkelplatform of checkout. Supabase-tabellen en privéfoto-opslag zijn ingericht en database-rechten live gecontroleerd. Websiteverbinding staat klaar in code; login en volledige invoerroute wachten op een beheerder en deployment. Gemini is nog niet aangesloten.

## Logboek

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
