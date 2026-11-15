# Functionaliteit van de boetiek

Onderzocht op 10 november 2026 vanaf de goedgekeurde cloudwinkel op main d730413 (PR #19–22 gemerged). Bron: code, documentatie en lokale browsertests met nagebootste diensten. De oudere prototypes zijn geen uitgangspunt.

## In deze aanvulling

| Venster | Gedrag |
|---|---|
| Collectie | Alle beschikbare gepubliceerde stukken met bereikbare foto's. Zoeken in titel, verkooptekst, materiaal en toepasselijke bontsoort; alle zoekwoorden moeten passen, hoofdletters en accenten maken geen verschil. |
| Filters en sortering | Materiaalkeuzes komen uit ingevulde cataloguswaarden. Sorteren op dezelfde volgorde als de boetiek, prijs oplopend/aflopend of naam. Wisicoon zet zoeken, filter en sortering terug. |
| Mijn favorieten (was Mijn items) | Beschikbare stukken met het bestaande lokale hartje. Toevoegen/verwijderen werkt vanuit de winkel en beide lijsten. De uitleg vermeldt expliciet dat hartjes alleen in deze browser worden bewaard. |
| Foto / naam / prijs | Foto opent het stuk in de bestaande winkel. Naam opent bestaande verkooptekst en platte maten; sluiten brengt je terug naar je lijst en scrollpositie. Prijs wisselt alleen de lokale mand. |
| Vernieuwing en lege lijsten | Open lijsten krijgen nieuwe fotolinks en beschikbaarheid. Zoeken, filters, sortering, focus en scroll blijven waar mogelijk behouden. Geen fictieve records bij leegte; een tijdelijke fotostoring verwijdert geen hartje. |

De schermen hergebruiken het bestaande volle paneel, productrijen, kleuren, letters, prijs-chips en iconen. Knoppen zijn minimaal 44 px; tekst staat naast de foto's. De bestaande hoofdwinkel blijft ongewijzigd. Geen nieuwe gegevensopslag of API.

## Wat nog ontbreekt

| Functie | Vastgesteld in de huidige code | Afzonderlijke vervolgstap |
|---|---|---|
| Winkelmand-overzicht | Gebouwd in `app/store-screens/cart.js` (10 november 2026): regels, verwijderen en totaal uit optie B; proefmelding in plaats van Afrekenen. | Klaar; zie [FRONTEND-PLAN.md](FRONTEND-PLAN.md), onderdeel A. |
| Delen en stuklinks | Het deelicoon in de foto heeft geen handler. Het gekozen stuk zit alleen in de interne winkeltoestand. | Stabiele link op stuk-ID en een werkende deel-/kopieeractie; geen tijdelijke getekende fotolink delen. |
| Klantaccount | De regel "Beheer" onderaan het menu opent bestaand collectiebeheer voor Nikki (tot 15 november 2026 het accounticoon). Er is geen bezoekersprofiel. | Alleen na productkeuze: klantaanmelding en bijbehorende rechten, met behoud van het aparte beheer. |
| Hartjes op meerdere apparaten | Hartjes staan in lokale browseropslag. Nieuwe pagina's lezen die opslag; al geopende tabbladen krijgen geen directe synchronisatie. | Beslissen of tab-/account-/apparaatsynchronisatie gewenst is; dit vraagt apart gedrag en eventueel opslag/rechten. |
| Checkout en reservering | De pilot bevat geen checkout, betaling, orderstatus of reservering. De status published/sold is geen transactionele winkelvoorraad. | Verkoopplatform kiezen en unieke voorraad/orderafhandeling uit het bestaande architectuurvoorstel uitwerken. |
| Persoonlijke pasvorm en meldingen | Er is een meetvenster met bestaande platte maten, maar geen klantmaten, aanbevelingen of nieuwe-stukmeldingen. | Afzonderlijke productkeuze en datacontracten; niets afleiden uit hartjes of kledingfoto's. |

Deze open punten zijn geïnventariseerd, niet stilzwijgend geïmplementeerd in de twee vensters. Verdeling over losse bestanden en eigenaars: [FRONTEND-PLAN.md](FRONTEND-PLAN.md).

## Bestaand technisch aandachtspunt

In `app/store-layout.css` staan de algemene `.info`- en `.cart`-regels ná de regels voor schermen lager dan 760 px. Daardoor winnen de algemene top-/paddingwaarden voor die panelen; de kleinere marge van de hoofdwinkel `.ph` werkt wel. De huidige goedgekeurde hoofdweergave is behouden. Een eventuele correctie van de panelenmarges kan afzonderlijk worden beoordeeld.

## Bewijs en grenzen

Build, 23 unit-/PostgreSQL-/opslagtests, bestaande cloudbrowserworkflow, uitgebreide storefronttests en de zelfstandige optie-B-test slagen lokaal. De nieuwe vensters zijn gecontroleerd op 390/320/280 px, ook op 568 px hoogte, met zoeken/filteren/sorteren, veilige tekst, hartjes, lokale mand, detail-terugkeer, toetsenbordfocus, fotolinkvernieuwing en verkoop tijdens het lezen. De netwerkproef weigert onverwachte backend-schrijfacties.

[Schermafbeeldingen voor en na](screenshots/collectie-mijn-items/README.md) gebruiken testrecords en tekeningen; geen echte inventaris, privéfoto's of fototokens. De hoofdwinkel is visueel ongewijzigd; de bestaande geometriecontrole blijft groen. De laatste rastervergelijking op 320 px is exact gelijk; op 390 px verschillen 45 randpixels bij de thumbnails, zonder geometrisch verschil.

Niet opnieuw live getest: Supabase Auth/Storage, Gemini, echte winkelvoorraad of betalingen. Fysiek iOS/Safari, schermlezers en zeer grote catalogi zijn niet getest; veilige randen en toetsenbordgedrag zijn in Chromium gecontroleerd. De huidige productieconfiguratie en rechten zijn niet gewijzigd.
