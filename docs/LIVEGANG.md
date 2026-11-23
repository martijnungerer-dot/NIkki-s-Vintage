# Livegang: smaakprofiel en AI-volgorde

Stappenlijst voor Martijn om de serverfunctie `personalise` live te zetten en te controleren. Vastgelegd op 11 november 2026. Achtergrond: [SMAAKPROFIEL.md](SMAAKPROFIEL.md). Algemene Supabase-uitleg: [SUPABASE-START.md](SUPABASE-START.md), stap 6.

**Stand nu:** de code staat op `main`. Cloudflare bouwt `main` automatisch naar de website. Niet gecontroleerd vanuit de agentomgeving: het netwerk daar laat de website en Supabase niet toe. De migratie en de serverfunctie zijn nog **niet** uitgerold, en Gemini is nog niet aangesloten. Tot die tijd gebruikt de winkel de lokale volgorde. Zonder smaakprofiel ("Mijn smaak", PR #27 van Codex) verandert er voor bezoekers sowieso niets.

## 1. Gemini-sleutel en budget

1. Maak in [Google AI Studio](https://aistudio.google.com/api-keys) een API-sleutel. Een Gemini-chatabonnement is geen API-tegoed.
2. Stel in Google Cloud onder **Billing → Budgets & alerts** een budget met meldingen in, bijvoorbeeld €20 per maand voor de testfase.
3. Deel de sleutel nooit in een chat, in Git of in een screenshot.

## 2. Model kiezen

Rangschikken is een eenvoudige taak met kleine aanvragen, dus een goedkoop en snel model volstaat.

- **Advies voor de smaakfunctie:** een Flash-Lite-model van de nieuwste generatie, zoals Gemini 3.5 Flash-Lite. Zet de exacte naam uit AI Studio in `PERSONALISE_MODEL`.
- **Fotoanalyse bij het invoeren** (`analyse`) mag een sterker model gebruiken via `GEMINI_MODEL`. Zonder `PERSONALISE_MODEL` gebruiken beide functies `GEMINI_MODEL`. Met `ANALYSE_MODEL` kies je een apart model alleen voor de fotoanalyse, bijvoorbeeld een Flash-Lite-model als het sterkere model te traag is.
- **Vrije zinnen in Nieuw stuk** (`begrijp`): korte tekst, dus een snel model is genoeg. Met `BEGRIJP_MODEL` kies je er een, bijvoorbeeld hetzelfde Flash-Lite-model als `PERSONALISE_MODEL`; zonder `BEGRIJP_MODEL` gebruikt de functie `GEMINI_MODEL`. Een aanvraag is een paar honderd tokens: met Flash-Lite een fractie van een cent. Daglimiet: 300 per beheerder en 600 in totaal.
- **Gezien op 14 november 2026:** `gemini-3.8-flash` was op de gratis tier te traag voor de smaakfunctie (`TIMEOUT` na 40 seconden); `gemini-3.5-flash-lite` als `PERSONALISE_MODEL` werkt.
- Gebruik geen model waarvan AI Studio meldt dat het wordt uitgefaseerd.

**Kostenschatting**, op basis van de prijslijst van Google in november 2026; controleer [de actuele prijzen](https://ai.google.dev/gemini-api/docs/pricing):
- Eén aanvraag met 40 stukken is ongeveer 3500 tokens heen en 500 tokens antwoord, plus de denkstappen van het model.
- Met 3.5 Flash-Lite ($0,30 per miljoen tokens heen, $2,50 terug) is dat ongeveer **$0,005 per aanvraag**.
- Een bezoeker doet één aanvraag per bezoek.
- Het slechtste geval is de daglimiet van 2000 aanvragen: ongeveer $10–12 per dag. Een aanvraag zonder voorkeuren kost niets.
- Wil je in de testfase een lagere totale daglimiet? Dat is een kleine migratie; vraag het aan een agent.

## 3. Secrets in Supabase

Zet onder **Edge Functions → Secrets**:

| Naam | Waarde |
|---|---|
| `GEMINI_API_KEY` | De Gemini-sleutel |
| `GEMINI_MODEL` | Het model voor fotoanalyse |
| `PERSONALISE_MODEL` | Optioneel: het goedkopere model voor de smaakfunctie |
| `ANALYSE_MODEL` | Optioneel: een apart model alleen voor de fotoanalyse |
| `BEGRIJP_MODEL` | Optioneel: een snel model voor vrije zinnen in Nieuw stuk |
| `ALLOWED_ORIGINS` | `https://nikki-s-vintage.martijnungerer.workers.dev`, eventueel gevolgd door `,http://localhost:4173` voor lokaal testen |

`SUPABASE_URL` en de serversleutel levert Supabase zelf.

## 4. Uitrollen

Op je eigen computer, in de projectmap:

```sh
npx supabase login
npx supabase link --project-ref naxjrskfdedwvoeltigs
npx supabase db push --remote
npx supabase functions deploy personalise
npx supabase functions deploy analyse
npx supabase functions deploy begrijp
```

Zonder `--remote` richt de huidige Supabase-CLI zich op een lokale database en stopt met `ECONNREFUSED 127.0.0.1:54322`. In Windows PowerShell gebruik je `npx.cmd` en `npm.cmd` in plaats van `npx` en `npm`, omdat de scripts daarachter standaard geblokkeerd zijn.

`db push` voegt de tabel voor de daglimiet toe (`personalise_usage`) en de daglimiet voor vrije zinnen (`consume_understanding`). Bestaande stukken en rechten veranderen niet. `analyse` opnieuw uitrollen is nodig voor de openingszin van Gemini; `begrijp` is nieuw. Zonder `begrijp` werkt Nieuw stuk gewoon, maar dan begrijpt het alleen losse woorden.

## 5. Controleren

```sh
npm ci
npm run check:live
```

Het script gebruikt alleen de publieke gegevens uit `app/config.js` en kost één aanvraag van de daglimiet. Verwachte uitkomst: alleen `OK`-regels, met als laatste "Gemini rangschikt: … stukken". Een andere website kun je controleren met `node scripts/check-live.mjs --site https://…`.

| Melding | Oplossing |
|---|---|
| Website niet bereikbaar | Kijk in Cloudflare of de laatste build van `main` geslaagd is. |
| Supabase niet bereikbaar | Controleer je internetverbinding en de URL in `app/config.js`. |
| Niet-publieke velden zichtbaar / niet-gepubliceerde stukken leesbaar | **Stop.** Maak de site niet bekend en laat een agent de rechten nakijken. |
| Smaakfunctie niet gevonden | `npx supabase functions deploy personalise` |
| Staat het adres niet toe | Zet het exacte website-adres in `ALLOWED_ORIGINS`. |
| Geeft geen volgorde, of mist serversleutel | `npx supabase db push --remote`; kijk de logs na onder Edge Functions → personalise. |
| Werkt, maar zonder Gemini (terugval) | Open Supabase → Edge Functions → personalise → Logs en zoek de regel `personalise fallback: …`. `NO_KEY`: secret `GEMINI_API_KEY` ontbreekt. `BAD_MODEL_NAME`: de modelnaam moet beginnen met `gemini-`. `HTTP_400`/`HTTP_403`: sleutel of project geweigerd. `HTTP_404 NOT_FOUND`: model bestaat niet voor deze sleutel. `HTTP_429`: limiet van Google bereikt. `EMPTY MAX_TOKENS` of `NOT_JSON`: het model gaf geen bruikbaar antwoord. `TIMEOUT`: Gemini antwoordde niet binnen 40 seconden; kies eventueel een sneller model met `PERSONALISE_MODEL`. |
| Fotoanalyse mislukt of duurt te lang | Open Supabase → Edge Functions → analyse → Logs en zoek `analyse failed: …`. Dezelfde codes als hierboven; bij `TIMEOUT` (90 seconden) kies je met `ANALYSE_MODEL` een sneller model. |
| Vrije zinnen worden niet begrepen | Nieuw stuk valt dan stil terug op losse woorden. Open Supabase → Edge Functions → begrijp → Logs en zoek `begrijp failed: …` (dezelfde codes). Geen logregels: rol `begrijp` uit en voer `db push --remote` uit. |
| Daglimiet bereikt | Wacht tot de volgende dag (UTC). |

## 6. Proef op je telefoon (na merge van "Mijn smaak")

1. Open de winkel, geef drie stukken met een gemeenschappelijk kenmerk een hartje en tik bij een ander stuk "minder zoals dit".
2. Kijk in "Mijn smaak" of die kenmerken er staan.
3. Sluit het tabblad en open de winkel in een nieuw tabblad (nieuwe sessie). De winkel opent nu op een passend stuk, en de volgende stukken volgen jouw smaak.
4. Zet personalisatie uit in "Mijn smaak". De winkel toont weer Nikki's volgorde.

## Kosten volgen en terugdraaien

- Gebruik per dag, in de SQL-editor van Supabase: `select day, calls from personalise_usage where scope='global' order by day desc;`
- Gemini direct stoppen: verwijder `GEMINI_API_KEY` of `PERSONALISE_MODEL`. De winkel krijgt dan de lokale volgorde.
- De functie helemaal weghalen: `npx supabase functions delete personalise`. De winkel valt dan terug op de lokale volgorde en blijft werken.


## Zoeken als gesprek uitrollen

Nieuwe openbare functie `zoek`, gebouwd op verzoek van Martijn. **Niet vanuit deze taak uitgerold; live Supabase/Gemini niet getest.** De winkel valt terug op woordzoeken zolang de functie of configuratie ontbreekt.

Na review en merge, in de projectmap op Windows:

```powershell
npx.cmd supabase db push --remote
npx.cmd supabase functions deploy zoek
```

Bekijk eerst welke migraties klaarstaan: `db push --remote` voert ook andere nog niet toegepaste migraties uit. De zoekmigratie `20261117090000_zoek_usage.sql` voegt uitsluitend eigen quotatellers en een serverfunctie toe; catalogus en verkoopvoorraad worden niet veranderd. De frontend volgt de bestaande releaseprocedure.

Configuratie in Supabase Edge Functions → Secrets:

- `ZOEK_MODEL` is optioneel: kies de exacte naam van een beschikbaar snel Flash-Lite-model. Zonder deze instelling gebruikt zoeken `PERSONALISE_MODEL`, anders `GEMINI_MODEL`.
- Bestaande `GEMINI_API_KEY` en `ALLOWED_ORIGINS` worden hergebruikt. Sta alleen de werkelijke winkelherkomsten toe; geen wildcard.
- Supabase levert `SUPABASE_URL` en de serversleutel. Geen sleutel in de browser toevoegen.

`verify_jwt = false` is bewust: bezoekers hoeven niet in te loggen. De handler controleert herkomst, invoer (maximaal 8 kB, vraag 300 tekens, zes contextbeurten), quotum vóór Gemini en de modeluitvoer. Er zijn maximaal 40 aanvragen per bezoeker en 2000 in totaal per UTC-dag. De bezoekersteller gebruikt dezelfde dagelijks wisselende HMAC-afgeleide als `personalise`; geen IP-adres of gesprek wordt opgeslagen. De tellers bevatten alleen dag, afgeleide sleutel en aantal aanvragen. Een herkomstcontrole is geen gebruikersauthenticatie; de totale daglimiet begrenst het verbruik.

Na uitrol handmatig controleren: alle vier hulpstanden, een normale vraag, nul resultaten, een vervolgvraag, een maatverzoek en terugval bij onbereikbare functie. Uit mag geen aanroep naar `zoek` doen. In de browser mogen alleen gevonden publieke stukken verschijnen. Controleer de functielogs op korte foutcodes; bezoekerstekst hoort daar niet in.

Terugdraaien: rol de eerdere frontendversie terug of verwijder alleen de functie `zoek`. De nieuwe frontend valt bij afwezigheid van de functie terug op woordzoeken. De quotatabel kan blijven bestaan; verwijder geen catalogusgegevens. Alleen `ZOEK_MODEL` weghalen schakelt AI niet uit, omdat de twee bestaande modelinstellingen als terugval dienen.

### Zoekfoutcodes

| Code | Betekenis / actie |
|---|---|
| `ORIGIN_DENIED`, `METHOD`, `BAD_INPUT` | Controleer herkomst, methode of invoercontract; geen Gemini-aanroep. |
| `NOT_CONFIGURED` | Controleer Supabase-configuratie, Gemini-sleutel en modelnaam. |
| `RATE_LIMIT` | Daglimiet bereikt; woordzoeken blijft beschikbaar. |
| `QUOTA_UNAVAILABLE` | Controleer of de zoekmigratie is toegepast. |
| `CATALOG_UNAVAILABLE`, `CATALOG_TOO_LARGE` | Catalogus kon niet volledig gelezen worden (grens 5000); geen gedeeltelijke resultaten aanbieden. |
| `GEMINI_FAILED`, `INVALID_RESULT` | Modelverzoek of modeluitvoer geweigerd; woordzoeken als terugval. |
| `TIMEOUT`, `UNAVAILABLE` | Tijdelijke netwerk-/dienstfout; woordzoeken als terugval. |

De handler logt uitsluitend `zoek:` met een vaste foutcode, nooit de vraag, context, modeltekst of catalogus.

## Feedback 19 november uitrollen

Na merge van de PR "Feedback Nikki 19 november". Cloudflare bouwt `main` direct; doe stap 1 en 2 meteen daarna. **Niet vanuit de agentomgeving uitgerold; live niet getest.**

1. **Database:** `npx supabase db push --remote`. Voegt alleen `20261122090000_more_photos_brand.sql` toe als de eerdere migraties al live zijn; controleer vooraf met `npx supabase migration list --linked` welke openstaan en voer niet blind andere uit. Effect: 16 foto's per stuk en het optionele veld `brand`. Bestaande stukken veranderen niet.
2. **Functie:** `npx supabase functions deploy analyse`. Effect: 16 foto's, foto-rollen en notitie, gerichte labelvragen, opnieuw proberen bij overbelasting en het reservemodel.
3. **Reservemodel (optioneel):** secret `ANALYSE_FALLBACK_MODEL` met een snel model, bijvoorbeeld `gemini-3.5-flash-lite`. Zonder deze secret gebruikt de functie `PERSONALISE_MODEL`; staat die ook niet, dan is er geen reservemodel (wel de tweede poging).
4. **Google:** maak in AI Studio een eigen project voor de winkel met betaling aan en een budgetwaarschuwing (bijvoorbeeld € 5 per maand), maak daar een nieuwe sleutel en zet die als `GEMINI_API_KEY`. Op betaald tegoed gebruikt Google de foto's niet voor training. Verwijder de oude sleutel pas als geen ander project hem nog gebruikt.
5. **Controleren:** Supabase → Edge Functions → analyse → Logs. `analyse retry: …` betekent dat de tweede poging of het reservemodel werd gebruikt; `analyse failed: …` dat alles mislukte. Laat Nikki op haar S24 de fotokiezer, 16 foto's en Laat Gemini kijken proberen.

**Uitgerold op 23 november 2026** (stap 1 en 2) via de Management API; stap 3 niet gezet (reservemodel valt terug op `PERSONALISE_MODEL`); stap 4: de bestaande sleutel staat op een project met betaling aan. Zie [STATUS.md](STATUS.md).

**Let op bij een volgende `db push`:** de migratie staat in de migratiegeschiedenis van Supabase als `20261123193322` in plaats van `20261122090000`. De CLI meldt dan een onbekende remote-versie. Herstel eerst, zonder de migratie opnieuw uit te voeren:

```
npx supabase migration repair --status reverted 20261123193322
npx supabase migration repair --status applied 20261122090000
```

Daarna laat `npx supabase migration list --linked` beide kanten gelijk zien.

Terugdraaien: de vorige versie van `analyse` opnieuw uitrollen kan altijd. De migratie is uitbreidend (ruimere grenzen, optioneel veld) en hoeft niet terug.
