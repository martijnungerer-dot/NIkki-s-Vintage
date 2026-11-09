# Optie B — visuele vergelijking

Vastgelegd op 9 november 2026 met Chromium. Links staat `concept/ontdekken-optie-b.html`, rechts de gebouwde cloudpilot uit `app/`. Viewports: 390 × 844 en 320 × 844 px. De vergelijkingen hieronder zijn uitsneden van hetzelfde telefoonkader; geen schaling of retouche.

De cloudpilot leest in deze test synthetische publieke records via de nagebootste bestaande catalogus-API en beveiligde foto-route. De tekeningen, namen en prijzen zijn testgegevens, geen echte inventaris. Geen privéfoto's, fototokens of klantgegevens vastgelegd. Externe fonts zijn in de test geblokkeerd, dus beide kanten gebruiken de bestaande Georgia-terugval; in de app blijft dezelfde Newsreader-link als in de referentie staan.

![390 px: referentie naast cloudpilot](option-b-390.png)

![320 px: referentie naast cloudpilot](option-b-320.png)

Volledige pagina's, inclusief de ontwerpnotitie boven de referentie en de laadstatus boven de app:

| Viewport | Referentie | Cloudpilot |
|---|---|---|
| 390 px | [Volledige referentie](reference-390.png) | [Volledige app](app-390.png) |
| 320 px | [Volledige referentie](reference-320.png) | [Volledige app](app-320.png) |

Herhalen: `npm run build && npm run test:browser`. De losse PNG's komen in `work/option-b-screenshots/` (instelbaar met `NIKKI_SCREENSHOTS`). De test vergelijkt afmetingen, posities en berekende stijlen rechtstreeks met de referentie, controleert de volgorde foto / naam-prijs / onderrij, alle zichtbare knoppen van minstens 44 px en geen tekst over de foto. Op 390 px blijft de oorspronkelijke knoppenbreedte circa 48,8 px met 8 px tussenruimte; op 320 px zijn er drie volgende stukken, knoppen van 44 px en 6 px tussenruimte. Een extra controle op 280 px bewaakt de terugval naar twee volgende stukken.

De cloudtest bewaakt daarnaast invoer, opslag, beveiligde fotolinks, behoud van het open venster en de gekozen foto bij vernieuwing, en verkocht-status. Deze checks gebruiken nagebootste diensten; live Supabase Auth/Storage en Gemini zijn voor deze wijziging niet opnieuw getest. Geen deployment of migratie uitgevoerd.

Aanvullende lokale controle buiten de cloudtests: `tests/ontdekken-optie-b.cjs` slaagt. `tests/prototypes.cjs` en `tests/connected-demo.cjs` stoppen in deze Windows/Chromium-omgeving bij de HTML-export met `download.path: canceled`; de betrokken prototypebestanden en tests zijn ongewijzigd. Die exportcontroles zijn dus niet groen bevestigd en zijn geen onderdeel van `npm run test:browser`.
