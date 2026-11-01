# Nikki Vintage

Projectstart voor Nikki's gecureerde webshop met unieke vintage kledingstukken van bont, leer en shearling. ‘Nikki Vintage’ is een werknaam.

## Stand op 1 november 2026

- Deze map bevat de projectdocumentatie, het Airtable-schema en de afspraken voor Codex en Claude. De webshop zelf is nog niet gebouwd.
- Airtable is aangemaakt in **My First Workspace**: [Nikki Vintage — Inventory](https://airtable.com/appcR1TGKaoc4XAU4).
- Drie tabellen: **Garments**, **Measurements**, **Media**. Metingen en foto's zijn gekoppeld aan kledingstukken. Er zijn geen fictieve voorraadartikelen toegevoegd.
- De privé-repository is [NIkki-s-Vintage](https://github.com/martijnungerer-dot/NIkki-s-Vintage), onder `martijnungerer-dot`. GitHub meldt dat branchregels met de huidige accountinstellingen voor deze privé-repository niet worden afgedwongen; zie [toegang](docs/ACCESS.md).
- Alle 18 projectbestanden zijn geüpload; de eerste automatische GitHub-controle is geslaagd. Lokale Git-toegang werkt. De afzonderlijke GitHub-connector heeft nog geen toegang tot deze nieuwe privé-repository en de map is nog niet als sidebarproject geregistreerd.
- Claude Code is lokaal aanwezig en meldt een ingelogde sessie. Er is nog geen Claude-werksessie op dit project gestart.
- Een werkende Airtable-verbinding in deze chat is geen toegangssleutel voor de toekomstige website of voor Claude. Die verbindingen worden afzonderlijk ingericht.

## Begin hier

1. [Projectbrief](docs/PROJECT.md): ervaring, scope, open keuzes.
2. [Architectuur](docs/ARCHITECTURE.md): eigenaarschap van gegevens, publicatie, unieke voorraad.
3. [Airtable en meetprotocol](docs/DATA-MODEL.md): velden, kwaliteit en dagelijkse invoer.
4. [Uitvoeringsplan](docs/PLAN.md): bouwvolgorde en acceptatiecriteria.
5. [Samenwerking](docs/COLLABORATION.md): hoe Codex en Claude veilig bijdragen.
6. [Toegang en vervolg](docs/ACCESS.md): bewezen verbindingen versus ontbrekende stappen.
7. [Verkoopconcept](docs/CONCEPT.md): brainstorm over pasprofiel, matching en meldingen.
8. [Voortgang](docs/STATUS.md): gecontroleerde stand en logboek.

## Lokaal controleren

Benodigd: Git en Node.js 24. Er zijn in deze documentatiefase geen externe packages nodig.

```powershell
node scripts/check-project.mjs
git status --short
```

De controle leest JSON, controleert lokale documentlinks en de tabelrelaties, en controleert dat de voorbeeldconfiguratie geen ingevulde sleutels bevat. Het is geen volledige secretscanner en geen webshoptest. De GitHub-workflow voert dezelfde controle uit zodra de bestanden op GitHub staan.

## Voorgestelde techniek

Airtable voor invoer en redactie; een kleine server-side synchronisatieservice; Shopify als voorgestelde beheerder van checkout, orders en verkoopvoorraad; een maatwerk storefront met Next.js/TypeScript als de gewenste ervaring dat rechtvaardigt. Een Shopify-theme blijft het eenvoudiger alternatief. Platform en hosting zijn nog geen afgesloten diensten of definitieve besluiten.

Productinformatie en besluiten horen in deze repository. Voorraadgegevens horen in Airtable. Klant- en betaalgegevens horen in het winkelplatform. Chatgeschiedenis is context, geen vervanging van deze bronnen.
