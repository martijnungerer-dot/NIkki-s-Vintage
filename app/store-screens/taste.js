(function () {
  // Mijn smaak — BLAUWDRUK, NOG NIET GEBOUWD. Eigenaar: volgende Claude Code-sessie
  // (docs/SMAAKPROFIEL.md, onderdeel 4). Dit bestand wordt al meegebouwd maar registreert niets,
  // zodat de winkel ongewijzigd blijft tot dit onderdeel af is.
  //
  // Besluiten van Martijn (10 november 2026), zie docs/SMAAKPROFIEL.md "Besluiten":
  //   - "Mijn smaak" is een vierde regel in het Shop-menu (na Winkelmand of na Mijn favorieten).
  //   - Alles in het venster vult zich door de keuzes van de bezoeker; niets voorgevuld.
  //   - De bezoeker kan alles wissen, of één kenmerk tegelijk.
  //   - Knoppen meer/minder zoals dit staan in de foto, aan de andere kant dan het hartje.
  //   - Zoekfilters in Collectie tellen niet als voorkeur.
  //
  // Waarom geen React/Vue: de winkel is gewone JavaScript zonder build (AGENTS.md: geen tweede
  // systeem). Het venster gebruikt dezelfde aansluiting als Winkelmand: NikkiShop.registerScreen.
  //
  // Beschikbaar
  //   const P = window.NikkiTaste.profile, A = window.NikkiTaste.aggregate;
  //   P.load(localStorage, Date.now()) / P.save(localStorage, p) / P.clear(localStorage, now, p.enabled)
  //   A.applySignal(p, signal, now)   -> nieuw profiel (zie app/taste/types.d.ts voor Signal)
  //   A.summarize(p, now)             -> wat de bezoeker als "actief" ziet; null als het uit staat
  //   NikkiShop.onSignal(fn)          -> like/unlike/cart/uncart (+ publieke kopie); zoekfilters zenden niets
  //   NikkiShop.api.current()         -> het stuk in beeld; api.publicCopy(it) voor een signaal
  //
  // 1. Leren
  //   NikkiShop.onSignal((signal) => {
  //     const now = Date.now(); P.save(localStorage, A.applySignal(P.load(localStorage, now), signal, now)); });
  //
  // 2. Meer / minder zoals dit (in de foto)
  //   - Twee knoppen .on-photo in een eigen groep links in de foto, gespiegeld aan .photo-acts
  //     (delen + hartje) rechts. Iconen zonder tekst: duim omhoog / duim omlaag, of plus / min.
  //     aria-label "Meer zoals dit" / "Minder zoals dit", aria-pressed na tikken tot een ander stuk.
  //   - Tik: A.applySignal(p, {type:'more'|'less', item: api.publicCopy(api.current())}, now).
  //   - Voeg ze toe vanuit dit bestand (DOM na laden), zodat de kern ongewijzigd blijft. Let op de
  //     bestaande veeg- en dubbeltikbediening: knoppen in de foto worden al genegeerd door de gebaren.
  //   - Verberg ze zoals de andere fotoknoppen bij een lege catalogus ([data-catalog-empty]).
  //
  // 3. Venster (registerScreen('Mijn smaak', { render, action })), van boven naar beneden:
  //   [kop: terug-icoon · "Mijn smaak" · leeg vak]            (gedeelde kop, zoals Collectie)
  //   [schakelaar] Persoonlijke volgorde aan/uit              data-act="taste-enable"
  //   Uitleg, 16 px, één zin: "Je voorkeuren blijven in deze browser."
  //   Sectie "Meer van"      — summarize().prefer, label uit p.features[key].label of de expliciete waarde
  //   Sectie "Minder van"    — summarize().avoid
  //   Elke regel: label + ×-knop  data-act="taste-forget" data-key="<FeatureKey>"
  //   ({type:'forget'} wist het kenmerk overal, geleerd én expliciet). Geen budget- of keuzevelden
  //   (besluit 2): explicit en budget blijven leeg zolang Martijn daar niet anders over beslist.
  //   Onderaan: "Wis alles" (prullenbak-icoon)  data-act="taste-clear", met confirm
  //   Leeg profiel: "Nog geen voorkeuren. Hartjes, je winkelmand en meer/minder zoals dit vullen dit vanzelf."
  //   Geen keuzelijsten om zelf kenmerken toe te voegen: alles komt uit wat de bezoeker doet.
  //
  // 4. Regels
  //   - Stijl van optie B en Collectie: .head, .line, .chip, .ic, var(--chip) enz.; tekst ≥ 16 px,
  //     knoppen ≥ 44 px, alles via esc() (labels komen uit opslag en zijn dus onbetrouwbaar).
  //   - Menuregel toevoegen via een anker in scripts/build-cloud.mjs (zoals "Mijn favorieten").
  //   - Herordenen en de AI-aanroep bestaan al (onderdelen 5 en 6, app/store-screens/personalise.js).
  //     Roep na wissen (alles of één kenmerk) of aan/uit window.NikkiPersonalise.refresh() aan;
  //     na een hartje, mand of meer/minder niet (de volgorde blijft staan tijdens de sessie).
  //     Raak dat bestand niet aan.
  //   - Tests in tests/storefront-taste.cjs: leren via hartje/mand/meer/minder, terugdraaien,
  //     uit = niets leren, wissen houdt de uit-stand, één kenmerk vergeten, zoekfilter leert niets,
  //     veilige tekst, 44 px, geen netwerkverkeer behalve de bestaande catalogus.
})();
