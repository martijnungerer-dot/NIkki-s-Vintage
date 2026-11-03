# Voortgang

Korte logboekregels, nieuwste bovenaan. Alleen feiten die zijn gecontroleerd; plannen staan in [PLAN.md](PLAN.md), ideeën in [CONCEPT.md](CONCEPT.md). Geen privéveldwaarden, klantgegevens of secrets.

## Huidige stand

- Fase: P0 afgerond; P1 (productkeuzes en proefinvoer) en concept-brainstorm lopen.
- Airtable (`appcR1TGKaoc4XAU4`): 0 records in Garments op 1 november 2026.
- Webshop: nog geen winkelplatform of checkout. Wel een statisch skelet in `concept/` en een cloudpilot (Supabase + Gemini) in `app/` en `supabase/`, lokaal getest met nagebootste diensten; nog niet live verbonden.

## Logboek

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
