# Toegang en aansluitplan

Gecontroleerd op 1 november 2026. Deze lijst beschrijft feitelijke checks, geen afgeleide bevoegdheden.

| Onderdeel | Vastgesteld | Nog nodig |
|---|---|---|
| Lokale projectmap | Documentatiefundering in deze map aangemaakt | Als project toevoegen aan de Codex-zijbalk |
| Git | Git 2.52.0 aanwezig; lokale repository op main; origin wijst naar NIkki-s-Vintage | Eerste commit en remote verifiëren |
| GitHub | Gebruiker maakte NIkki-s-Vintage aan; na expliciete keuze privé gemaakt; browserbeheer werkt | Projectbestanden uploaden en remote commit/CI teruglezen |
| GitHub-connector voor nieuwe privé-repo | Profielverbinding werkt; na privé maken geeft deze repo via connector 404 | Deze repository expliciet aan de gekoppelde GitHub-app toestaan voor toekomstige connectoracties |
| Lokale GitHub-aanmelding | Git Credential Manager bevestigt account martijnungerer-dot | Push/pull op de nieuwe privé-repository controleren |
| GitHub browser | Gebruiker is ingelogd; repository-instellingen leesbaar | Geen loginactie meer nodig |
| Branchregels | GitHub meldt dat rulesets voor deze privé-repository niet worden afgedwongen met de huidige accountinstellingen | Voorlopig menselijke PR/reviewprocedure; accountopties later beoordelen |
| GitHub CLI | gh niet gevonden in PATH; GH_TOKEN/GITHUB_TOKEN niet aanwezig in deze procesomgeving | Alleen indien CLI-route nodig is: normale accountlogin inrichten |
| Airtable | Connector kan workspaces/bases lezen en schrijven; nieuwe base succesvol aangemaakt | Websiteserver afzonderlijk autoriseren |
| Airtable-schema | Drie tabellen, 54 velden inclusief wederzijdse links; definities opnieuw uitgelezen en vergeleken | Invoer/publish-validatie bouwen, eventuele veldrechten instellen |
| Claude Code | Versie 2.1.289 aanwezig; auth status meldt loggedIn | Projectmap openen en geladen instructies controleren; GitHub/Airtable-toegang afzonderlijk testen |
| Codex | Deze sessie kan projectbestanden maken en verbonden services gebruiken | Projectregistratie en toekomstige sessietoegang controleren |
| Shopplatform, hosting, domein | Niet verbonden of gekozen in deze taak | Eerst productkeuze en eigenaar; daarna setup en concrete toegangstest |

Er zijn geen opgeslagen credentialbestanden uitgelezen. Aanvankelijk is alleen aanwezigheid van de benoemde omgevingsvariabelen getest; afwezig betekent niet dat nergens anders credentials bestaan. Vervolgens is via Git Credential Manager alleen de bestaande accountnaam vastgesteld. Er zijn geen wachtwoorden of sleutels aangemaakt, geraden of in dit project opgeslagen. GitHub weigerde de eerste push vanwege het privé-e-mailadres van de auteur. Het bestaande noreply-commitadres is daarna letterlijk uit GitHub's e-mailinstellingen overgenomen en alleen in deze repository ingesteld. De nog niet gepubliceerde commit is daarmee gecorrigeerd; de accountprivacy is niet afgezwakt en globale Git-instellingen zijn niet gewijzigd.

## Airtable

[Open de base](https://airtable.com/appcR1TGKaoc4XAU4). Werkruimte: My First Workspace. Echte base-, tabel- en veld-IDs staan in [connection.json](../airtable/connection.json); dit zijn identifiers, geen toegangstokens. Geen echte of fictieve voorraadrecords toegevoegd.

Voor de websiteserver: maak in Airtable een eigen integratietoegang voor alleen de benodigde base. Een eerste read-only adapter vraagt `data.records:read` en, voor schemavalidatie, `schema.bases:read`. De latere publisher heeft afzonderlijk beperkte `data.records:write` nodig voor syncresultaten. `schema.bases:write` uitsluitend voor een gecontroleerde schemawijziging; niet voor de storefront. Maak een aparte testbase voordat ontwikkelwerk records gaat schrijven.

Bewaar een PAT in lokale genegeerde configuratie of de secretsopslag van de host, niet in deze chat. Gebruik nooit automatisch alle workspaces als scope. Het recht van een token blijft begrensd door de rechten van de gebruiker. [Airtable-tokeninstructies](https://support.airtable.com/articles/9934989703-creating-personal-access-tokens).

Een geslaagde runtimecheck moet de verwachte base en drie tabelschema's lezen, fouten begrijpelijk rapporteren en geen token of volledige private records loggen. Deze runtimecheck is nog niet uitgevoerd omdat er nog geen websiteserver is.

## GitHub en lokale Git

Bestemming: [martijnungerer-dot/NIkki-s-Vintage](https://github.com/martijnungerer-dot/NIkki-s-Vintage). De gebruiker heeft deze repository gemaakt. De aanvankelijke openbare zichtbaarheid is op zijn expliciete verzoek gewijzigd naar privé, vóór upload van de bestanden. Clone-URL: `https://github.com/martijnungerer-dot/NIkki-s-Vintage.git`. De connector bevestigde eerst admin- en schrijfrechten, maar na de privéwijziging gaf hij 404. De browser heeft nog beheertoegang en lokale Git heeft een eigen bestaande aanmelding. Deze afzonderlijke verbindingen niet verwarren.

Vervolgcontrole: upload uitsluitend deze projectbestanden; vergelijk commit en bestandslijst. De eerste commit gebruikt de geverifieerde GitHub-identiteit en de bestaande lokale Git-aanmelding. Controleer de CI-run. Op de Rulesets-pagina meldt GitHub expliciet dat regels niet worden afgedwongen voor deze private repository zonder accountwijziging. Er zijn daarom geen niet-werkende regels als bescherming gepresenteerd en geen upgrades aangeschaft. Werk voorlopig met eigen branches, PR's en menselijke beoordeling.

## Codex-project toevoegen

Er is in deze sessie geen tool om een nieuw sidebarproject aan te maken. Voeg de bestaande map `outputs/nikki-vintage` uit deze chatwerkruimte toe via de projectfunctie van de app. Gebruik deze map als projectroot, zodat AGENTS.md en CLAUDE.md direct vindbaar zijn. Dit document claimt geen aangemaakt ChatGPT-cloudproject of Codex-sidebarproject.

## Claude aansluiten

Open dezelfde repository vanuit een eigen checkout wanneer Codex tegelijk werkt. Laat Claude eerst README.md en AGENTS.md samenvatten en de branch/remote controleren. Een lokale Claude-login is geverifieerd; toegang tot de nieuwe repository/base is niet geverifieerd. Geef Claude geen productiesleutels voor een gewone codeopdracht.
