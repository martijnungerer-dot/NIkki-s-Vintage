# Review kit

Een kleine, zelfstandige opmerkingenlaag voor apps die getest of beoordeeld worden. Een tester tikt op het gele potloodje, markeert iets op het scherm (slepen of tikken), kiest **Opmerking**, **Aanpassing** of **Vraag** en typt een tekst. De opmerking wordt bewaard met de plek en een beschrijving van wat er gemarkeerd is. Er gebeurt verder niets mee: het is alleen een logboek.

Eén bestand (`review-kit.js`), geen afhankelijkheden, werkt in gewone browsers en op telefoons. Werkt ook over iframes van dezelfde herkomst heen.

## Gebruik in een andere app

```js
import {createReviewKit} from './review-kit/review-kit.js';

const kit = createReviewKit({
  save: (kind, body, context) => fetch('/api/notes', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({kind, body, context})}).then(r => { if (!r.ok) throw Error('niet bewaard'); }),
  isEnabled: () => true,          // bijvoorbeeld: alleen voor ingelogde testers
  context: () => ({screen: location.hash}) // kleine extra informatie per opmerking
});
// kit.destroy() haalt alles weer weg.
```

- `save(kind, body, context)` moet een Promise teruggeven en bij een fout gooien. `kind` is `opmerking`, `aanpassing` of `vraag`.
- Mislukt bewaren (bijvoorbeeld zonder bereik), dan blijft de opmerking in `localStorage` (`review-kit-queue`) en wordt hij vanzelf opnieuw verstuurd zodra `save` weer lukt.
- `context` bevat altijd: `target` (frame, tag, id, aria-label en de zichtbare tekst van het gemarkeerde element, hoogstens 120 tekens), `rect` (de gele markering), `viewport`, `page` en `at`, plus wat jouw `context()` teruggeeft.
- **Nooit bewaard:** waarden van invoervelden (dus geen wachtwoorden of ingetypte gegevens).
- Kleuren en letter zijn aan te passen met de CSS-variabelen `--rk-bg`, `--rk-fg`, `--rk-line`, `--rk-mark`, `--rk-mark-fill`, `--rk-mark-line` en `--rk-font` op `.rk-host`.
- Bediening: knoppen minstens 44 px, Escape annuleert, labels en `role="status"` voor de bevestiging.

Test: `tests/review-kit.cjs` (Playwright).

## In Nikki's Boetiek

- Zichtbaar alleen voor ingelogde beheerders (`app/admin/review.js`).
- Opmerkingen gaan naar de tabel `public.review_notes` via de serverfunctie `add_review_note` (`supabase/migrations/20261114120000_review_notes.sql`). Alleen beheerders kunnen schrijven en lezen; niemand kan opmerkingen wijzigen of wissen via de app. Hoogstens 500 per tester per dag.
- Uitrollen: `npx supabase db push --remote` (voegt alleen deze tabel en functie toe). Uitgerold op 14 november 2026.
- Lezen, in de SQL-editor van Supabase:

```sql
select created_at, kind, body, context->>'screen' as scherm,
       context->'target'->>'frame' as venster, context->'target'->>'text' as gemarkeerd
from public.review_notes order by created_at desc;
```

## Weghalen als de app klaar is

1. Verwijder `app/admin/review.js` en de twee regels met `startReview` in `app/main.js`.
2. Verwijder de map `app/review-kit/` niet als je hem elders wilt hergebruiken; haal anders ook de kopieerregels voor `review-kit` uit `scripts/build-cloud.mjs`.
3. Haal `tests/review-kit.cjs` en `tests/review-notes.test.mjs` uit `package.json`.
4. Database (na het bewaren van de opmerkingen die je wilt houden), in een nieuwe migratie: `drop function public.add_review_note(text,text,jsonb); drop table public.review_notes;`
