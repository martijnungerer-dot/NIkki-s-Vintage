(function () {
  // Mijn smaak — BLAUWDRUK, NOG NIET GEBOUWD. Eigenaar: volgende Claude Code-sessie
  // (docs/SMAAKPROFIEL.md, onderdeel 4). Dit bestand wordt al meegebouwd maar registreert niets,
  // zodat de winkel ongewijzigd blijft tot Martijn de plek in het menu heeft goedgekeurd.
  //
  // Waarom geen React/Vue: de winkel is gewone JavaScript zonder build (AGENTS.md: geen tweede
  // systeem). Het venster gebruikt dezelfde aansluiting als Winkelmand: NikkiShop.registerScreen.
  //
  // Beschikbaar
  //   const P = window.NikkiTaste.profile, A = window.NikkiTaste.aggregate;
  //   P.load(localStorage, Date.now()) / P.save(localStorage, p) / P.clear(localStorage, now, p.enabled)
  //   A.applySignal(p, signal, now)   -> nieuw profiel (zie app/taste/types.d.ts voor Signal)
  //   A.summarize(p, now)             -> wat de bezoeker als "actief" ziet; null als het uit staat
  //   NikkiShop.onSignal(fn)          -> like/unlike/cart/uncart (+ publieke kopie), browse-filter
  //
  // 1. Leren (zelfde PR als het venster, want transparantie hoort erbij)
  //   NikkiShop.onSignal((signal) => { if (signal.type === 'browse-filter') return; // zoekfilter ≠ voorkeur
  //     const now = Date.now(); P.save(localStorage, A.applySignal(P.load(localStorage, now), signal, now)); });
  //
  // 2. Venster (registerScreen('Mijn smaak', { render, action })), van boven naar beneden:
  //   [kop: terug-icoon · "Mijn smaak" · leeg vak]            (gedeelde kop, zoals Collectie)
  //   [schakelaar] Persoonlijke volgorde  aan/uit             data-act="taste-enable"
  //   Uitleg, 16 px, één zin: "Je voorkeuren blijven in deze browser. Er wordt niets over jou opgeslagen."
  //   Sectie "Dit zoek je"   — expliciete keuzes als chips met ×  data-act="taste-filter" (include, on:false)
  //   Sectie "Dit vermijd je" — idem voor exclude
  //   Sectie "Geleerd"        — top 12 uit summarize().prefer en .avoid, label uit p.features[key].label,
  //                             met ×-knop: data-act="taste-forget" data-key="<FeatureKey>"
  //   Toevoegen: per dimensie een <select> met waarden uit api.items() (zoals het materiaalfilter),
  //              twee knoppen met icoon (plus / min, zonder woorden): include of exclude
  //   Budget: <select> met de prijsklassen uit A.PRICE_BANDS of "Geen grens"  -> {type:'budget'}
  //   Onderaan: knop met prullenbak-icoon "Wis mijn smaak"   data-act="taste-clear" (bevestigen met confirm)
  //   Leeg profiel: "Nog geen voorkeuren. Hartjes en je winkelmand helpen de boetiek je smaak te leren."
  //
  // 3. Regels
  //   - Stijl van optie B en Collectie: .head, .line, .chip, .ic, var(--chip) enz.; tekst ≥ 16 px,
  //     knoppen ≥ 44 px, iconen zonder woorden, alles via esc() (labels komen uit opslag = onbetrouwbaar).
  //   - Nog géén herordening van de winkel en géén AI-aanroep; dat is onderdeel 5 en wacht op Martijn.
  //   - Menuplek: optie B heeft drie menuregels. Een vierde regel "Mijn smaak" (of een icoon in Mijn items)
  //     is een ontwerpwijziging: vraag het in de PR, met beelden op 390/320 px naast optie B.
  //   - Tests in tests/storefront-taste.cjs: leren via hartje/mand, terugdraaien, uit = niets leren,
  //     wissen houdt de uit-stand, vergeten van één kenmerk, veilige tekst, 44 px, geen netwerk-schrijfacties.
})();
