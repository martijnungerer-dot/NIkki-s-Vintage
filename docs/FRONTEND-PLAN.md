# Frontendplan: losse onderdelen en wie wat doet

Vastgelegd op 10 november 2026. Uitgangspunt is de goedgekeurde cloudwinkel op `main` (`app/`, ontwerpbron `concept/ontdekken-optie-b.html`). De open punten komen uit [FUNCTIONALITEIT.md](FUNCTIONALITEIT.md). Dit plan begon in een Codex-sessie die halverwege stopte; Claude Code heeft het afgemaakt. Merge en release blijven bij Martijn.

## Hoofdspoor: smaakprofiel

Het belangrijkste frontendwerk is het smaakprofiel: selectie, volgorde en hoofdfoto afstemmen op kenmerkvoorkeuren, zonder login. Plan, onderdelen en eigenaars staan in [SMAAKPROFIEL.md](SMAAKPROFIEL.md). De pure onderdelen 1–3 zijn klaar in `app/taste/` en `supabase/functions/personalise/`. Het venster "Mijn smaak" (onderdeel 4) is voor de volgende Claude Code-sessie. De onderdelen hieronder (A–G) zijn kleinere, losstaande winkelverbeteringen.

## Waarom losse bestanden

Tot nu toe stond de hele winkel in één bestand, `app/store-extension.js`. Twee agents konden daardoor niet tegelijk aan verschillende onderdelen werken zonder elkaars regels te raken. Daarom is er een kleine aansluiting:

| Bestand | Inhoud | Wie mag het wijzigen |
|---|---|---|
| `app/store-extension.js` | Kern: hoofdwinkel, Collectie, Mijn items, catalogus (`NikkiStore`) en onderaan het contract `window.NikkiShop` | Alleen in een eigen kleine PR, als het contract moet veranderen. Meld dat in de PR. |
| `app/taste/*.js` | Smaakprofiel: pure functies zonder DOM, beschikbaar als `window.NikkiTaste` (zie [SMAAKPROFIEL.md](SMAAKPROFIEL.md)) | De eigenaar van het smaakprofiel; contractwijzigingen apart. |
| `app/store-screens/*.js` | Eén onderdeel per bestand. De build voegt ze in alfabetische volgorde achter de kern toe, in hetzelfde script. | De eigenaar van dat onderdeel (tabel hieronder). |
| `app/store-layout.css` | Gedeelde stijl, met per onderdeel een eigen blok met kopregel | Alleen het eigen blok. |
| `tests/storefront-<onderdeel>.cjs` | Browsertest per onderdeel, aangeroepen vanuit `tests/storefront-layout.cjs` | De eigenaar van dat onderdeel. |

### Contract `window.NikkiShop`

- `registerScreen(naam, {render(api), action(act, knop, api)})`: een venster uit het Shop-menu. `render` geeft de inhoud onder de gedeelde kopregel terug; `action` krijgt de `data-act`-klikken in dat venster.
- `onCatalog(fn)`: wordt na elke catalogusvernieuwing aangeroepen (eerste keer laden en verversen).
- `onSignal(fn)`: wordt aangeroepen bij hartje, hartje weg, in mand en uit mand, met een kopie van alleen de publieke velden. Zoekfilters zenden niets (geen smaak). Een fout in een luisteraar breekt de winkel niet.
- `api.personalise({order, lead, fromStart})`: persoonlijke volgorde en hoofdfoto per stuk; het stuk in beeld blijft staan (zie [SMAAKPROFIEL.md](SMAAKPROFIEL.md)).
- `api`: `items()`, `publicCopy(item)`, `current()`, `cartKeys()`, `toggleCart(key, waarde)`, `isLiked(item)`, `show(key)`, `refresh()`, `status(tekst, toestand)`, plus de bestaande helpers `esc`, `face`, `CLOSE`, `bagIcon`, `heartIcon`.
- Alleen publieke catalogusvelden zijn bereikbaar (dezelfde projectie als in `NikkiStore.replace`). Geen privévelden, tokens of schrijfacties naar Supabase.

## Onderdelen

| | Onderdeel | Bestand | Status en eigenaar |
|---|---|---|---|
| A | **Winkelmand-overzicht**: regels uit optie B met foto, naam, prijs en verwijderen, plus het totaal. De knop heet Betalen en doorloopt een voorbeeldbetaling zonder betaling of reservering (Martijn, 10 november). Een stuk waarvan de foto tijdelijk niet laadt, blijft in de mand en wordt als "tijdelijk niet te zien" gemeld. | `app/store-screens/cart.js`, `tests/storefront-cart.cjs` | **Klaar in deze PR** (Claude Code, deze sessie, overgenomen van Codex). [Beelden](screenshots/winkelmand/README.md) |
| B | **Delen en stuklinks**: één tik op het deelicoon opent het deelmenu van de telefoon, anders wordt de link gekopieerd en staat er kort een vinkje in het icoon. Een link (`#stuk=<id>`) opent dat stuk. | `app/store-screens/share.js`, `tests/storefront-share.cjs` | **Klaar** (Claude Code, 11 november). [Beelden](screenshots/delen/README.md) |
| C | ~~Paneelmarges op lage schermen~~ **Vervalt** (Martijn: zo dicht mogelijk bij het artefact blijven): in `app/store-layout.css` winnen de algemene `.info`/`.cart`-regels van de regels voor schermen lager dan 760 px. | `app/store-layout.css` | Niet aanpassen. |
| D | Klantaccount voor bezoekers | — | Later (Martijn): eerst een werkende app testen. |
| E | Hartjes op meerdere apparaten of tabbladen | — | Later (Martijn). |
| F | Echte betaling en reservering | — | Later (Martijn): eerst het werkende model met Nikki en anderen testen. Nu alleen de voorbeeldbetaling. |
| G | Persoonlijke pasvorm en meldingen | — | Later. Smaak loopt via [SMAAKPROFIEL.md](SMAAKPROFIEL.md). |

A is klaar, B kan na het smaakprofiel. D tot en met G komen pas na de test met Nikki en anderen.

## Opdracht voor de volgende Claude Code-sessie (onderdeel B)

Kopieer dit als startbericht:

> Lees AGENTS.md, docs/FRONTEND-PLAN.md en `app/store-screens/share.js`. Begin op de nieuwste `main` met een eigen branch. Bouw onderdeel B, Delen en stuklinks, alleen in `app/store-screens/share.js` en een eigen test `tests/storefront-share.cjs` (aanroepen vanuit `tests/storefront-layout.cjs`). Wijzig `app/store-extension.js` niet; als het contract echt tekortschiet, stop dan en beschrijf wat nodig is. Lever een kleine PR met beelden op 390 en 320 px naast optie B, en vermeld wat niet getest is.

Regels voor B, ook te lezen in het startbestand:

- De link bevat alleen de permanente stuk-ID, nooit een getekende fotolink of token.
- Een onbekend, verkocht of ongeldig stuk in de link toont gewoon de winkel. Geen foutscherm en geen voorbeeldstuk.
- De winkel draait in een iframe (`app/main.js`). De link hoort bij de buitenpagina; test dat expliciet.
- Het deelicoon blijft op dezelfde plek, minstens 44 px, zonder tekst over de foto.
- **Besloten door Martijn:** na kopiëren kort een vinkje in hetzelfde icoon, zonder tekst. Het delen mag ook eenvoudiger: één tik opent het deelmenu van de telefoon, anders wordt de link gekopieerd.

## Werkafspraken

- Eén agent per onderdeel en per checkout. Werk niet tegelijk in hetzelfde bestand.
- Elk onderdeel komt in een eigen kleine PR met beelden op 390 en 320 px naast optie B, en tests voor publiek/privé, unieke voorraad (de mand reserveert niets) en foutafhandeling.
- Na een merge van een ander onderdeel: haal `main` op en test je eigen onderdeel opnieuw.
- Werk na afronding de tabel hierboven bij, en zet een regel in [STATUS.md](STATUS.md).


## Zoeken als gesprek

Opdracht en goedkeuring van Martijn, 17 november 2026. De ontwerpbron is [de zoekmock](../concept/zoeken-gesprek.html), met bovenbalk B: GSF-embleem naast de naam, zoekbalk eronder, Hulp bij zoeken rechtsboven. Dit zijn expliciet goedgekeurde afwijkingen van optie B. Foto, naam/prijs, onderrij met vier vakjes, Shop-menu en bestaande winkelonderdelen blijven behouden. Op lage telefoons neemt de zoekbalk ruimte van de foto in.

De zoekervaring gebruikt dezelfde publieke NikkiStore-catalogus, dezelfde woordzoekfunctie als Collectie en een tijdelijke selectie voor de grote foto en onderrij. Het kruisje herstelt de volledige catalogus. Zoeken schrijft geen smaakvoorkeuren, mand, voorraad of productgegevens. Een catalogusvernieuwing mag verkochte of ingetrokken stukken niet terugbrengen in de zoekresultaten en behoudt de geselecteerde foto en geopende winkelpanelen.

- Telefoon: één zin en hooguit één rij knoppen onder de zoekbalk; bladeren klapt de strook in. Een tik op de zin opent het gesprek als paneel vanuit de strook. Verkleinen, Escape, terug of een gevonden stuk sluiten het paneel; focus keert naar de strook terug.
- Laptop vanaf 900 px: gesprek links naast de winkel, met een raster van gevonden stukken.
- Hulpstanden: Uit, Zakelijk, Gewoon (standaard), Meer uitleg. Alleen deze keuze wordt onthouden, met een terugval wanneer lokale opslag niet werkt. Uit gebruikt uitsluitend de bestaande woordzoekfunctie en heeft geen gesprekskolom of zoekserveraanroep.
- De openbare functie `zoek` interpreteert de vraag; alleen de server past filters op de gepubliceerde catalogus toe. Reacties bevatten geen ongecontroleerde modelclaims. Maten zijn plat gemeten borstbreedtes in cm, met ±2 cm vergelijking en uitsluitend op verzoek; geen lichaamsmaten of pasgarantie.
- Bij ontbrekende functie, quotum-, Gemini- of netwerkfouten blijft woordzoeken beschikbaar met een rustige melding. Gesprekken worden niet op de server opgeslagen; alleen de laatste zes korte beurten gaan mee als context.

Uitbreiding van het bestaande NikkiShop-contract: `searchWords(query)` deelt de Collectie-zoeklogica; `filterSearch(ids, refresh)` selecteert de zichtbare stukken zonder de catalogus te vervangen; `visibleItems()` geeft die selectie. `items()` blijft de volledige catalogus teruggeven voor winkelmand en favorieten. Zoeksignalen worden niet aan het smaakprofiel doorgegeven.

Spraak/golfjes zijn in deze uitvoering weggelaten; typen en verfijnknoppen zijn de invoerroutes. Uitrol en terugdraaien staan in [LIVEGANG.md](LIVEGANG.md#zoeken-als-gesprek-uitrollen).
