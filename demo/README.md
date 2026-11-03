# Verbonden proefapp

Open `concept/nikki-proefapp.html` na downloaden in een browser. Dit ene bestand bevat beide schermen en heeft geen build, account of sleutel nodig. Voor Gemini staat dezelfde app met een korte opdracht in `concept/NIKKI-PROEFAPP-VOOR-GEMINI.txt`.

## Uitproberen

1. Kies Nieuw stuk, voeg eigen JPG/PNG/WebP-foto’s toe en kies Liever zelf invullen.
2. Controleer foto’s, hoofdfoto, kenmerken, bontclassificatie, maten, titel en prijs.
3. Kies Toevoegen aan proefwinkel. Je stuk verschijnt vooraan in de startcarrousel; de productpagina toont de ingevoerde maten, beschrijving en foto’s. De rij Ook nieuw bevat de volgende stukken na het eerste carrouselitem.
4. Ga terug naar Nieuw stuk om hetzelfde stuk te wijzigen. Opnieuw toevoegen werkt het bij; Volgend stuk begint een nieuw item.
5. Bewaar app met foto's maakt een HTML-download met alle toegevoegde stukken, beelden en de gekozen beginstijl. Open die download opnieuw om verder te gaan.

Wisselen tussen schermen bewaart de huidige invoer. Na sluiten/vernieuwen vervalt het nog niet toegevoegde concept. Toegevoegde stukken worden waar mogelijk in deze browser bewaard. Als opslag geblokkeerd of vol is, meldt de app dat en blijven de stukken in de huidige sessie beschikbaar; gebruik dan de HTML-download. De browseropslag is gedeeld tussen kopieën op dezelfde origin en is geen voorraadadministratie of serverback-up.

## Kleine onderdelen

- `demo/intake-bridge.js`: complete foto-overdracht, gegevens samenstellen, status van de invoer.
- `demo/store-bridge.js`: product toevoegen of bijwerken en navigatie binnen de boetiek.
- `demo/host.js`: schermen wisselen, basisvalidatie, lokale opslag en export.
- `scripts/build-connected-demo.mjs`: combineert de bestaande prototypes met de bruggen. Bouw opnieuw met `node scripts/build-connected-demo.mjs`.
- `tests/connected-demo.cjs`: doorloopt de werkelijke invoer in Chromium met een synthetische foto.

De bestaande prototypes blijven de bron voor de schermen. De bruggen draaien binnen hun eigen scherm; de app houdt beide schermen gemonteerd zodat scripts en element-ID’s niet botsen. Dit is een gerichte uitbreiding, nog geen volledige opsplitsing van alle bestaande HTML/CSS/JavaScript.

## Reikwijdte

Alleen een lokale proefwinkel: geen checkout, orders, mail, Airtable of echte voorraad. Er is geen automatische fotoanalyse. Werken in Gemini Canvas maakt de app niet automatisch een Gemini API-client. Er zijn geen sleutels opgenomen. Gemini's onvolledige aangeleverde fragmenten vervangen de bestaande schermen niet; de werkende GitHub-prototypes vormen de basis.

Getest in Chromium: foto-upload → handmatige checklist → carrousel → productpagina; prijs, maten, beschrijving en foto; wisselen zonder verlies; bijwerken zonder duplicaat; tweede kledingstuk; vijf stijlen; tekst met HTML-tekens; HTML-export en heropenen inclusief gekozen stijl. Externe aanvragen geblokkeerd. De proef gebruikt voorbeelddata, geen echte productclaims.

Gemini Canvas zelf is niet getest. De uitvoeromgeving moet scripts, srcdoc-frames, bestandskeuze en downloads ondersteunen. Als Canvas onderdelen blokkeert of je Gemini-limiet bereikt is, werkt het HTML-bestand zelfstandig in een gewone browser. Voor AI-fotovoorstellen is later een afzonderlijke gecontroleerde integratie nodig.

Testcommando met Playwright geïnstalleerd: `CHROMIUM_PATH=/usr/bin/chromium node tests/connected-demo.cjs`. Pas het browserpad aan waar nodig.
