# Opvolging van testfeedback (review_notes)

## Ronde 2: zes opmerkingen van 19 november 2026

Gelezen uit `public.review_notes` (records 7–12, alleen lezen, niet gewijzigd), allemaal op een telefoon van 384 × 693. Nagespeeld in Chromium op 384/390 en 320 px. Logboek van de functie `analyse` gelezen via de Supabase Management API (alleen-lezen-sleutel van Martijn). Besluiten van Martijn op 21 en 22 november 2026.

| # | Feedback (scherm) | Oorzaak | Afhandeling |
|---|---|---|---|
| 1 | "Gemini wilt niet met mij werken" (Nieuw stuk) | **Zeker** (logboek): op 19 november twee keer `HTTP_503 UNAVAILABLE` en één keer `TIMEOUT`, model `gemini-3.8-flash`, 8 foto's. Google was overbelast; geen 429 (limiet), geen codefout. | Functie `analyse`: bij overbelasting na 2 s nog één poging, daarna een sneller reservemodel (`ANALYSE_FALLBACK_MODEL`, anders `PERSONALISE_MODEL`); bij een time-out direct het reservemodel. Samen < 150 s. Overzichtsfoto's gaan op 1024 px naar Gemini. Martijn zet betaling aan op een eigen Google-project voor de winkel (privacy, eigen limiet) en meldt het. |
| 2 | "Concept foetsie" (Jouw collectie, Bewerken) | **Zeker**: Bewerken op een opgeslagen stuk wiste het enige concept op het toestel (na een "Doorgaan?"-vraag). Concepten waren in Jouw collectie niet te zien. Nikki's concept van 19 november is niet terug te halen: het stond alleen op haar telefoon. | Meerdere concepten op het toestel, elk onder een eigen sleutel. Een ander stuk openen of Nieuw stuk bewaart het huidige eerst. Elk onaf nieuw stuk staat als kaart met **rode rand en "Niet af"** vooraan in Jouw collectie; één tik en ze gaat verder. Alleen opslaan of bewust weggooien (prullenbak, met vraag) wist een concept. Uitloggen vraagt of de concepten bewaard blijven. Verder werken op een ander apparaat: idee in [PLAN.md](PLAN.md). |
| 3 | "Foto galerij niet zichtbaar" (lege fototegel) | **Bevestigd door Martijn** (Samsung S24): het fotoveld vroeg om drie bestandstypen; Chrome op Android opent dan een bestandsbeheerder in plaats van de fotokiezer. | Fotoveld vraagt `image/*`: Android toont de gewone fotokiezer (met Google Foto's). Een foto die de app niet kan lezen (zoals HEIC) wordt nog steeds geweigerd met uitleg. **Niet getest op een echte S24**: Nikki probeert het na uitrol. |
| 4 | "8 foto's zijn te weinig" | Vaste grens van 8 in scherm, database en Gemini-functie. | **16 foto's** per stuk (Martijn). Migratie `20261122090000_more_photos_brand.sql`. Gemini krijgt alles: overzichtsfoto's op 1024 px, close-ups (Label, Kraag, Sluiting, Detail, Gebrek, Voering, alleen voor controle) scherp op 1600 px. |
| 5 | "Foto is heel klein" (vraag in Nieuw stuk) | **Zeker**: vraag en knoppen namen de ruimte; de foto werd 66 px hoog (384 px) en verdween op 320 px, waarbij de fotoknoppen over de tekst schoven. | De foto houdt een vast deel van het scherm (55% van het invoerscherm bij vragen, 62% op het fotoscherm); vraag en antwoorden scrollen samen eronder. Tik = schermvullend, vegen of pijlen voor de volgende foto, ook vegen op de grote foto. |
| 6 | "Terug knop werkt niet" (Stuk bewerken, overzicht) | **Zeker**: in het overzicht sprong het pijltje naar de laatste vraag en terug naar het overzicht, eindeloos. | Zoals Gmail en vergelijkbare apps: tussen de vragen één vraag terug; op het fotoscherm en in het overzicht terug naar Jouw collectie, met de invoer als concept bewaard. |

### Gericht kijken door Gemini (besluit Martijn, 22 november)
- Nikki kiest per foto wat erop staat (nieuw: **Kraag**). Die keuze en een optionele **notitie voor Gemini** gaan als data mee; Gemini volgt de aanwijzing maar behandelt tekst als data, niet als opdracht.
- Per soort foto een gerichte vraag: label letterlijk lezen (merk, maat, samenstelling, land) in `labeltekst`; soort kraag; rits of knopen en een leesbare naam op het ritslipje; zakken, ceintuur, manchetten, voering. Kenmerken komen als voorstel bij Bijzonderheden.
- **Merk:** eigen vraag in Nieuw stuk ("Staat er een merk op het label?"). Gemini stelt een merk alleen voor als hij zegt waar hij het las ("Gemini las: Dior. Staat op het label."); zonder vindplaats valt het voorstel weg. Nooit vooraf gekozen, nooit geraden, niets over echtheid. Nieuw optioneel publiek veld `brand` (tekst of null, ≤ 200 tekens); alleen meegestuurd als Nikki een merk koos. De winkel toont het merk nog niet; dat is een aparte winkelwijziging met akkoord.
- Onder de foto's, als er nog geen labelfoto is: "Heb je ook een foto van het label?" (niet op de foto).

### Uitrolvolgorde (Martijn of agent met schrijfrechten, na merge)
Cloudflare bouwt `main` direct. Tot de migratie live is, werken 9–16 foto's en een merk bij opslaan niet (duidelijke foutmelding, invoer blijft staan); 1–8 foto's zonder merk blijven werken. Daarom direct na merge: zie [LIVEGANG.md](LIVEGANG.md#feedback-19-november-uitrollen).

### Tests
`tests/feedback-browser.cjs` (nieuw, 390 × 693 en 320 × 568): concept blijft bij Bewerken en Nieuw stuk, rode kaart "Niet af", uitloggen bewaren/wissen, terugpijltje, fotogrootte en geen overlap, schermvullend, `image/*`, rollen en notitie naar Gemini met 1024/1600 px, merk alleen als voorstel. Uitgebreid: `tests/cloud-server.test.mjs` (16 foto's, opnieuw proberen, reservemodel, time-out, rollen/notitie als data, merk zonder vindplaats weg), `tests/internal-photos.test.mjs` (16 in totaal, `brand`), `tests/intake-steps.test.mjs` (merk), `tests/cloud-browser.cjs` (16 foto's). Beelden vóór en na: [screenshots/feedback-19-november](screenshots/feedback-19-november/README.md). Live Gemini en een echte Android-telefoon zijn niet getest.

## Ronde 1: zes opmerkingen van 15 november 2026


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
