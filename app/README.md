# Cloudpilot

Start met [de begeleide installatie](../docs/SUPABASE-START.md). Scope: gezamenlijke catalogus + handmatige publicatie + veilige optionele AI-voorstellen, zonder checkout. Supabase is de gekozen proefrichting na Martijns akkoord op 3 november 2026. De oorspronkelijke Airtable/Shopify-documenten beschrijven de eerdere architectuur en de latere verkoopfase; deze pilot synchroniseert niet met Airtable of Shopify.

## Onderdelen

| Onderdeel | Verantwoordelijkheid |
|---|---|
| `index.html`, `style.css` | Navigatie, inloggen en collectiebeheer |
| `main.js` | Verbindt invoer, catalogus en beheer |
| `api.js` | Sessies, REST-opslag, foto-overdracht en AI-aanroep |
| `images.js` | Foto verkleinen en metadata uit de upload verwijderen |
| `intake-extension.js` | Bestaande checklist hergebruiken, opgeslagen stuk openen |
| `store-extension.js` | Optie B bedienen met de publieke NikkiStore-catalogus; onderaan het contract `window.NikkiShop` voor losse onderdelen |
| `store-screens/*.js` | Eén winkelonderdeel per bestand (nu: `cart.js` Winkelmand, `share.js` startbestand Delen). Zie [frontendplan](../docs/FRONTEND-PLAN.md). |
| `store-layout.css` | Presentatiekader weglaten, veilige randen, vaste statusplek en lange verkooptekst |
| `config.js` | Alleen publieke Supabase-projectgegevens |
| `../supabase/migrations/` | Datacontract, gecontroleerde mutaties, daglimieten en expliciete toegangsrechten |
| `../supabase/functions/analyse/handler.mjs` | Auth-controle, aanvraaggrenzen, Gemini-aanroep en resultaatfilter |

`npm run build` herbouwt de zelfstandige demo voor het invoerscherm. Het winkelscherm gebruikt rechtstreeks de HTML en CSS van [Ontdekken, optie B](../concept/ontdekken-optie-b.html); alleen het voorbeeldscript wordt vervangen door `store-extension.js`. Geen voorbeeldstukken in de cloudbuild: gegevens komen via `Api.list()`, getekende fotolinks en `NikkiStore.replace()`. De build controleert zijn ankers en schrijft naar de genegeerde map `dist/cloud`. Geen bundler of runtime-JavaScript-CDN; Newsreader komt zoals in de referentie van Google Fonts, met Georgia als offline terugval.

Naam opent de bestaande verkooptekst en platte maten; ontbrekende maten blijven leeg. Ingevuld `material` wordt als Materiaal getoond; ingevuld `species` alleen als `furClass` Ja of Alleen kraag of rand is. Deze waarden worden veilig als tekst weergegeven, zonder afleiding.

Prijs wisselt de lokale selectie in `localStorage.nikki-cart` (alleen permanente UUID's, geen foto's of productkopieën). Hartjes gebruiken de bestaande `gsf-liked` met vaste `display_id`. `NikkiStore.replace(records, publishedIds)` krijgt naast stukken met bereikbare foto's de ID's van **alle** gepubliceerde stukken. Alleen deze volledige lijst verwijdert niet meer gepubliceerde stukken uit de mand; ontbrekende fotolinks of een mislukte verversing doen dat niet. Een gedeeltelijke `put()` zonder publicatielijst verwijdert niets. Vernieuwing behoudt waar mogelijk stuk, fotopositie en open venster. Ontbreekt het vorige stuk, dan wijst de terugknop naar een ander stuk; bij één stuk is hij uitgeschakeld. Deze selectie reserveert niets en schrijft niet naar Supabase.

De echte winkel vult tot en met 480 px de viewport, zonder het presentatiekader van de referentie. Daarboven blijft de breedte 390 px, gecentreerd. De binnenindeling en container-breekpunten blijven uit de referentie komen, gerekend met de werkelijke beschikbare breedte. Veilige randen gebruiken `env(safe-area-inset-*)`. Status staat alleen bij laden of een probleem in de bestaande bovenruimte, zonder verschuiving.

Collectie toont de beschikbare stukken uit dezelfde publieke NikkiStore-catalogus. Mijn items toont daarvan de stukken met een lokaal hartje (`gsf-liked`, vaste `display_id`). Beide gebruiken de bestaande paneelstijl en bieden zoeken in publieke tekst, filteren op ingevuld materiaal en sorteren op boetiekvolgorde, prijs of naam. De standaardvolgorde wordt niet als “nieuwste” gepresenteerd.

Foto opent het gekozen stuk in de bestaande winkel; naam opent het bestaande informatievenster en keert bij sluiten terug naar dezelfde lijst, filters en scrollpositie. Prijs wisselt de bestaande lokale mand; het hartje bewaart/verwijdert het stuk in Mijn items. Vernieuwde fotolinks en verkochte stukken worden ook in een open lijst verwerkt. Een fotostoring verwijdert geen opgeslagen hartje. Zoekopdracht, filters en scroll staan alleen in het geheugen per venster; hartjes blijven in deze browser bewaard, zonder klantaccount of synchronisatie.

Winkelmand (`store-screens/cart.js`) toont de lokaal geselecteerde stukken met foto, naam, prijs, verwijderknop en totaal, in de regels van optie B. In plaats van Afrekenen staat de proefmelding: er is geen checkout en de mand reserveert niets. Een gepubliceerd stuk waarvan de foto tijdelijk niet laadt, blijft geselecteerd en wordt gemeld als tijdelijk niet te zien. Het accounticoon opent het bestaande beheer. De hoofdwinkel is in deze aanvulling ongewijzigd. Zie [functieoverzicht en resterend werk](../docs/FUNCTIONALITEIT.md) en [beelden voor/na](../docs/screenshots/collectie-mijn-items/README.md).

## Contract

`garments.id` is de permanente UUID van één stuk. Een vast `display_id` houdt lokale hartjes gekoppeld aan hetzelfde stuk wanneer de collectie van volgorde verandert. `data` bevat uitsluitend de toegestane publieke productvelden, prijzen in eurocenten, maten als `[borst plat, schouder, mouw, ruglengte]` in cm, ontbrekende maten als `null`, en fotoverwijzingen. Er zijn geen velden voor privénotities of inkoopprijzen in dit contract. Deze horen later in een aparte beschermde tabel, niet als extra JSON-velden.

`save_garment` valideert het volledige contract en het bestaan van de foto's. Eerste publicatie gebruikt versie 0. Elke update vereist de laatst geopende versie; verouderde of dubbele aanvragen worden geweigerd. Een metadata-update verandert `status` nooit. `mark_garment_sold` is een afzonderlijke bewuste beheeractie. Er is geen automatische herpublicatie van verkochte stukken.

Foto's staan in een private bucket met maximaal 2 MB per verkleinde foto. SHA-256-adressen voorkomen dubbele uploads bij een herhaalde aanvraag. Bezoekers kunnen alleen getekende links krijgen voor foto's die aan een gepubliceerd stuk gekoppeld zijn. Alleen staff mag uploads lezen vóór publicatie. Beeld- en productvelden worden als onbetrouwbare tekst behandeld bij rendering.

De server verifieert gebruikers via Supabase Auth, leest de staff-whitelist en reserveert atomair een dagquotum voordat hij Gemini aanroept. De browser mag model en systeeminstructies niet kiezen. AI-output krijgt een allowlist; maten, prijs, diersoort, periode en materiaal worden niet automatisch overgenomen. Titel en beschrijving blijven voorstellen die Nikki inhoudelijk moet controleren.

## Controles

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run check
```

Voor een aanwezige systeembrowser: `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`. De browsertest kiest anders Playwright's Chromium.

- PostgreSQL via PGlite: echte migratie, rollen, RLS, fotoverwijzingen, publieke/privé-scheiding, versies, dubbele aanvragen, verkocht-status en quota. Auth/Storage-tabellen zijn testdubbels van de relevante interfaces; de Supabase-diensten zelf worden hiermee niet getest.
- Node: authenticatie vóór AI, afwijzen van ongeldige beelden, CORS, quotafouten en filteren van modelresultaten.
- Chromium: echte invoer op mobiel formaat, login, analysevoorstellen, verkleinen/upload, opslagfout en herhaling, herladen, tweede browser, verkocht en bewerken. Netwerkdiensten zijn nagebootst.
- `tests/storefront-layout.cjs`: binnenindeling en stijlen vergeleken met optie B bij gelijke beschikbare ruimte; het presentatiekader wordt uitsluitend in de test genormaliseerd. Viewports 280/283/284/320/331/332/390/480/481/1024 px bewaken ook de breekpunten en desktopcentrering. Controleert 44 px, volgorde, geen tekst over foto's, lokale mand bij foto-uitval/verkoop/terugtrekking, SVG-reset, vorige-stukfallback, materiaal/bontsoort, lege maten, veilige tekst, vaste laad-/foutstatus, gesimuleerde veilige randen en bestaande bediening. Schermafbeeldingen in `work/option-b-screenshots`; [vastgelegde vergelijking](../docs/screenshots/README.md).
- `tests/storefront-cart.cjs` wordt door die browsertest aangeroepen: leeg, toevoegen via Collectie, volgorde, totaal, verwijderen met toetsenbordfocus, fotostoring zonder verwijderen, 44px-bediening, tekst naast foto's en geen afrekenknop. Ook beelden van de referentiemand.
- `tests/storefront-collections.cjs` wordt door die browsertest aangeroepen: zoeken/filteren/sorteren, hartjes en lokale mand, tweede browserpagina, fotostoring, verkoop tijdens lezen, detail-terugkeer met scroll/focus, fotolinkvernieuwing tijdens typen, lege lijsten, toetsenbord en 44px-bediening. Ook lage schermen van 568 px hoog; geen extra backend-schrijfacties.

Er zijn geen productiediensten of secrets nodig voor deze tests. Live Supabase Auth/Storage en Gemini moeten na configuratie nog samen worden getest. Een verloren save-response kan bij herhaling een versieconflict opleveren: ververs dan de collectie en open het opgeslagen stuk opnieuw. Dat voorkomt een onbedoelde dubbele publicatie.
