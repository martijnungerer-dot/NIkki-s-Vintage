# Smaakprofiel: plan, onderdelen en wie wat doet

Vastgelegd op 10 november 2026, op verzoek van Martijn. Doel: de selectie, volgorde en hoofdfoto in de boetiek afstemmen op de smaak van een bezoeker. Dat gebeurt zonder login en privacyvriendelijk, met een AI-aanroep alleen via een eigen server. Elk stuk is uniek en kan morgen weg zijn. Daarom leren we geen voorkeur voor stukken, maar voor **kenmerken**.

Codex begon hieraan en stopte op zijn limiet; Claude Code heeft het opgepakt. Merge en release blijven bij Martijn. Losse onderdelen volgen [FRONTEND-PLAN.md](FRONTEND-PLAN.md): één bestand per onderdeel, één eigenaar.

## Waar het profiel op rust

Nikki vult per stuk deze publieke velden in en controleert ze (contract in `supabase/migrations/…_catalog.sql`): materiaal, model (silhouet/kraag), kleur, lengte, pasvorm, periode, bijzonderheden, bontklasse en prijs. Dat zijn de kenmerkdimensies. Er wordt **niets uit foto's afgeleid** en er komen geen nieuwe claims bij.

- Conditiewoorden zoals Vlek, Reparatie en Kale plek zijn geen smaak en tellen niet mee. Periode "Onbekend" ook niet.
- De prijs telt mee als prijsklasse (tot €100, €100–200, €200–350, €350–600, vanaf €600).
- Sleutels hebben de vorm `kleur:zwart`, in het datamodel `colour:zwart`. Zie `app/taste/types.d.ts`.

## Ontwerpkeuzes

| Signaal | Gewicht | Verval |
|---|---|---|
| Expliciete keuze (zoeken/vermijden, maximaal budget) | ±1 in de samenvatting, wint altijd | Geen |
| Meer / minder zoals dit | ±1 per kenmerk | Halveert per 30 dagen |
| Hartje | +0,5 | Halveert per 30 dagen |
| In winkelmand | +0,4 | Halveert per 30 dagen |
| Kijktijd / veegsnelheid | 0 (wordt aangenomen, nog niet meegewogen) | — |

- Een hartje of mand terugdraaien haalt de bonus weg, maar maakt geen afkeer.
- Geleerde gewichten blijven tussen −3 en 3. Er worden hoogstens 60 kenmerken bewaard. De samenvatting voor de server bevat hoogstens 12 voorkeuren en 12 afkeren.
- **Privacy:** het profiel staat alleen in `localStorage` (`nikki-taste`). Er staan geen stuk-ID's, foto's of persoonsgegevens in. Staat personalisatie uit, dan wordt er niets geleerd. Wissen laat de uit-stand staan.
- **Stabiel:** de volgorde wordt bepaald bij het begin van een sessie of na een expliciete keuze. Tijdens het bladeren blijft alles op zijn plek; nieuwe stukken komen achteraan (`stableOrder`).
- **Lokaal eerst:** `ranking.js` rangschikt zonder AI, voorspelbaar en zonder kosten. Bij gelijke score houdt het Nikki's volgorde. Dit is ook de terugval als de AI niet antwoordt. Misschien is lokaal al genoeg; dat moet de A/B-test uitwijzen.
- **Guardrails bij de AI:**
  - De server haalt zelf de gepubliceerde stukken op en filtert op budget en status vóór de aanroep.
  - De AI ziet geen prijzen of echte ID's, alleen `c1`, `c2`, … met kenmerken en fotorollen.
  - Het antwoord wordt teruggebracht tot een volgorde, een **bestaande** fotorol van dat stuk en optioneel een korte uitleg. Daarin mogen geen cijfers, prijzen of links staan.
  - Verzonnen of dubbele stukken vallen weg; ontbrekende stukken komen er lokaal bij. De AI kan niets wijzigen.
  - Hoogstens 40 kandidaten per aanroep. Temperatuur 0.

## Onderdelen

| | Onderdeel | Bestanden | Status en eigenaar |
|---|---|---|---|
| 1 | **Datamodel** `TasteProfile`, opslag, schoonmaak, verval | `app/taste/types.d.ts`, `app/taste/profile.js` | **Klaar** (Claude Code, deze sessie) |
| 2 | **Signaalverwerking** en lokale rangschikking | `app/taste/aggregate.js`, `app/taste/ranking.js` | **Klaar** (deze sessie) |
| 3 | **Payload, systeemprompt en controle** van het AI-antwoord | `supabase/functions/personalise/prompt.mjs` | **Klaar als pure functies** (deze sessie). Niet uitgerold. |
| 3b | Kernaansluiting: extra publieke velden in de winkelcatalogus en `NikkiShop.onSignal` | `app/store-extension.js` | **Klaar** (deze sessie). De winkel gedraagt zich nog hetzelfde. |
| 4 | **Venster "Mijn smaak"** (inzien, aanpassen, wissen, uitzetten) en het leren koppelen | `app/store-screens/taste.js` (blauwdruk), `tests/storefront-taste.cjs` | **Volgende Claude Code-sessie.** Opdracht hieronder. |
| 5 | Winkel herordenen met de stabiele sessievolgorde; eventueel een andere hoofdfoto | nieuw bestand in `app/store-screens/` | **Wacht op Martijn**: verandert wat bezoekers zien |
| 6 | Server-proxy: handler (herkomst, grootte, limiet per bezoeker/dag, Gemini), migratie voor quota | `supabase/functions/personalise/handler.mjs`, `index.ts` | **Wacht op Martijn**: openbaar betaald eindpunt zonder login (kosten, misbruik) |
| 7 | A/B-test: gepersonaliseerd tegenover Nikki's volgorde | — | **Wacht op besluit**: er wordt nu niets gemeten |

Getest in `tests/taste.test.mjs` (14 tests, onderdeel van `npm test`). De browsermodules draaien in de test precies zoals in de winkel. Ook bewaakt: dezelfde kenmerken in browser en server, geen privévelden of ID's in profiel en payload, verval, de uit-stand, gemanipuleerde opslag, budget- en statusfilter, de kandidaatgrens en de controle van het AI-antwoord. De browsertest controleert de signalen in de echte winkel, en dat er nog niets wordt opgeslagen. TypeScript-controle: `npx -p typescript@5.6.3 tsc --noEmit --allowJs --checkJs --target es2022 --lib es2022,dom app/taste/*.js app/taste/types.d.ts` gaf geen fouten. TypeScript is geen projectafhankelijkheid.

## Opdracht voor de volgende Claude Code-sessie (onderdeel 4)

Kopieer dit als startbericht:

> Lees AGENTS.md, docs/SMAAKPROFIEL.md, `app/taste/types.d.ts` en de blauwdruk in `app/store-screens/taste.js`. Begin op de nieuwste `main` met een eigen branch. Bouw onderdeel 4: het venster "Mijn smaak" en het leren via `NikkiShop.onSignal`, alleen in `app/store-screens/taste.js`, met een eigen test `tests/storefront-taste.cjs`. Wijzig `app/taste/*` en `app/store-extension.js` niet; als het contract tekortschiet, stop dan en beschrijf wat nodig is. Nog geen herordening van de winkel en geen AI-aanroep. Stel de menuplek als vraag in de PR, met beelden op 390 en 320 px naast optie B.

## Vragen voor Martijn

1. **Menuplek** voor "Mijn smaak": een vierde regel in het Shop-menu, of een icoon in Mijn items? Optie B heeft nu drie regels.
2. **Meer / minder zoals dit**: optie B heeft daar geen knoppen voor. Waar mogen ze komen, zonder tekst over de foto? Tot die tijd leert het profiel van hartjes en de mand.
3. **Hoofdfoto**: mag de boetiek een andere foto van een stuk eerst tonen dan Nikki's hoofdfoto? Standaard niet.
4. **AI of lokaal**: een openbaar AI-eindpunt kost geld per bezoek en vraagt misbruikbeperking. Voorstel: eerst lokaal (onderdeel 5) en meten, AI pas daarna.
5. **Zoekfilters in Collectie**: nu tellen ze niet als voorkeur, omdat een eenmalige zoekopdracht geen smaak is. Akkoord?
6. **Meten en toestemming**: voor de A/B-test zijn gebeurtenissen nodig (hartjes, mand, later bestellingen en retouren). Kies eerst waar en hoe anoniem. Laat ook nagaan of het lokale profiel en het meten een melding of toestemming vragen. Dit plan is geen juridische beoordeling.
