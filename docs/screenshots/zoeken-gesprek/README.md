# Zoeken als gesprek — winkel en ontwerpvergelijking

De bestaande genummerde beelden tonen de goedgekeurde mock. De aanvullende beelden hieronder gebruiken de echte gebouwde winkel met lokale openbare teststukken, nagebootste Supabase/zoekdiensten en de echte lokaal geladen Newsreader. Er zijn geen productiegegevens of live Gemini-antwoorden gebruikt.

| Breedte | Vóór | Na | Gesprek open | Optie B | Mock |
| --- | --- | --- | --- | --- | --- |
| 390 × 844 | [Winkel vóór](app-before-390.png) | [Winkel na](app-after-390.png) | [Gesprek](app-conversation-390.png) | [Optie B](reference-390.png) | [Mock](mock-390.png) |
| 320 × 568 | [Winkel vóór](app-before-320.png) | [Winkel na](app-after-320.png) | [Gesprek](app-conversation-320.png) | [Optie B](reference-320.png) | [Mock](mock-320.png) |
| 1024 × 844 | [Winkel vóór](app-before-1024.png) | [Winkel na](app-after-1024.png) | [Gesprekskolom](app-conversation-1024.png) | [Optie B](reference-1024.png) | [Mock](mock-1024.png) |

De bestaande geometriecontrole normaliseert uitsluitend de extra hoogte van de goedgekeurde bovenbalk B; foto, naam, prijs en onderrij blijven met optie B vergeleken. Vanaf 900 px staat de gesprekskolom links naast de winkel. Tijdens zoeken blijven ook op 280 px vier stukvakjes zichtbaar; lege vakjes zijn uitgeschakeld. De nieuwe browsertest controleert daarnaast 280 × 568, focus, telefoon-terug, vier hulpstanden, geblokkeerde opslag, foutterugval en het uitblijven van voorraad- en smaakmutaties.

Opnieuw maken: `npm run build` en `CHROMIUM_PATH=/usr/bin/chromium node tests/zoeken-gesprek-browser.cjs`. Nieuwe beelden komen in `work/search-screenshots`; kopieer alleen de bedoelde beoordelingsbeelden naar deze map. De vóór-beelden zijn vastgelegd op de ongewijzigde `main` (9e67ad1), vóór integratie van de zoekfunctie.
