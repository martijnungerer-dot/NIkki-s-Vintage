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
- **Fotoanalyse bij het invoeren** (`analyse`) mag een sterker model gebruiken via `GEMINI_MODEL`. Zonder `PERSONALISE_MODEL` gebruiken beide functies `GEMINI_MODEL`.
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
| `ALLOWED_ORIGINS` | `https://nikki-s-vintage.martijnungerer.workers.dev`, eventueel gevolgd door `,http://localhost:4173` voor lokaal testen |

`SUPABASE_URL` en de serversleutel levert Supabase zelf.

## 4. Uitrollen

Op je eigen computer, in de projectmap:

```sh
npx supabase login
npx supabase link --project-ref naxjrskfdedwvoeltigs
npx supabase db push --remote
npx supabase functions deploy personalise
```

Zonder `--remote` richt de huidige Supabase-CLI zich op een lokale database en stopt met `ECONNREFUSED 127.0.0.1:54322`. In Windows PowerShell gebruik je `npx.cmd` en `npm.cmd` in plaats van `npx` en `npm`, omdat de scripts daarachter standaard geblokkeerd zijn.

`db push` voegt de tabel voor de daglimiet toe (`personalise_usage`). Bestaande stukken en rechten veranderen niet.

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
| Werkt, maar zonder Gemini (terugval) | Open Supabase → Edge Functions → personalise → Logs en zoek de regel `personalise fallback: …`. `NO_KEY`: secret `GEMINI_API_KEY` ontbreekt. `BAD_MODEL_NAME`: de modelnaam moet beginnen met `gemini-`. `HTTP_400`/`HTTP_403`: sleutel of project geweigerd. `HTTP_404 NOT_FOUND`: model bestaat niet voor deze sleutel. `HTTP_429`: limiet van Google bereikt. `EMPTY MAX_TOKENS` of `NOT_JSON`: het model gaf geen bruikbaar antwoord. `TIMEOUT`: Gemini antwoordde niet binnen 20 seconden. |
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
