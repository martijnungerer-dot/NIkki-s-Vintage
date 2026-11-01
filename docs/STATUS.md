# Voortgang

Korte logboekregels, nieuwste bovenaan. Alleen feiten die zijn gecontroleerd; plannen staan in [PLAN.md](PLAN.md), ideeën in [CONCEPT.md](CONCEPT.md). Geen privéveldwaarden, klantgegevens of secrets.

## Huidige stand

- Fase: P0 afgerond; P1 (productkeuzes en proefinvoer) en concept-brainstorm lopen.
- Airtable (`appcR1TGKaoc4XAU4`): 0 records in Garments op 1 november 2026.
- Webshop: nog niet gebouwd; wel een statisch skelet in `concept/`.

## Logboek

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
