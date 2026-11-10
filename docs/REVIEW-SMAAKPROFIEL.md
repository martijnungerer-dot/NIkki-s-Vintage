# Review smaakprofiel en winkelmand (Gemini) en verwerking

Op 10 november 2026 heeft Martijn Gemini (Argon, hoog) gevraagd de code van PR #24 tot en met #26 te reviewen. Claude Code heeft elke bevinding tegen de code gecontroleerd en in PR #26 verwerkt. Hieronder eerst de verwerking, daarna de oorspronkelijke review ongewijzigd.

## Verwerking per bevinding

| Bevinding | Klopt? | Wat er is gedaan | Test |
|---|---|---|---|
| HIGH-1 terugbladeren bevriest de lijst | Ja | `keepCurrent` in `personalise.js`: alleen het stuk in beeld houdt zijn plek; de rest volgt de nieuwe volgorde. De sessie bewaart de zuivere AI-volgorde. | Browser: terugbladeren naar het laatste stuk vóór het antwoord |
| HIGH-2 te weinig uitvoertokens | Ja, ernstiger dan gemeld: 40 kandidaten passen ook zonder denkstappen niet in 768 tokens | `maxOutputTokens` naar 8192; alleen gebruikte tokens worden gerekend. **Niet** `thinkingBudget: 0`, omdat niet elk model (bijv. Pro) uitzetten van denken accepteert; dan zou elke aanroep mislukken. | Unit: plafond ≥ 4096 |
| HIGH-3 sessiecache vervalt na een hartje | Ja | Binnen een sessie geldt de bewaarde volgorde, ook als het profiel intussen veranderde. Alleen `refresh()` wist de cache. Herladen opent op de eerste AI-keuze. | Browser: profiel wijzigen, herladen, geen nieuwe aanroep |
| MED-1 `forget` en `browse-filter` | Ja | `forget` wist een kenmerk nu ook uit de expliciete keuzes. Het signaal `browse-filter` is weggehaald (zoekfilters zijn geen smaak). Blauwdruk `taste.js` bijgewerkt: geen budget- of keuzevelden. | Unit: forget van expliciete keuze |
| MED-2 kosten en misbruik | Ja | Uitleg (`want_rationale`) staat op de server vast uit. Een leeg profiel kost geen quotum, catalogus of AI. IPv6 telt per /64-blok. | Server: lege aanvraag, /64, uitleg genegeerd |
| MED-2 `x-forwarded-for` te vervalsen | Deels | `cf-connecting-ip` gaat voor. Wat het Supabase-platform in `x-forwarded-for` zet, is niet live gecontroleerd. De totale daglimiet van 2000 blijft de kostengrens. | Niet live getest |
| MED-3 terugdraaien verdiept afkeer | Ja | `unlike`/`uncart` laten een negatief gewicht ongemoeid. | Unit |
| MED-4 Nikki's volgorde na `put()`, zoom onderbroken, `choice?.` | Ja | `put()` bouwt in Nikki's volgorde; `personalise()` laat foto, zoom en vegen ongemoeid als het stuk in beeld gelijk blijft; optional chaining. | Bestaande browsertests |
| LOW-1 "leeg" én "tijdelijk niet te zien" | Ja | "Je winkelmand is leeg." alleen zonder verborgen stukken; focusherstel alleen bij een knop met `data-act`. | Browser |
| LOW-2 ontbrekende tests | Ja, grotendeels | Tests toegevoegd voor refresh(), herladen na profielwijziging, terugbladeren, unlike bij afkeer en forget. **Niet toegevoegd:** een stuk verkocht tijdens een persoonlijke sessie. Dat gedrag komt uit de bestaande kern (`replace`), die al met verkoop getest is. | — |

## Open beslispunten voor Martijn

Tot Martijn anders beslist, gelden de standaardaannames van de review:

1. **Budget of expliciete keuzes in "Mijn smaak"?** Nu niet: alles vult zich door gedrag (besluit 2).
2. **Direct herordenen na "meer/minder zoals dit"?** Nu niet: dat wordt opgeslagen en geldt vanaf de volgende sessie of na `refresh()`. Direct herordenen zou de volgende miniaturen tijdens het bladeren laten wisselen.
3. **"Waarom past dit bij jou?" tonen?** Nu niet: de server vraagt de uitleg niet op. Aanzetten is één regel in `handler.mjs`, zodra er een plek in het ontwerp is.

---

# Code Review: Smaakprofiel, Personalisatie & Winkelmand

Dit document bevat de bevindingen uit de senior code review van PR #24 (smaakprofiel, server-personalisatie en winkelmand). Het is geschreven als directe instructiebron voor een coding agent (zoals Claude Code of Codex) en als beslislijst voor de eigenaar (Martijn).

## 0. Context en randvoorwaarden voor de Agent

Lees vóór het uitvoeren van wijzigingen altijd eerst:
1. `AGENTS.md` (projectregels, publiek/privé-scheiding, unieke voorraad, geen herbouw van ontwerpbron `concept/ontdekken-optie-b.html`).
2. `docs/SMAAKPROFIEL.md` (architectuur en besluiten smaakprofiel).
3. `docs/FRONTEND-PLAN.md` (bestandsgrenzen en het contract `window.NikkiShop`).

**Harde regels bij het oplossen van onderstaande bevindingen:**
- Wijzig nooit de visuele indeling of stijl van `concept/ontdekken-optie-b.html` zonder expliciete opdracht.
- Behoud de strikte scheiding tussen publieke catalogusvelden en privévelden (geen stuk-ID's, prijzen of privévelden naar Gemini; geen stuk-ID's in `localStorage['nikki-taste']`).
- De voorbeeldbetaling in `app/store-screens/cart.js` mag niets reserveren of naar Supabase schrijven.
- Draai na elke wijziging `npm run build`, `npm test`, `npm run test:browser` en `npm run check`.

---

## 1. Samenvatting status quo

1. **Beveiliging en voorraad zijn op orde:** Privévelden, prijzen en UUID's zijn strikt afgeschermd van de AI, de unieke voorraad kan niet door de voorbeeldbetaling of een metadata-update worden gemuteerd, en `normalizeRanking` voorkomt dat de AI stukken of fotorollen verzint of weglaat.
2. **Functionele fouten in sessie- en AI-afhandeling:** Er zitten fouten in de herordeningslogica (`personalise.js`), de Gemini-tokenconfiguratie (`prompt.mjs`) en de afstemming tussen het datamodel en de blauwdruk voor "Mijn smaak" (`taste.js`).
3. **Gevolg in de praktijk:** Deze fouten veroorzaken geen datalekken of dubbelverkoop, maar zorgen er wel voor dat de AI-volgorde regelmatig stilzwijgend wordt genegeerd, wordt afgekapt of onverwacht verspringt bij herladen.

---

## 2. Beslispunten voor de eigenaar (Martijn)

Onderstaande drie vragen bepalen hoe `MED-1`, `HIGH-1` en `MED-2` exact moeten worden afgehandeld:

- [ ] **BESLUIT-1 (Expliciete keuzes en budget in "Mijn smaak"):**
  - *Context:* Volgens `docs/SMAAKPROFIEL.md` (Besluit 2 & 3) vult alles in "Mijn smaak" zich vanzelf door keuzes van de bezoeker (geen keuzelijsten) en tellen zoekfilters in Collectie niet mee. Daardoor kan een bezoeker nergens in de UI `explicit.include`, `explicit.exclude` of `explicit.maxPriceMinor` instellen, terwijl de blauwdruk in `app/store-screens/taste.js` (regel 43–44) wél vraagt om wis-knoppen hiervoor.
  - *Vraag:* Moet er in "Mijn smaak" wél een eenvoudig budgetveld komen, of blijven `budget` en `explicit` helemaal weg uit de UI van onderdeel 4?
  - *Standaardaanname voor agents zolang onbeantwoord:* Laat `budget` en `explicit` weg uit de UI van `taste.js`, maar zorg dat `{type: 'forget'}` in `aggregate.js` veilig zowel `features` als `explicit` opschoont.

- [ ] **BESLUIT-2 (Direct herordenen bij "Meer / minder zoals dit" op de foto):**
  - *Context:* Als een bezoeker op de foto op "Meer zoals dit" of "Minder zoals dit" tikt, verandert het profiel in `localStorage`, maar blijft de wachtrij van de lopende sessie ongewijzigd tot een volgende sessie.
  - *Vraag:* Moet een klik op "meer/minder zoals dit" de resterende (nog niet bekeken) stukken in de huidige sessie direct lokaal herordenen, of pas bij een nieuw bezoek?
  - *Standaardaanname voor agents zolang onbeantwoord:* Alleen opslaan in `localStorage`; herordenen gebeurt pas bij sessiestart of via `NikkiPersonalise.refresh()` vanuit het venster "Mijn smaak".

- [ ] **BESLUIT-3 (Gebruik van `why` / `want_rationale`):**
  - *Context:* De server ondersteunt het genereren van een korte toelichting per stuk (`want_rationale`), maar de winkel toont die nog nergens.
  - *Vraag:* Wordt die toelichting binnenkort getoond (bv. in het informatievenster), of zetten we `want_rationale` op de server voorlopig vast op `false` om tokens en responstijd te besparen?
  - *Standaardaanname voor agents zolang onbeantwoord:* Hardcode `wantRationale = false` in `handler.mjs` (negeer `body.want_rationale` van de client).

---

## 3. Bevindingen en herstelinstructies

### [HIGH-1] Niet-lineair bladeren bevriest de volledige lijst in `keepSeen`
- **Ernst:** Hoog
- **Bestand:** `app/store-screens/personalise.js`
- **Functies:** `keepSeen(next)`, `start(first)`, `window.NikkiPersonalise.refresh()`
- **Probleem:**
  1. `keepSeen` bevriest alles vanaf index `0` tot en met het stuk in beeld: `var head = current ? now.slice(0, now.indexOf(current.key) + 1) : [];`. De winkel ondersteunt echter rondbladeren (terugvegen vanaf stuk `0` naar `N - 1`) en sprongen vanuit Collectie.
  2. `window.NikkiPersonalise.refresh()` roept `start(false)` aan, dat eveneens `keepSeen` gebruikt.
- **Reproductiescenario:**
  - Bezoeker opent de winkel op stuk `0` en veegt één keer terug naar stuk `N - 1` voordat de asynchrone AI-aanroep klaar is.
  - `now.indexOf(current.key)` is nu `N - 1`. `head` bevat de volledige catalogus.
  - De volledige AI-rangschikking wordt genegeerd en de oude lijst wordt in `sessionStorage` opgeslagen voor de rest van de sessie.
  - Ook wanneer een bezoeker halverwege de catalogus in "Mijn smaak" een voorkeur wist (`refresh()`), blijven alle eerdere stukken vóór `current.key` ongewijzigd bovenaan staan.
- **Oplossing:**
  - Verander `keepSeen(next)` zodat alleen het huidige stuk in beeld (`current.key`) en daadwerkelijk tijdens deze sessie bekeken stukken (of bij `refresh()` uitsluitend `current.key` op de huidige positie) behouden blijven, in plaats van een blinde `slice(0, index + 1)`.
  - Sla in `sessionStorage` (`nikki-taste-order`) de zuivere `choice.order` op (of zorg dat niet-bekeken stukken altijd de AI-volgorde volgen).

---

### [HIGH-2] Gemini `maxOutputTokens: 768` zonder `thinkingConfig` kapt JSON-uitvoer af
- **Ernst:** Hoog
- **Bestand:** `supabase/functions/personalise/prompt.mjs` (en verwerking in `supabase/functions/personalise/handler.mjs`)
- **Functie:** `geminiBody(payload)`
- **Probleem:**
  - In `handler.mjs` worden denkstappen weggefilterd (`.filter(p=>!p.thought&&typeof p.text==='string')`), wat aangeeft dat Gemini 2.5/3-modellen met *thinking* worden gebruikt.
  - In `prompt.mjs` zet `geminiBody` `maxOutputTokens: payload.want_rationale ? 2048 : 768` zonder `thinkingConfig`. Bij Gemini telt het denkbudget mee binnen `maxOutputTokens`.
- **Reproductiescenario:**
  - Bij 30–40 kandidaten gebruikt het model 500–700 tokens aan interne `thought`-parts.
  - De daadwerkelijke JSON-tekst wordt halverwege afgebroken op de grens van 768 tokens.
  - `JSON.parse(text)` in `handler.mjs` gooit een `SyntaxError`, waardoor de functie bij vrijwel elke echte aanroep terugvalt op `source: 'fallback'` terwijl de betaalde Gemini-aanroep wél is uitgevoerd.
- **Oplossing:**
  - Zet in `geminiBody(payload)` (`supabase/functions/personalise/prompt.mjs`) het denkbudget uit of verhoog de tokenlimiet:
    ```js
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: payload.want_rationale ? 2048 : 1024,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 }
    }
    ```

---

### [HIGH-3] Sessiecache in `sessionStorage` vervalt bij elk geleerd signaal na pagina-reload
- **Ernst:** Hoog
- **Bestand:** `app/store-screens/personalise.js`
- **Functie:** `start(first)`
- **Probleem:**
  - De sessiecache wordt gecontroleerd met `if (cached && cached.profile === profile && Array.isArray(cached.order))`, waarbij `profile = JSON.stringify(s)` de actuele output van `summarize()` is.
  - Volgens `docs/SMAAKPROFIEL.md` (*"Tijdens de sessie blijft die volgorde staan, ook na herladen, zonder nieuwe aanroep. Een nieuwe volgorde komt bij een nieuwe sessie, of als 'Mijn smaak' NikkiPersonalise.refresh() aanroept"*) mag bladeren en klikken op hartjes/mandje de sessievolgorde niet verversen.
- **Reproductiescenario:**
  - Bezoeker opent de winkel (AI-rangschikking wordt opgeslagen in `sessionStorage`).
  - Bezoeker geeft één stuk een hartje of legt het in de winkelmand. Zodra `taste.js` (onderdeel 4) actief is, wijzigt dit de gewichten in `localStorage['nikki-taste']` en daarmee `JSON.stringify(s)`.
  - Bezoeker herlaadt de pagina (`F5`). Omdat `cached.profile !== profile`, wordt de cache genegeerd, doet de browser een nieuwe AI-aanroep en verspringt bovendien het eerste stuk (`fromStart: true`).
- **Oplossing:**
  - Gebruik tijdens dezelfde sessie bij `start(true)` de gecachete `cached.order` en `cached.lead` uit `sessionStorage` zolang `Array.isArray(cached?.order)` geldig is en personalisatie aan staat (`hasTaste(s)`), ongeacht kleine tussentijdse gewichtswijzigingen in `s`.
  - `window.NikkiPersonalise.refresh()` wist de sessiecache al expliciet (`writeSession(null)`) wanneer de bezoeker in "Mijn smaak" een voorkeur aanpast of wist.

---

### [MED-1] Inconsistentie tussen `taste.js`-blauwdruk, `forget`-signaal en `browse-filter`
- **Ernst:** Middel
- **Bestanden:** `app/store-screens/taste.js`, `app/taste/aggregate.js`, `app/store-extension.js`
- **Functies:** `applySignal` in `aggregate.js` (regel 69), `change`-eventlistener in `store-extension.js` (regel 198), instructies in `taste.js` (regel 43–44)
- **Probleem:**
  1. `store-extension.js` (regel 198) emitteert `{type: 'browse-filter', dimension: 'material', value: e.target.value}`. Dit signaaltype bestaat niet in `app/taste/types.d.ts` en volgens Besluit 3 tellen zoekfilters in Collectie niet mee.
  2. In `aggregate.js` (regel 69) verwijdert `else if (s.type === 'forget')` een sleutel alleen uit `p.features` (`delete f[s.key]`), maar niet uit `p.explicit.include` of `p.explicit.exclude`.
  3. De commentaar-blauwdruk in `app/store-screens/taste.js` (regel 43–44) instrueert de volgende sessie om aparte afhandeling te bouwen voor `explicit` (`filter on:false`) en `budget`, terwijl regel 47 zegt dat de bezoeker zelf geen keuzelijsten krijgt.
- **Reproductiescenario:**
  - Als een profiel een expliciete voorkeur bevat (bv. uit een test of eerdere versie) en de bezoeker klikt op `×` (`data-act="taste-forget"`), stuurt de UI `{type: 'forget', key}`. Het kenmerk verdwijnt niet uit `summarize()`, omdat `p.explicit` nog intact is.
- **Oplossing:**
  1. Pas `s.type === 'forget'` in `app/taste/aggregate.js` aan zodat een `key` (bv. `"material:wol"`) niet alleen uit `p.features` wordt gewist, maar ook de bijbehorende waarde uit `p.explicit.include[dim]` en `p.explicit.exclude[dim]` verwijdert.
  2. Verwijder de overbodige `emitSignal({type:'browse-filter',...})`-aanroep uit `app/store-extension.js` (of documenteer in `types.d.ts` dat dit signaal genegeerd wordt).
  3. Werk de blauwdruk-commentaren in `app/store-screens/taste.js` bij aan de hand van `BESLUIT-1`.

---

### [MED-2] Kosten- en quotabescherming in de openbare `personalise`-serverfunctie
- **Ernst:** Middel
- **Bestanden:** `supabase/functions/personalise/handler.mjs`, `supabase/functions/personalise/prompt.mjs`
- **Functies:** `createHandler`, `clientId`
- **Probleem:**
  1. `const wantRationale = body.want_rationale === true;` vertrouwt een vlag van een anonieme client die het output-tokenbudget verdrievoudigt en via `SYSTEM_PROMPT` (`"noem daarin alleen kenmerken uit de tags van dat stuk en uit 'prefer'"`) tekst uit `prefer`-sleutels kan laten terugkaatsen.
  2. `consume_personalise` (database-write) en de catalogus-query worden aangeroepen vóórdat is gecontroleerd of het profiel überhaupt voorkeuren/budget heeft en of Gemini is geconfigureerd.
  3. `clientId` valt bij ontbreken van `cf-connecting-ip` terug op `x-forwarded-for?.split(',')[0]` (door een client te vervalsen als er geen Cloudflare voor staat) en neemt een volledig IPv6-adres op in de HMAC in plaats van een `/64`-subnet.
- **Reproductiescenario:**
  - Een aanvaller met een standaard IPv6 `/64`-reeks verstuurt 2000 verzoeken vanaf verschillende adressen binnen zijn eigen `/64` met `want_rationale: true`. Het globale dagquotum (`2000` in `consume_personalise`) raakt uitgeput voor alle andere bezoekers en de Gemini-kosten per aanroep zijn onnodig hoog.
- **Oplossing:**
  1. Zet in `handler.mjs` `const wantRationale = false;` (totdat de winkel `why` daadwerkelijk toont, zie `BESLUIT-3`).
  2. Controleer vóór de RPC `consume_personalise` of `Object.keys(summary.prefer).length + Object.keys(summary.avoid).length > 0 || summary.budget_max_minor !== null`. Zo niet, geef direct een lege/ongewijzigde respons terug zonder quotum of Gemini te belasten.
  3. Normaliseer IPv6-adressen in `clientId` naar de eerste 4 hextets (`/64`-prefix) vóór het berekenen van de HMAC.

---

### [MED-3] `unlike` en `uncart` verlagen al negatieve kenmerkgewichten verder
- **Ernst:** Middel
- **Bestand:** `app/taste/aggregate.js`
- **Functie:** `learn(profile, item, weight, now, floorAtZero)`
- **Probleem:**
  - Regel 41: `if (floorAtZero && before >= 0) w = Math.max(0, w);`.
  - Volgens `docs/SMAAKPROFIEL.md` (*"Een hartje of mand terugdraaien haalt de bonus weg, maar maakt geen afkeer"*) mag het weghalen van een hartje of mand-item nooit tot een lagere negatieve score leiden.
- **Reproductiescenario:**
  - Bezoeker geeft stuk A (wol) een hartje (`+0.5`), en klikt later bij stuk B (ook wol) tweemaal op "minder zoals dit" (of éénmaal na verval), waardoor `material:wol` op `before = -0.5` staat.
  - Vervolgens haalt de bezoeker het hartje bij stuk A weg (`unlike`, `weight = -0.5`, `floorAtZero = true`).
  - Omdat `before < 0`, wordt de `if`-tak overgeslagen en daalt `w` naar `-1.0`.
- **Oplossing:**
  - Vervang in `learn` (`app/taste/aggregate.js`, regel 41):
    ```js
    if (floorAtZero) w = before > 0 ? Math.max(0, w) : before;
    ```

---

### [MED-4] Verlies van `boutique`-volgorde bij `put()` en onnodige `#track`-reset bij `personalise()`
- **Ernst:** Middel
- **Bestand:** `app/store-extension.js`
- **Functies:** `NikkiStore.replace`, `NikkiStore.put`, `api.personalise`
- **Probleem:**
  1. `NikkiStore.put(record)` roept `this.replace([...ITEMS.filter(it=>it.key!==record.key), record])` aan. Omdat `ITEMS` al gepersonaliseerd gesorteerd is, kent `replace` via `.map((r, boutique) => ({ boutique, ... }))` de gepersonaliseerde volgorde toe als de nieuwe `boutique`-index (Nikki's volgorde).
  2. Wanneer het AI-antwoord asynchroon binnenkomt, roept `api.personalise` (met `fromStart: false`) `render(false)` aan, wat via `renderTrack()` de volledige `#track`-DOM vervangt.
  3. Regel 270 gebruikt `if (choice.fromStart)` zonder optional chaining, terwijl regel 262–263 `choice?.order` gebruikt.
- **Reproductiescenario:**
  - Bezoeker opent de winkel en zoomt direct in op de eerste foto (dubbeltik) of begint te vegen. Een halve seconde later komt het AI-antwoord binnen: `renderTrack()` vervangt de DOM-elementen, waardoor de inline `transformOrigin` van de zoom verdwijnt en een lopende swipe hapert.
  - Als na een `put()` personalisatie wordt uitgezet (`api.personalise({order: null, lead: {}})`), keert de lijst niet meer terug naar Nikki's oorspronkelijke volgorde.
- **Oplossing:**
  1. Behoud in `NikkiStore.replace` een bestaande `boutique`-index: `boutique: Number.isInteger(r.boutique) ? r.boutique : boutique`.
  2. Gebruik `if (choice?.fromStart)` op regel 270 van `app/store-extension.js`.
  3. Als bij `render(false)` het getoonde stuk (`ITEMS[S.item]?.key`) en de lijst van afbeeldings-URL's van dat stuk niet zijn veranderd, werk dan alleen de knoppen, dots en `#nexts`-miniaturen bij zonder `#track.innerHTML` te overschrijven.

---

### [LOW-1] Tegenstrijdige melding in Winkelmand bij fotostoring en focus-herstel in `refreshList`
- **Ernst:** Laag
- **Bestanden:** `app/store-screens/cart.js`, `app/store-extension.js`
- **Functies:** `render` in `cart.js` (regel 20), `refreshList` in `store-extension.js` (regel 131–136)
- **Probleem:**
  1. In `cart.js` staat: `if (!lines.length) { step = 'cart'; return '<p ...>Je winkelmand is leeg.</p>' + hiddenNote + NOTE; }`. Als er 1 stuk in de mand zit waarvan de foto tijdelijk niet laadt (`keys.length === 1`, `lines.length === 0`, `hidden === 1`), ziet de bezoeker tegelijk *"Je winkelmand is leeg."* én *"1 stuk in je winkelmand is tijdelijk niet te zien."*
  2. In `store-extension.js` zoekt `refreshList()` bij een geregistreerd scherm naar `b.dataset.act === act && b.dataset.key === key`. Als de gefocuste knop geen `data-act` had (`act === undefined`), matcht dit de eerste willekeurige knop zonder `data-act` en `data-key`.
- **Oplossing:**
  1. Laat `cart.js` bij `!lines.length` de tekst *"Je winkelmand is leeg."* alleen tonen als `hidden === 0`.
  2. Wijzig de focus-zoekopdracht in `refreshList()` (`app/store-extension.js`, regel 134) naar:
     ```js
     var same = act && Array.from($('cart').querySelectorAll('button')).find(b => b.dataset.act === act && b.dataset.key === key);
     ```

---

### [LOW-2] Ontbrekende automatische tests voor randgevallen
- **Ernst:** Laag
- **Bestanden:** `tests/storefront-personalise.cjs`, `tests/taste.test.mjs`
- **Probleem:**
  - De volgende scenario's uit `docs/SMAAKPROFIEL.md` worden nog niet getest:
    1. Een aanroep van `window.NikkiPersonalise.refresh()` terwijl de bezoeker al op stuk 2 of 3 staat.
    2. Een signaal (`like` of `cart`) gevolgd door een pagina-reload in dezelfde sessie (bewaakt `HIGH-3`).
    3. Terugvegen naar het laatste stuk vóórdat het AI-antwoord binnenkomt (bewaakt `HIGH-1`).
    4. Een `unlike` op een stuk waarvan een kenmerk inmiddels een negatief gewicht heeft (bewaakt `MED-3`).
    5. Het als `sold` markeren van het huidige stuk tijdens een gepersonaliseerde sessie.
- **Oplossing:**
  - Voeg een unit-test toe in `tests/taste.test.mjs` voor `unlike` bij een negatief gewicht (`MED-3`) en voor `forget` van een expliciete voorkeur (`MED-1`).
  - Voeg in `tests/storefront-personalise.cjs` assertions toe voor `NikkiPersonalise.refresh()` en voor het behouden van de sessiecache na een tussentijdse profielwijziging.

---
