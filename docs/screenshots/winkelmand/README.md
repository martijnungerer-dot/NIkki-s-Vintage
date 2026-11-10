# Winkelmand — voor, na en optie B

Vastgelegd op 10 november 2026 in Chromium, bij viewports van 390 × 844 en 320 × 844 px. Links staat de goedgekeurde `main` 5bc7199 (alleen de proefmelding). Daarna volgen het ingevulde mandoverzicht en de stap Voorbeeldbetaling. Rechts staat de referentie `concept/ontdekken-optie-b.html` met voorbeeldgegevens. Op verzoek van Martijn heet de knop Betalen in plaats van Afrekenen. Betalen doorloopt alleen een voorbeeld: er wordt niets betaald of gereserveerd, en de mand blijft staan.

De records en tekeningen komen uit de catalogus-testinterface. Er staan geen echte inventaris, privéfoto's, klantgegevens of fototokens in beeld. Externe fonts zijn geblokkeerd, dus alle kanten gebruiken de Georgia-terugval.

![Winkelmand op 390 px — voor, na en optie B](cart-390-comparison.png)

![Winkelmand op 320 px — voor, na en optie B](cart-320-comparison.png)

Opnieuw maken: `npm run build && npm run test:browser`. De browsertest schrijft `cart-<breedte>.png`, `pay-<breedte>.png` en `reference-cart-<breedte>.png` naar `work/option-b-screenshots/`. Het voor-beeld is gemaakt met dezelfde test op `main`.
