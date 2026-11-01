# Samenwerking: Martijn, Nikki, Codex en Claude

GitHub is het gedeelde geheugen voor code en besluiten. Airtable is het werkboek voor de collectie. Codex en Claude delen geen chatgeheugen of automatische accounttoegang. Een gewone ChatGPT- of Claude-chat heeft niet vanzelf schrijfrechten; werk met de concrete codingomgeving die de repository kan lezen en wijzigen.

## Gedeelde instructies

[AGENTS.md](../AGENTS.md) bevat de projectregels. [CLAUDE.md](../CLAUDE.md) importeert die met `@AGENTS.md`. Dit voorkomt twee verschillende versies van de afspraken. Controleer bij het starten welke instructies daadwerkelijk zijn geladen; dit is context voor de agent, geen technische beveiliging. [Codex-documentatie](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Claude-documentatie](https://code.claude.com/docs/en/memory).

## Per opdracht

1. Beschrijf één taak met acceptatiecriteria, geraakte bestanden en eigenaar. Eén agent voert uit; de andere kan daarna de diff beoordelen. Rollen mogen per taak wisselen.
2. Synchroniseer met main. Gebruik een eigen branch, bijvoorbeeld `codex/catalog-schema` of `claude/product-measurements`. Werk nooit gelijktijdig met twee agents in dezelfde checkout. Bij werkelijk parallel werk: een aparte clone of een expliciet ingerichte worktree per agent.
3. Voorkom overlap in gedeelde contracten, schema's en lockfiles. Eén eigenaar per overlappend bestand; de tweede taak wacht op het contract of bouwt op de afgeronde wijziging voort.
4. Maak kleine commits, voer de toepasselijke checks uit en open een pull request met doel, diff, bewijs en open risico's. Een AI-review is aanvullend; Martijn bepaalt standaard welke wijzigingen worden samengevoegd en vrijgegeven.
5. Los feedback op; haal recente main-wijzigingen op in je eigen branch. Behoud werk van de ander. Test na conflictoplossing de geraakte stroom opnieuw.
6. Werk plan/besluiten bij en lever een overdracht op: branch, commit, gewijzigde bestanden, checks, resterend werk. De volgende agent leest dit en de actuele code, niet alleen een mondelinge samenvatting.

De gebruiker kan in een concrete opdracht ook merge- of releasewerk autoriseren. Vraag niet opnieuw toestemming voor al geautoriseerde routinehandelingen.

## Voorbeeld van een opdracht

Lees README.md, AGENTS.md, docs/PLAN.md en de relevante architectuur. Werk op een eigen branch aan taak P2. Gebruik uitsluitend synthetische fixtures. Houd maten in cm, scheid privé- en publieke velden en verander geen checkoutgedrag. Lever een pull request met geslaagde controles en vermeld expliciet wat niet is getest. Laat credentials, productievoorraad en productpublicatie ongemoeid tenzij de opdracht die acties expliciet omvat.

## Technische bescherming die nog moet worden ingesteld

- Privé-repository; alleen noodzakelijke personen/apps toegang geven. Een agentnaam is geen automatisch GitHub-account.
- Main via PR's, verplichte checks en waar het accountplan dat ondersteunt vereiste review, blokkeren van force-push/verwijderen en beperken van bypass.
- CODEOWNERS pas met echte GitHub-gebruikers of teams invullen. Geen fictieve reviewers. Eén persoon kan de eigen PR niet als onafhankelijke reviewer goedkeuren; kies een echte tweede reviewer of leg de solo-werkwijze eerlijk vast.
- Voor een private repository zijn mogelijkheden voor branchbescherming plan-afhankelijk. Verifieer dat de regels daadwerkelijk afdwingbaar zijn; als dat niet kan, noteer de beperking en gebruik voorlopig een menselijke mergeprocedure. [GitHub-documentatie](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- CI krijgt alleen `contents: read`, geen productiesleutels en geen productie-write. Draai checks op pull_request; gebruik geen pull_request_target om willekeurige PR-code met secrets uit te voeren.
- Preview en productie krijgen gescheiden instellingen. Een groene documentatiecheck is geen bewijs dat checkout of voorraad veilig werkt.

Deze maatregelen zijn een beoogde werkwijze; de actuele uitvoeringsstatus staat in ACCESS.md.
