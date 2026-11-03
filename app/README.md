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
| `store-extension.js` | Bestaande carrousel vullen met de gedeelde collectie |
| `config.js` | Alleen publieke Supabase-projectgegevens |
| `../supabase/migrations/202611030001_catalog.sql` | Datacontract, rechten, gecontroleerde mutaties, daglimieten |
| `../supabase/functions/analyse/handler.mjs` | Auth-controle, aanvraaggrenzen, Gemini-aanroep en resultaatfilter |

`npm run build` herbouwt eerst de zelfstandige demo en leidt daarvan de twee bestaande schermen af. De bestaande bron-HTML blijft voorlopig groot; de nieuwe functies zijn losse modules. Integratieankers worden gecontroleerd en de browserproef doorloopt de daadwerkelijke schermen. De uitvoer staat in de genegeerde map `dist/cloud`. Er is geen bundler of runtime-CDN afhankelijkheid.

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
- Chromium: echte invoer op mobiel formaat, login, analysevoorstellen, verkleinen/upload, opslagfout en herhaling, herladen, tweede browser, vijf stijlen, verkocht en bewerken. Netwerkdiensten zijn nagebootst.

Er zijn geen productiediensten of secrets nodig voor deze tests. Live Supabase Auth/Storage en Gemini moeten na configuratie nog samen worden getest. Een verloren save-response kan bij herhaling een versieconflict opleveren: ververs dan de collectie en open het opgeslagen stuk opnieuw. Dat voorkomt een onbedoelde dubbele publicatie.
