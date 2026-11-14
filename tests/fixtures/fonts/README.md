# Newsreader voor browserfixtures

`Newsreader.ttf` is de echte variabele Newsreader (normaal, optische grootte en gewicht), opgehaald op 14 november 2026 uit [google/fonts](https://github.com/google/fonts/tree/main/ofl/newsreader). De SIL Open Font License staat in `OFL.txt`.

Alleen `tests/admin-fixture.cjs` serveert deze letter in plaats van externe Google Fonts-verzoeken. De productieapp blijft Google Fonts gebruiken; er is geen wijziging aan de font-hosting van de website. De browsertest wacht op de letter en controleert via Chromium welke letter werkelijk voor de titel is gerenderd.
