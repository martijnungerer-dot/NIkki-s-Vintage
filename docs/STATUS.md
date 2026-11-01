# Voortgang

Korte logboekregels, nieuwste bovenaan. Alleen feiten die zijn gecontroleerd; plannen staan in [PLAN.md](PLAN.md), ideeën in [CONCEPT.md](CONCEPT.md). Geen privéveldwaarden, klantgegevens of secrets.

## Huidige stand

- Fase: P0 afgerond; P1 (productkeuzes en proefinvoer) en concept-brainstorm lopen.
- Airtable (`appcR1TGKaoc4XAU4`): 0 records in Garments op 1 november 2026.
- Webshop: nog niet gebouwd; wel een statisch skelet in `concept/`.

## Logboek

### 1 november 2026 — websiteskelet
- Werkend HTML-skelet toegevoegd in [concept/](../concept/README.md): collectie met filters, productpagina met platte maten en vergelijking, en The Perfect Find (swipen, maten van eigen jas, toestemming). Getekende jassen, alleen voorbeelddata, geen opslag of checkout.
- Beschreven hoe Nikki het skelet in Gemini verder kan vormgeven. Merknaam in het concept: Guaranteed Second-hand Fur (werknaam).

### 1 november 2026 — Claude neemt over van ChatGPT/Codex
- Claude Code (cloudsessie) leest de repository en de Airtable-base. Read-only gecontroleerd: drie tabellen met het schema uit `airtable/schema.json`, 0 kledingstukken.
- Brainstorm over verkoopervaring vastgelegd in [CONCEPT.md](CONCEPT.md): pasprofiel, dossier per kledingstuk, omgekeerd winkelen en swipen. Paspop on hold.
- Startroutine voor Claude toegevoegd aan `CLAUDE.md`.
- Gezien in deze omgeving: Node.js 22, niet 24 zoals de README noemt. De huidige projectcheck slaagt daarmee.
