# Review gebruiksvriendelijkheid (Gemini), 15 november 2026

Gemini beoordeelde het reviewpakket (protocol: NN/g-heuristieken, cognitive walkthrough, Apple HIG, Material 3, WCAG 2.2 AA, ISO 9241-110, e-commerce). Gemini zag alleen schermafbeeldingen. Elke bevinding is daarom nagekeken in de code en, waar mogelijk, gemeten in de gebouwde app (Playwright, 390 px). Besluiten volgen de projectregels in AGENTS.md: vaste keuzes van optie B en de goedgekeurde afwijkingen blijven staan, tenzij Martijn anders beslist.

## Meting

Boetiek, collectie en beheer: geen bedieningselement kleiner dan 44 × 44 px, geen tekst kleiner dan 16 px en overal minstens 4,5:1 contrast tegen de achtergrondkleur. Invoerscherm vóór deze wijziging: zeven bedieningselementen van 34–42 px hoog en tekst van 12,8–14,4 px. Daarna: geen tekortkomingen (op een decoratieve tekst in het SVG-embleem na).

## Besluiten per bevinding

| ID | Bevinding | Besluit |
| --- | --- | --- |
| B-01 | Informatiepaneel (maten, materiaal) slecht vindbaar | Niet nu: raakt de vaste indeling van optie B. Het paneel bestaat (pijltje naast de titel). Voorleggen aan Martijn. |
| B-02 | Geen winkelmandteller | Niet nu: raakt vaste keuze (alles op dezelfde plek, menu ☰). De prijsknop toont al of een stuk in de mand ligt. |
| B-03 | Fotokaarten lopen buiten beeld; geen verwijderknop | Deels onjuist: de kaarten lopen door in een raster. Wel opgelost: knoppen 44 px hoog, 8 px tussenruimte, tekst 16 px. Verwijderen kan in de fotostap; een verwijderknop in Controleren komt mee in het nieuwe invoerscherm. |
| B-04 | Iconen op de foto: contrast en ⊕/⊖ lijkt op zoomen | Niet nu: raakt vaste keuze (iconen zonder woorden, goedgekeurde meer/minder-knoppen). Contrast op lichte foto's voorleggen aan Martijn. |
| B-05 | Geen foutmelding bij opslaan met een open onderdeel | Opgelost: de melding "Nog niet af: …" staat nu direct boven de opslagknop, in donkerrood (geen geel of oranje). De tekst "Gebruik positieve getal!" bestaat niet; in de code staat "Gebruik positieve getallen." |
| B-06 | Prijsknop toont niet of een stuk in de mand ligt | Onjuist: de knop krijgt een donkere vulling en `aria-pressed` (getest in de browsertests). |
| B-07 | Sorteerkeuze heet "Boetiek", geen prijsfilter | Niet nu: kleine wijziging aan een goedgekeurd scherm; voorleggen aan Martijn. |
| B-08 | Is een regel in Collectie klikbaar? | Niet gewijzigd; geen gemeten probleem. |
| B-09 | "Volgend stuk" lijkt de hoofdknop en wist onopgeslagen invoer | Opgelost: de knop is nu secundair (zonder vulling) en vraagt bevestiging als er niet-opgeslagen invoer is. |
| B-10 | Poppetje in de boetiek suggereert een klantaccount | Niet nu: raakt vaste keuze (optie B). Voorleggen aan Martijn. |
| B-11 | "Wis alles" zonder bevestiging | Onjuist: er is al een bevestigingsvraag. |
| B-12 | Huidig stuk in de onderrij niet duidelijk | Niet nu: raakt vaste keuze (onderrij met vier vakjes). |
| WCAG 1.4.3 | Statusregels in het invoerscherm te licht | Gemeten 6,4:1, dus voldoende; wel naar 16 px gebracht en de afkapping weggehaald. |
| WCAG 2.5.8 | Kleine tikvlakken | Boetiek: onjuist (alles ≥ 44 px gemeten). Invoerscherm: opgelost. |

## Tweede ronde: codereview (Gemini, op GSF-code-voor-review.txt, commit 7320b63)

Een eerdere poging op een zip leverde verzonnen functienamen op (31 van 32 bestonden niet); Gemini kon de zip niet openen. Deze ronde gebruikte één tekstbestand met regelnummers en vroeg bij elke bevinding om een letterlijk citaat. De citaten kloppen met de code.

| Punt | Besluit |
| --- | --- |
| 1.1 Tekst in "+ nieuw" verdwijnt bij een tik op een chip; focus gaat verloren | Opgelost: de getypte tekst blijft bewaard; na het opnieuw tekenen gaat de focus terug naar dezelfde knop. |
| 1.2 Dubbel gekozen foto blokkeert opslaan met een misleidende melding | Opgelost: dezelfde foto wordt één keer bewaard (als boetiekfoto als een van beide dat was). |
| 1.3 Geen verwijderknop in Controleren | Opgelost: knop "Verwijderen" per foto, met bevestiging. |
| 2.1 Foto's één voor één geüpload | Opgelost: drie tegelijk, in volgorde, met teller ("Foto's opslaan: 3 van 6…"). |
| 2.2 Bewerken downloadt foto's één voor één | Opgelost: tegelijk. Opnieuw comprimeren bij een nieuwe analyse geldt alleen voor de analyse, niet voor de opgeslagen foto. |
| 2.3 Foto's boven 8 MB geweigerd | Opgelost: tot 30 MB; ze worden toch verkleind tot 1600 px. |
| 2.4 Vernieuwingsfout maakt de boetiek leeg | Niet overgenomen: bij een netwerkfout gooit `imageUrls` een fout en blijft de boetiek staan; alleen echt ontbrekende foto's verdwijnen. |
| 3.1 Gemini krijgt de keuzelijsten niet | Opgelost: Nikki's lijsten (standaard en eigen woorden) gaan als opgeschoonde data mee; Gemini kiest bij voorkeur letterlijk daaruit. Uitvoerplafond naar 8192 tokens. |
| 3.2 Tijdslimieten browser/server | Niet overgenomen: de invoer geeft een eigen stopknop mee; het verbruikte dagquotum bij stoppen is aanvaardbaar. |
| 3.3 `stripFence` ontbreekt in analyse | Opgelost. |
| 4.1 Geen waarschuwing bij verversen; Terug-knop verlaat de site | Opgelost: waarschuwing bij niet-opgeslagen invoer; de Terug-knop gaat naar het vorige scherm van de app. Panelen in de boetiek volgen nog niet de Terug-knop. |
| 4.2 Na opslaan opent Nieuw stuk het oude stuk | Opgelost: na opslaan begint Nieuw stuk leeg. |
| 4.3 Knoptekst blijft "Wijziging opslaan" | Opgelost. |
| 5.1 Ingezoomde foto niet te verschuiven | Niet nu: gedrag van het goedgekeurde ontwerp; voorleggen aan Martijn. |
| Eigen bevinding | De winkelmand meldt nu als een stuk erin inmiddels verkocht is. |

## Derde ronde: zes Fable-agents (15 november 2026, op main 7cfadf3)

Zes agents reviewden elk één gebied: beveiliging en privacy, invoer en verlies van werk, boetiek, Gemini, de app bedienen op 390/320 px, en tests/bouw/migraties. Geen kritieke of ernstige beveiligingsproblemen. Alle bevindingen hieronder zijn nagekeken in de code voordat ze zijn opgelost.

### Opgelost

| Gebied | Bevinding | Oplossing |
| --- | --- | --- |
| Gemini | Voorstellen van Gemini (zoals bijzonderheden) konden ongezien gepubliceerd worden | Besluit Martijn (15 november 2026): Gemini vult alles in wat het kan, ook materiaal, bont, bontsoort en periode; een onderdeel dat Gemini invulde wacht op één tik op **Klopt** (of een wijziging). De bontsoort houdt daarnaast het vinkje "zelf gecontroleerd" |
| Gemini | Titel en beschrijving konden materiaal, diersoort, periode of echtheid noemen | De tekst blijft staan; de server noemt de woorden (`controleer`), en Titel en prijs wacht op Klopt of een aanpassing. Ingebakken JSON-voorbeeld weg |
| Gemini | Schema zonder grenzen | `maxItems` op lijsten; kortere teksten; personalise: alleen bestaande `c1..cN` |
| Gemini | Drukte bij Google leek een fout | Eigen melding `GEMINI_BUSY` ("wacht een minuut") |
| Gemini | Geblokkeerde prompt zonder reden in de log | `blockReason` gelogd |
| Gemini | Personalise noemde een onbruikbaar antwoord "AI" | `NO_VALID_IDS` geeft terugval |
| Gemini | Herhaling zonder denkinstelling bij elke aanvraag | Per model onthouden |
| Gemini | Eerdere voorstellen gingen als "Nikki's lijsten" mee | Lijsten uit standaard plus eigen woorden |
| Privacy | Concept (met controlefoto's) bleef na uitloggen op het toestel | Gewist bij uitloggen; teruggezet alleen na inloggen als beheerder |
| Privacy | Fotoplek niet afgeschermd in HTML | Ge-escaped |
| Invoer | Uploadfout overschreven door vastgelopen teller | Na een fout stoppen de andere uploads en blijft de fout staan |
| Invoer | Concept schreef bij elke wijziging alle foto's opnieuw, ook twee keer tegelijk | Foto's apart, alleen bij een andere fotoset; geen gelijktijdige schrijfacties; na 14 dagen vervallen |
| Invoer | Laat Gemini-antwoord kwam in een ander stuk terecht | Generatieteller; voorstel alleen bewaard voor het juiste stuk |
| Invoer | Verkocht markeren tijdens bewerken maakte opslaan onmogelijk | Versie bijgewerkt |
| Invoer | Verloren antwoord na geslaagde eerste opslag | Herkend: "Dit stuk was al opgeslagen" |
| Invoer | Gemini-waarschuwingen verdwenen | Blijven staan, ook in het concept |
| Invoer | Verkeerde knoptekst na terugzetten | Op basis van nieuw/bewerken |
| Invoer | Opslaan na wisselen naar ander stuk wiste dat stuk | Reset alleen als het opgeslagen stuk nog open is |
| Invoer | Analyse zonder tijdslimiet | 120 seconden naast de stopknop |
| Invoer | Maten > 300 cm en titel > 200 tekens pas door de database geweigerd | Zelfde grenzen in het scherm |
| Invoer | Onbruikbare foto pas bij opslaan geweigerd | Meteen, met naam van de foto |
| Invoer | Aan- en uittikken telde als invoer | Lege waarden tellen niet |
| Invoer | Tekst "Zet ze op Voor de boetiek" klopte niet | Verwijst naar "Alleen voor controle" |
| Bediening | Verkeerd wachtwoord gaf "De handeling is niet afgerond" | "E-mailadres of wachtwoord klopt niet", focus in het wachtwoordveld |
| Bediening | Na opslaan toonde de boetiek een ander stuk | Het opgeslagen stuk wordt getoond |
| Bediening | Vijf gelijke knoppen "Bewerken" voor schermlezers | Naam met de titel |
| Bediening | "Bewerken" vroeg altijd bevestiging | Alleen bij niet-opgeslagen invoer |
| Bediening | Potloodje bedekte de laatste rij | Ruimte onder de lijst |
| Bediening | Verwijderkruisje 28 px en "Liever zelf invullen" 40 px | 44 px |
| Bediening | Melding "Nog niet af" maakte de balk 192 px hoog | Alleen het eerste ontbrekende onderdeel |
| Bediening | Bewerken heette "Nieuw stuk · proef" en sprak van een oefenscherm | "Stuk bewerken"; geen oefenschermtekst; bevestiging klopt |
| Boetiek | Melding "verkocht" verdween of werd tijdens Betalen ingeslikt | Blijft tot de winkelmand sluit; terug naar het overzicht |
| Boetiek | Volgorde bij gelijke score anders dan Nikki's volgorde | Server breekt gelijkspel zoals de winkel |
| Boetiek | Na een gedeelde link werkte de Terug-knop niet | Geschiedenis behouden |
| Boetiek | Twee tabbladen overschreven elkaars winkelmand | Andere tabbladen volgen; alleen schrijven bij een echte verwijdering |
| Boetiek | Zoom sprong bij hartje of winkelmand | Zoom blijft |
| Tests | Livecontrole zag de nieuwe migratie niet en herkende een oude geheime sleutel niet | Controle op `garment_private`; JWT-rol gedecodeerd |
| Tests | Versieconflict (500/40001), paginering, uploadfout, verkeerd wachtwoord ongetest | Tests toegevoegd |
| Tests | Bouwen schreef demobestanden | Alleen nog als dat script zelf draait |
| Tests | Vaste wachttijd in concepttest | Wachten op een voorwaarde |

### Bewust niet nu

- Oude `save_garment` afsluiten: pas nadat de nieuwe migratie live staat (anders werkt opslaan niet meer).
- Beveiligingsheader (CSP): de app gebruikt veel inline scripts in `srcdoc`-frames; vraagt een eigen, geteste wijziging.
- Per-bezoekerlimiet personalise op `x-forwarded-for`: eerst live nagaan welke header Supabase doorgeeft.
- Quota personalise na de catalogus: de catalogus zou dan zonder limiet opvraagbaar zijn.
- Mijn smaak-labels ("Ja", "200-350"), meer/minder-knoppen verbergen als persoonlijke volgorde uit staat, menu met pijltjestoetsen, modale vensters, foto-aankondigingen: raken het goedgekeurde winkelontwerp; voorleggen aan Martijn.
- Focus na elke actie, livemeldingen voor beheerders, invoerscherm in huisstijl: komt mee met het nieuwe invoerscherm.
