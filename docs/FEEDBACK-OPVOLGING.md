# Opvolging van testfeedback (review_notes)

Zes opmerkingen uit `public.review_notes` (CSV-export van Martijn, 16 november 2026). De export bevatte scherm, gemarkeerd element, rechthoek en viewport, maar geen schermafbeeldingen of buildversie. De oorspronkelijke records zijn niet gewijzigd en niet als afgehandeld gemarkeerd.

| # | Feedback | Afhandeling |
|---|----------|-------------|
| 1 | Onleesbare tekst bij Bewerken | Vermoedelijke testtekst. Behouden; geen reparatie afgeleid. |
| 2 | "Eigenlijk moet hier een searchbar, wat zoek je?" | Voorstel: zoekbalk boven de foto, gekoppeld aan de bestaande Collectie-zoekfunctie (zie ontwerpvoorstellen). Nog niet in de winkel. |
| 3 | Beheericoon ontbreekt; misschien GSF-logo en missie | Het icoon is bewust naar Shop → Beheer verplaatst. De vrijgekomen ruimte is meegenomen in het merkvoorstel. Geen missietekst verzonnen. |
| 4 | Merknaam en logo niet mooi/passend | Twee beperkte bovenbalkvarianten (A/B) binnen de bestaande winkelstijl. Keuze ligt bij Martijn; aanbeveling A. |
| 5 | Verkoopprijs automatisch invullen, automatisch verkocht na afrekenen | De vraagprijs werd al vooraf ingevuld. Nu één tik: **Verkocht voor € [vraagprijs]**. Echte betaling is afzonderlijk werk (zie hieronder). |
| 6 | Knopje doet niets | Betreft Jouw collectie: op dat scherm opende het hetzelfde scherm. Het knopje is nu uitgeschakeld en gemarkeerd als huidige pagina; vanuit Nieuw stuk blijft het de terugroute. |

## Gebouwd

### Feedbackverlies voorkomen (`app/review-kit/review-kit.js`)
Gereproduceerde fout: `flush()` las de hele lokale wachtrij, wachtte op verzending en schreef daarna de oude lijst terug; een ondertussen toegevoegde opmerking kon verdwijnen.

- Elke opmerking krijgt een vaste UUID in `context.clientId` en wordt apart bewaard onder `review-kit-queue:<clientId>`, vóór de eerste verzendpoging. Een geslaagde verzending verwijdert alleen die sleutel.
- Een lokale `Set` voorkomt gelijktijdig verzenden van dezelfde opmerking; een mislukte opmerking wordt na 10 seconden opnieuw geprobeerd en blokkeert de andere niet.
- De oude array `review-kit-queue` wordt gemigreerd. De client-ID is afgeleid van SHA-256 over `JSON.stringify([index, note])`, zodat meerdere tabbladen of een gedeeltelijke migratie dezelfde ID geven. De oude array verdwijnt pas als alles is bewaard en de waarde ondertussen niet is veranderd.
- Falen lokale opslag én verzending, dan blijft het formulier met de tekst open. Opnieuw proberen met dezelfde tekst en hetzelfde type behoudt de client-ID. Tijdens verzenden zijn tekst, type en Annuleer uitgeschakeld. Een laat antwoord sluit geen later geopend formulier. `destroy()` stopt verdere verzending en meldingen.

**Resterende beperking:** de wachtrij is per browserprofiel, niet per beheerder. Wisselt er een andere beheerder van account in hetzelfde profiel, dan verstuurt de sessie die op dat moment ingelogd is de wachtende opmerkingen en wordt die als auteur vastgelegd. Dit is niet opgelost.

### Herhaald verzenden zonder duplicaten (`supabase/migrations/20261116090000_review_note_retry.sql`)
- Nieuwe nullable kolom `client_id uuid` en unieke beperking op `(author, client_id)`.
- `add_review_note(text,text,jsonb)` (zelfde signatuur): eerst `require_staff()`, dan `clientId` uit de context, een auteurspecifieke transactionele advisory lock, en:
  - dezelfde auteur/client-ID met dezelfde soort, tekst en context: de bestaande record-ID wordt teruggegeven (ook als het dagquotum bereikt is);
  - afwijkende inhoud: fout `REVIEW_NOTE_CONFLICT`;
  - daarna het bestaande maximum van 500 per dag; nieuwe opmerkingen worden met client-ID opgeslagen.
- Oude clients zonder client-ID blijven werken. Staff-rechten, RLS en het append-only contract zijn ongewijzigd.
- Getest met PGlite; **niet live toegepast**.

**Uitrolvolgorde (Martijn):** eerst de migratie, daarna de frontend. Een frontend zonder migratie blijft werken (de extra sleutel in `context` wordt gewoon opgeslagen), maar dan werkt de ontdubbeling niet. Controleer vooraf welke andere migraties nog openstaan; voer niet blind alle lokale migraties op productie uit.

### Verkoopbevestiging (`app/admin/collection.js`)
Na Markeer verkocht: **Verkocht voor € [vraagprijs]**, **Ander bedrag**, **Annuleer**. Alleen Ander bedrag opent het invoerveld, met de vraagprijs vooraf ingevuld. Behouden: bewuste bevestiging, vijf seconden ongedaan maken, bedragvalidatie, opslag in eurocenten, bewaren van de keuze bij vernieuwing, foutafhandeling en versiecontrole; verkochte stukken worden niet automatisch opnieuw gepubliceerd.

**Geen echte betaling toegevoegd.** De winkelmand doorloopt alleen een voorbeeldbetaling en wijzigt nooit voorraad of verkocht-status. "Automatisch verkocht na afrekenen" vraagt een echte checkout met serverkant-voorraad en is afzonderlijk werk.

### Collectieknop (`app/main.js`, `app/style.css`)
Navigatieknoppen in `.app-toolbar` zijn `disabled` voor hun huidige bestemming, hebben `aria-current="page"` en een subtiele achtergrond en ondermarkering (zelfde plek). Vanuit Nieuw stuk blijft Jouw collectie ingeschakeld.

### Ontwerpvoorstellen (niet in de winkel geïntegreerd)
`scripts/preview-feedback.cjs` bouwt twee voorstellen in tijdelijke browserpagina's van de bestaande testfixture (`npm run build` eerst):
- **A:** gecentreerd woordmerk op twee regels, zoekbalk eronder (aanbeveling).
- **B:** bestaand GSF-appembleem links naast de naam, dezelfde zoekbalk.

Newsreader en het optie-B-palet blijven; geen tekst over de foto; geen missie- of duurzaamheidsclaims; Beheer blijft onder Shop. De zoekbalk opent Collectie en vult het bestaande zoekveld; er is geen tweede catalogus en geen AI-zoekfunctie. Beelden: `docs/screenshots/feedback/`. Op lage telefoons (320 × 568) wordt de foto door de extra zoekbalk kleiner; dat is een afweging voor de keuze.

Besluit van Martijn nodig: voorkeur A of B (en of de zoekbalk überhaupt in de winkel komt; dat wijkt af van optie B en vraagt expliciet akkoord).

## Tests
`tests/review-queue.cjs` (nieuw), `tests/review-notes.test.mjs` (ontdubbeling, conflict, auteurscheiding, herhalen bij bereikt quotum), `tests/admin-collection.cjs` (directe prijsbevestiging, Ander bedrag, navigatie), `tests/review-kit.cjs`, `tests/cloud-browser.cjs`. Live Supabase is niet getest.
