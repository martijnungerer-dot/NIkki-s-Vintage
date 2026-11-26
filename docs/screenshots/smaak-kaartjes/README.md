# Mijn smaak — issue #72

Voor/na op `aa52447` en `codex/issue-72-taste-chips`. De echte gebouwde winkel, Newsreader en gewone synthetische catalogusgegevens; alle netwerkdiensten nagebootst. Geen echte producten of live Gemini-aanroepen.

| Scherm | Vóór | Na | Toevoegen |
| --- | --- | --- | --- |
| 390 × 844 | ![Vóór 390](before-filled-390.png) | ![Na 390](after-filled-390.png) | ![Keuzes 390](choices-390.png) |
| 320 × 568 | ![Vóór 320](before-filled-320.png) | ![Na 320](after-filled-320.png) | ![Keuzes 320](choices-320.png) |

| Leeg | Vóór | Na |
| --- | --- | --- |
| 390 × 844 | ![Leeg vóór 390](before-empty-390.png) | ![Leeg na 390](after-empty-390.png) |
| 320 × 568 | ![Leeg vóór 320](before-empty-320.png) | ![Leeg na 320](after-empty-320.png) |

Alleen het venster Mijn smaak verandert. De uitleg en de losse Meer/Minder-koppen zijn weg. Duimiconen houden de richtingen herkenbaar; bestaande leesbare kenmerklabels blijven. Schakelaar, wisbevestiging en opslagfoutmelding blijven behouden.

De plusknop biedt maximaal twaalf deterministisch gekozen kenmerken uit de bestaande publieke catalogus, verdeeld over de ondersteunde dimensies materiaal, kleur, model, lengte en bontklasse. Al positieve voorkeuren verdwijnen uit die vaste set; de set schuift hierdoor niet op naar steeds nieuwe kenmerken. Een keuze gebruikt het bestaande expliciete filter en de bestaande compacte personalisatieroute. Er zijn geen nieuwe velden, diensten of vrije invoer.

**Contractgrens:** het huidige profiel en `readable()` ondersteunen bontklasse (met/zonder bont), geen afzonderlijke bontsoort. Die wordt hier niet als een ander kenmerk vermomd en het profiel/servercontract is niet uitgebreid. Martijn verduidelijkte dat zijn wens voor onzekere bontsoortvoorstellen over fotoanalyse bij Nieuw stuk gaat; die route bestaat al op main en is buiten deze wijziging gebleven.

De veiligheidsfixture in `tests/storefront-taste.cjs` gebruikt ook opzettelijke HTML-achtige labels om tekstescaping te controleren. Die testtekst staat niet in deze ontwerpbeelden. De suite bewaakt onder meer verwijderen, toevoegen, weigeren van vervalste keuzes, een grote catalogus, opslagfouten, lege staat, geen vrije invoer, 44 px/16 px, focus en behoud van het bestaande smaakgedrag.
