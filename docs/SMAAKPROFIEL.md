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
- **AI rangschikt, lokaal vangt op:** Martijn heeft gekozen voor AI (zie Besluiten). `ranking.js` is alleen de terugval als de AI niet antwoordt of nog niet is ingesteld, en vult stukken aan die de AI overslaat. Bij gelijke score houdt het Nikki's volgorde.
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
| 2 | **Signaalverwerking** en lokale terugval-rangschikking | `app/taste/aggregate.js`, `app/taste/ranking.js` | **Klaar** (deze sessie) |
| 3 | **Payload, systeemprompt en controle** van het AI-antwoord | `supabase/functions/personalise/prompt.mjs` | **Klaar als pure functies** (deze sessie) |
| 3b | Kernaansluiting: extra publieke velden en `NikkiShop.onSignal` | `app/store-extension.js` | **Klaar** (deze sessie) |
| 4 | **Venster "Mijn smaak"** in het Shop-menu, leren, en de knoppen **meer/minder zoals dit** in de foto | `app/store-screens/taste.js` (blauwdruk), `tests/storefront-taste.cjs` | **Volgende Claude Code-sessie.** Opdracht hieronder. |
| 5 | **Server-proxy** `personalise`: herkomst, grootte, limiet per bezoeker per dag, catalogus ophalen, Gemini-aanroep met `prompt.mjs`, terugval bij storing | `supabase/functions/personalise/handler.mjs`, `index.ts`, migratie `20261110210000_personalise_usage.sql` | **Klaar** (Claude Code). Getest met nagebootste diensten. Live na uitrol door Martijn ([SUPABASE-START.md](SUPABASE-START.md), stap 6). |
| 6 | **Winkel herordenen** met de AI-volgorde, en per stuk de **hoofdfoto** die bij de bezoeker past | `app/store-screens/personalise.js`, `api.personalise` in de kern, `NikkiApp.personalise` in `app/main.js` | **Klaar** (Claude Code). Werkt zodra er een profiel is, dus na onderdeel 4. |
| 7 | Meten (A/B: gepersonaliseerd tegenover Nikki's volgorde) | — | Later, vóór de test met Nikki en anderen (zie Besluiten, punt 8) |

Getest in `tests/taste.test.mjs` (14 tests, onderdeel van `npm test`). De browsermodules draaien in de test precies zoals in de winkel. Ook bewaakt: dezelfde kenmerken in browser en server, geen privévelden of ID's in profiel en payload, verval, de uit-stand, gemanipuleerde opslag, budget- en statusfilter, de kandidaatgrens en de controle van het AI-antwoord. De browsertest controleert de signalen in de echte winkel, en dat er nog niets wordt opgeslagen. TypeScript-controle: `npx -p typescript@5.6.3 tsc --noEmit --allowJs --checkJs --target es2022 --lib es2022,dom app/taste/*.js app/taste/types.d.ts` gaf geen fouten. TypeScript is geen projectafhankelijkheid.

## Hoe de persoonlijke volgorde werkt (onderdelen 5 en 6)

1. Bij het openen van de boetiek, alleen als de bezoeker een smaakprofiel heeft: meteen de lokale rangschikking. De winkel opent dus op het best passende stuk, zonder wachten en zonder verspringen.
2. Eén aanroep naar de serverfunctie met alleen de compacte samenvatting. Die leest zelf de gepubliceerde stukken, filtert op budget en vraagt Gemini om een volgorde en een fotorol per stuk.
3. Het antwoord geldt voor alles **na** het stuk in beeld. Wat de bezoeker al zag, blijft staan. Per stuk wordt de gekozen foto als eerste getoond, als dat stuk zo'n foto heeft.
4. Tijdens de sessie blijft die volgorde staan, ook na herladen, zonder nieuwe aanroep. Een nieuwe volgorde komt bij een nieuwe sessie, of als "Mijn smaak" `NikkiPersonalise.refresh()` aanroept na een expliciete keuze.
5. Zonder profiel of met personalisatie uit: Nikki's volgorde. Bij een storing blijft de lokale volgorde staan.

Collectie gebruikt dezelfde persoonlijke volgorde (sortering "Boetiek"). Stukken die de server weglaat, zoals stukken boven het budget, komen achteraan in Nikki's volgorde. De korte uitleg "waarom past dit bij jou" zit al in de server (`want_rationale`), maar wordt nog nergens getoond. Waar die komt, is een ontwerpvraag.

## Opdracht voor de volgende Claude Code-sessie (onderdeel 4)

Kopieer dit als startbericht (pas nadat PR #24 is gemerged):

> Lees AGENTS.md, docs/SMAAKPROFIEL.md (vooral "Besluiten"), `app/taste/types.d.ts` en de blauwdruk in `app/store-screens/taste.js`. Begin op de nieuwste `main` met een eigen branch. Bouw onderdeel 4: het venster "Mijn smaak" als vierde regel in het Shop-menu, het leren via `NikkiShop.onSignal`, en de knoppen meer/minder zoals dit in de foto, aan de andere kant dan het hartje. Werk alleen in `app/store-screens/taste.js`, een eigen blok in `app/store-layout.css`, het menu-anker in `scripts/build-cloud.mjs` en een eigen test `tests/storefront-taste.cjs`. Wijzig `app/taste/*` en `app/store-extension.js` niet; als het contract tekortschiet, stop dan en beschrijf wat nodig is. Herordenen en de AI-aanroep zijn al gebouwd (onderdelen 5 en 6, `app/store-screens/personalise.js`); roep na een expliciete keuze of aan/uit alleen `window.NikkiPersonalise.refresh()` aan en wijzig dat bestand niet. Lever een PR met beelden op 390 en 320 px naast optie B.

## Besluiten van Martijn (10 november 2026)

1. **Merge:** winkelmand en smaakprofiel blijven allebei in PR #24.
2. **"Mijn smaak"** komt als regel in het Shop-menu. Alles erin vult zich door de keuzes van de bezoeker: niets voorgevuld, geen redactionele lijst. De bezoeker kan alles in één keer wissen, of één kenmerk tegelijk.
3. **Zoekfilters in Collectie** tellen niet als voorkeur.
4. **AI, zeker.** Geen tijd steken in een rangschikking zonder AI; de lokale rangschikking blijft alleen als terugval.
5. **De winkel moet herordenen op smaak.** De ervaring sluit aan op de smaak van de koper, niet op die van de verkoper. Alles wat Nikki aanbiedt wordt geordend naar wat deze bezoeker interessant vindt. Nikki's volgorde geldt alleen zonder profiel of met personalisatie uit.
6. **Meer / minder zoals dit:** in de foto, aan de andere kant dan het hartje. Iconen zonder tekst, minstens 44 px.
7. **Hoofdfoto per bezoeker: ja.** Wie steeds "meer zoals dit" zegt bij kragen, mag als eerste de detailfoto van de kraag zien. Alleen bestaande foto's van dat stuk; Nikki's hoofdfoto blijft de standaard.
8. **Meten en toestemming:** niet urgent. Wel regelen vóór Nikki en andere testers de app gebruiken. Tot die tijd wordt niets gemeten of verstuurd buiten de AI-aanroep.
9. **Winkelplatform, klantaccount en hartjes op meerdere apparaten:** later. Eerst een werkend model met API's, database en website, getest door Nikki en anderen.
10. **Delen:** een kort vinkje in het deelicoon na kopiëren. Het delen zelf mag eenvoudiger (onderdeel B in FRONTEND-PLAN.md).
11. **Zo dicht mogelijk bij het artefact van optie B blijven.** Daarom geen CSS-wijziging aan de paneelmarges (onderdeel C vervalt).
12. **Namen:** "Mijn favorieten" in plaats van "Mijn items", "Betalen" in plaats van "Afrekenen". Betalen doorloopt een voorbeeldbetaling: er wordt niets betaald of gereserveerd.

Nog open, voor later: hoe anoniem het meten moet en of het een melding of toestemming vraagt. Laat dat nagaan; dit plan is geen juridische beoordeling.
