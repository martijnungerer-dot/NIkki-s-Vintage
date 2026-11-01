# Uitvoeringsplan

## P0 — Projectfundering (deze fase)

Opgeleverd: projectbrief, architectuurvoorstel, Airtable-schema met lege base en relaties, meetprotocol, gedeelde agentregels, toegangsverslag, PR-template en lokale documentatiecontrole.

Remote GitHub-repository: NIkki-s-Vintage, privé. Eerste upload/commit en CI-run zijn geverifieerd. Resterende app-aansluiting: map toevoegen aan Codex-projecten en desgewenst de nieuwe privé-repository aan de GitHub-connector toestaan. Lokale Git-toegang werkt. GitHub meldt dat branchregels met het huidige account niet worden afgedwongen voor deze private repository; voorlopig menselijke PR-review. Runtime-toegang voor de toekomstige shop is afzonderlijk werk in P2.

## P1 — Productkeuzes en proefinvoer

Eigenaar: Nikki met Martijn. Kies merknaam, startmarkt, taal, betaal-/winkelplatform, maatwerk versus theme, budget en stijl. Voer drie echte kledingstukken in, inclusief één afwijkende constructie en één zichtbaar gebrek. Controleer dat meetprotocol, fotografie en prijsinvoer in de praktijk werken.

Klaar wanneer: de drie records compleet en menselijk gecontroleerd zijn; open productbesluiten vastliggen; geen gefingeerde productclaims. Nog niet automatisch publiceren.

## P2 — Contracten en verbindingen

Eigenaar: één codingagent, daarna review door de ander of Martijn. Maak testbase/testwinkel, serverconfiguratie en een read-only Airtable-adapter. Leg de publieke productstructuur, nullable maten, prijzen in minor units en foutmeldingen vast. Valideer schema-IDs en permissions met een niet-publieke test. Schrijf zo nodig in een aparte testbase één duidelijk testrecord en controleer de roundtrip.

Klaar wanneer: ontbrekende secrets een duidelijke fout geven; privévelden niet in browserpayloads voorkomen; ongeldige en dubbele SKU's worden geweigerd; volledige paginering en 429-herstel getest zijn. De websiteserver heeft eigen beperkte toegang; de chatkoppeling wordt niet hergebruikt als verborgen credential.

## P3 — Collectie en productpagina

Eigenaar: codingagent op eigen branch. Bouw responsive collectie, filters, productpagina, foto's, maten en conditieweergave met fixtures. Neem loading, lege collectie, onbekende maten, ontbrekende foto en uitverkocht mee. Gebruik echte content pas na toestemming binnen de publicatietaak.

Klaar wanneer: mobiele pagina's en toetsenbordbediening werken, maten begrijpelijk zijn en essentiële informatie niet alleen in foto's staat. Build, typecheck, passende componentchecks en visuele controle geslaagd.

## P4 — Publicatie en checkout

Bouw publisher, duurzame jobadministratie, media-overdracht, commerce-koppeling, webhookverificatie en reconciliatie. Zet het unieke exemplaar eenmalig op voorraad. Checkout via het gekozen platform. Ondersteun mislukte stappen en veilige herhaling.

Verplichte scenario's: twee kopers/één SKU; herhaalde publish zonder extra product of voorraad; dubbele en vertraagde webhook; betaalfout; ontbrekende webhook; geannuleerde order; retour zonder automatische herverkoop; verkocht product met latere tekstwijziging; Airtable-storing; vertraagde cataloguscache; offline verkoop. Bewezen gedrag vastleggen, geen garanties uit een architectuurdiagram afleiden.

## P5 — Klaar voor lancering

Nikki controleert alle publieke content en conditiefoto's. Martijn controleert toegang, monitoring, back-up/herstel, betaal- en verzendinstellingen en releaseprocedure. Laat de toepasselijke verkoopvoorwaarden voor materiaal, landen en platform, retourbeleid en bedrijfsgegevens verifiëren voordat verkoop wordt aangezet. Deze projectdocumenten leveren geen juridische beoordeling.

Klaar wanneer: een volledige testorder en herstelproef slagen; restore van collectie-invoer is beproefd; statusmeldingen bruikbaar zijn; productiedomein en toegang goed staan; eigenaar de release heeft geautoriseerd.

## Eerste taak na de fundering

Doe P1 vóór het bouwen van een volledige frontend. Vervolgens P2 met een read-only catalogusadapter. Zo wordt eerst bewezen dat Nikki's echte kleding- en meetgegevens passen bij het ontwerp.
