# Voortgang

Korte logboekregels, nieuwste bovenaan. Alleen feiten die zijn gecontroleerd; plannen staan in [PLAN.md](PLAN.md), ideeën in [CONCEPT.md](CONCEPT.md). Geen privéveldwaarden, klantgegevens of secrets.

## Huidige stand

- Fase: P0 afgerond; P1 (productkeuzes en proefinvoer) en concept-brainstorm lopen.
- Airtable (`appcR1TGKaoc4XAU4`): 0 records in Garments op 1 november 2026.
- Webshop: nog niet gebouwd; wel een statisch skelet in `concept/`.

## Logboek

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
