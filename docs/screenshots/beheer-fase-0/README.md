# Beheer fase 0: opsplitsing zonder zichtbare verandering

Basis: `main` op `516df19`. Branch: `codex/beheer-fase-0-modules`.

Chromium 156, 390 × 844 en 320 × 844, synthetische collectie en nagebootste diensten. Geen productiegegevens. De zes vergelijkingen zijn pixel voor pixel gelijk (RGB): inloggen, collectie en boetiek op beide breedtes. De muis staat buiten de bediening, zodat hover niet verschilt. Externe fonts worden in deze lokale vergelijking geblokkeerd; beide versies gebruiken dezelfde fallback.

| Scherm | Voor 390 | Na 390 | Voor 320 | Na 320 |
|---|---|---|---|---|
| Inloggen | [Voor](before/login-390.png) | [Na](after/login-390.png) | [Voor](before/login-320.png) | [Na](after/login-320.png) |
| Collectie | [Voor](before/collection-390.png) | [Na](after/collection-390.png) | [Voor](before/collection-320.png) | [Na](after/collection-320.png) |
| Boetiek | [Voor](before/shop-390.png) | [Na](after/shop-390.png) | [Voor](before/shop-320.png) | [Na](after/shop-320.png) |

## Controles en overdracht

- Build, 51 Node-/databasetests, volledige bestaande browsersuite, projectcontrole en `git diff --check`: geslaagd op de refactor. Bestaande tests zijn niet aangepast.
- De baseline op ongewijzigde main faalde bij `tests/storefront-share.cjs:65`: de test leest het klembord zonder op de asynchrone kopieerbevestiging te wachten. De volledige suite op de refactor slaagde, maar dit bestaande timingprobleem kan opnieuw optreden. Niet als opgelost beschouwen.
- `app/main.js`: opstarten, schermwissel, bestaand `window.NikkiApp`-contract. `app/admin/index.js`: gedeelde toestand en actievergrendeling; `header.js`: bediening en kleurkoppeling; `login.js`: sessie en inloggen; `collection.js`: fotolinks, lijst, bewerken, verkocht en vernieuwing.
- Tokens komen letterlijk uit optie B, met 16 px en 44 px als minima voor de volgende schermen. Deze fase past geen nieuwe typografie toe. De bestaande kleinere tekst in `app/style.css` blijft zichtbaar en is werk voor het vastgestelde fase-1-ontwerp. Semantische knoppen, labels, focus en bevestigingen blijven behouden.
- Geen API-, opslag-, rechten-, AI-, intake- of boetiekwijzigingen. Live Supabase/Gemini en fysieke telefoons niet getest.
- Review door Claude Code: let op de gedeelde staff-/busy-toestand, versienummers bij bewerken, complete foto's bij opslaan, de vernieuwingscyclus en ongewijzigde selectors. Merge door Martijn.
- Volgende stap: bovenbalk/inloggen en daarna collectie in aparte PR's. Het vastgestelde Claude Design-artefact blijft de bron; het oudere PR #32-ontwerp is geen basis. Inloggen moet eerst worden vastgesteld. Backendwerk wacht op apart akkoord.
