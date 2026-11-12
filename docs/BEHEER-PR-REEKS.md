# Beheer: kleine PR's

Uitgangspunt: main `516df1995b373b409ec36430ac84340f84b6c3f8`, de ontwerpbrief en het gedeelde ontwerp ‘Beheerkant Nikki’s Boetiek’. De ontwerpskills staan al op main via PR #31.

1. Bovenbalk, inloggen en gedeelde beheerstijl.
2. Collectieraster met camerategel; bestaande bewerk- en verkoopacties behouden.
3. Zelfstandige bronbestanden voor de intake, foto's en controleren.
4. Servercontract voor openbare en interne foto's.
5. Fotocoach met gecontroleerde AI-voorstellen.
6. Begeleid meten: meetlint lezen, bevestigen of corrigeren.

De branches bouwen in deze volgorde op elkaar, zodat iedere PR alleen zijn eigen wijziging toont. Samenvoegen en uitrollen blijven aparte besluiten van Martijn. Toekomstige onderdelen van BEHEER-PLAN (offline wachtrij, batchinvoer, spraak en echt verkopen) vallen buiten deze ontwerp- en intakeopdracht.

## Controle

Per stap: build, unit-/databasechecks, projectcontrole, diffcontrole en browserchecks. Browserchecks gebruiken uitsluitend synthetische gegevens. De werkruimte blokkeert het starten van Chromium (`socket: Operation not permitted`); de bestaande GitHub Actions-job voert de browserchecks uit. Nieuwe schermafbeeldingen op 390 en 320 px worden als CI-artifact bewaard. Live Supabase/Gemini en de camera op een echte telefoon zijn niet getest.

## Stap 1

Nieuwe bestanden in `app/admin/` bevatten de vaste kleuren/typografie, iconen, bovenbalk en het loginformulier. Bestaande login, sessiecontrole, uitloggen, collectie vernieuwen en schermwissel blijven aangesloten op dezelfde API. Wachtwoord tonen/verbergen, wachtwoordmanager, plakfunctie, labels en foutmelding zijn beschikbaar. De winkel zelf blijft ongewijzigd.
