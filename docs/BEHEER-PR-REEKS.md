# Beheer: kleine PR's

De reeks volgt [BEHEER-PLAN.md](BEHEER-PLAN.md) en [BEHEER-ONTWERPBRIEF.md](BEHEER-ONTWERPBRIEF.md). Skills staan op main via PR #31. Fase 0 is op 13 november 2026 gemerged via PR #37 (`b636a36`). PR #36 neemt die basis over met een gewone merge; geen rebase of force-push.

## Volgorde

Elke volgende PR begint op de nieuwste main nadat de voorgaande stap is gemerged. Eén onderdeel per PR; onderstaande nummers zijn werkvolgorde, geen vaste limiet van zes PR's.

| Fase uit het plan | PR-onderdeel | Inhoud en acceptatie |
|---|---|---|
| 0 | Fundament, #37 | Modules, gedeelde toestand en tokens; bestaand gedrag behouden. Gemerged. |
| 1 | Bovenbalk en inloggen, #36 | Eén rij, Newsreader, witte kaart op rood, toegankelijke bediening en veilige foutafhandeling. |
| 1 | Collectieraster | +-kaart die camera/bestandskeuze opent, filters, teller, zoeken/sorteren, fotolinks in één batch, verkleinde voorbeelden. |
| 1 | Snel bewerken | Vanuit een tegel de prijs aanpassen en verkocht markeren; bestaande versiecontrole behouden. Ook ‘Bekijk als bezoeker’. |
| 1 | Verkocht met ongedaan maken | Vijf seconden ‘Ongedaan maken’ op de tegel; pas daarna het serververzoek. Tests voor annuleren, dubbel indrukken en serverfouten; een verkocht stuk komt niet terug door metadatawijzigingen. |
| 2 | Concepten automatisch bewaren | Invoer en foto's als blobs in IndexedDB op het toestel; hervatten via conceptkaart. Geen serveropslag vóór Nikki opslaat. |
| 2 | Uploadwachtrij | Bij geen bereik ‘wacht op verbinding’; automatisch verder bij herstel. Tests voor herhalen, dubbel indrukken, versies en behoud van verkochte status. |
| 2 | Reeksen fotograferen | Meerdere stukken met alleen foto's als aparte concepten, later aanvullen. |
| 3 | Zelfstandige intakebron | Eerst ongewijzigde werking naar `app/intake/`, één bestand per stap, volgens Martijns besluit. Daarna foto's en controleren in dezelfde stijl. |
| 3 | Voorkeuren en publicatiecontrole | Eerdere keuzes, ‘net als vorige’, onderbouwende foto's en checklist; servervalidatie en menselijke bevestiging blijven. |
| 4 | Foto-opslag en analysecontract | Openbare/interne foto's en maximaal acht analysefoto's; server bewaakt scheiding. Detailrollen apart na Nikki's controle. |
| 4 | Fotocoach | Gecontroleerde AI-aanwijzingen; advies blokkeert Nikki niet. |
| 4 | Begeleid meten | Meetlint aflezen, bevestigen of corrigeren; cm en ontbrekende maten als null. Meetmat alleen als apart goedgekeurde proef. |
| 4 | Spraak | Eerst onderzoek naar browserherkenning; servervariant alleen na aparte kostenafweging. |
| 5 | Verkoopplatform | Reserveren, verkoopvoorraad, meldingen, verzending en prijshulp later, met platformbesluit. |

Snel bewerken, vijf seconden ongedaan maken, concepten bewaren, uploadwachtrij en reeksen blijven dus onderdeel van het plan. Backend-, opslagcontract- en AI-wijzigingen krijgen ieder een eigen PR en het in het plan afgesproken akkoord. Martijn beslist over merges/releases; zijn concrete autorisatie voor een taak geldt.

## Controle

Per PR: `npm run build`, `npm test`, `npm run test:browser`, `npm run check` en `git diff --check`. Synthetische gegevens en nagebootste diensten. Chromium werkt in de huidige cloudomgeving. Beelden op 390 en 320 px worden lokaal gecontroleerd en door CI als artifact bewaard. Live Supabase/Gemini en een fysieke telefooncamera zijn niet getest.

## PR #36

Eén set `app/admin/tokens.css`, `header.js` en `login.js`; alle koppelingen tussen bediening, API, gedeelde toestand en collectie staan in `app/admin/index.js`. `main.js` behoudt de fase-0-opbouw. Authenticatie loopt via `action()`; alleen `api.login` staat in de lokale try/catch. Na succes wordt het wachtwoord gewist en verborgen vóór staff/controls/refresh. Vernieuwingsfouten staan zichtbaar buiten het formulier. De test controleert ook geweigerde beheerrechten, herhaald indienen, periodieke vernieuwing tijdens login en ontbrekende configuratie.

Newsreader wordt in de browsertest uit een gelicenseerde lokale fixture geladen en met Chromium's werkelijk gebruikte letter gecontroleerd. De website blijft Google Fonts gebruiken. [Schermafbeeldingen en ontwerpbeperking](screenshots/beheer-login/README.md).
