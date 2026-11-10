// @ts-check
// Smaakprofiel: lokale rangschikking (ook terugval zonder AI) en een stabiele volgorde per bladersessie.
// Vereist app/taste/aggregate.js. Plan: docs/SMAAKPROFIEL.md (onderdeel 2).
(function (root) {
  /** @typedef {import('./types').TasteItem} TasteItem */
  /** @typedef {import('./types').TasteSummary} TasteSummary */
  var A = root.NikkiTaste.aggregate;

  /** Som van de scores van de kenmerken van een stuk. 0 zonder profiel. @param {TasteItem} item @param {TasteSummary|null} summary */
  function scoreItem(item, summary) {
    if (!summary) return 0;
    return A.featuresOf(item).reduce(function (sum, pair) { return sum + (summary.prefer[pair[0]] || 0) + (summary.avoid[pair[0]] || 0); }, 0);
  }

  /**
   * Rangschikt stukken op smaak. Gelijke scores houden Nikki's volgorde (stabiel en voorspelbaar).
   * Stukken boven het budget gaan achteraan; verbergen is een interfacekeuze, geen voorraadbesluit.
   * Zonder profiel blijft de volgorde precies gelijk.
   * @template {TasteItem & {key:string}} T @param {T[]} items @param {TasteSummary|null} summary
   * @returns {{order:string[], overBudget:string[]}}
   */
  function rank(items, summary) {
    var budget = summary && summary.budget_max_minor;
    var scored = items.map(function (it, i) { return { key: it.key, i: i, s: scoreItem(it, summary), over: !!budget && it.priceMinor > budget }; });
    scored.sort(function (a, b) { return (a.over ? 1 : 0) - (b.over ? 1 : 0) || b.s - a.s || a.i - b.i; });
    return { order: scored.map(function (x) { return x.key; }), overBudget: scored.filter(function (x) { return x.over; }).map(function (x) { return x.key; }) };
  }

  /**
   * Houdt de volgorde van een lopende sessie vast: bestaande stukken blijven op hun plek, verdwenen
   * stukken vallen weg, nieuwe komen achteraan in de volgorde van `next`. Zo verspringt er niets
   * tijdens het bladeren; een nieuwe rangschikking pas bij sessiestart of een expliciete keuze.
   * @param {string[]|null} previous @param {string[]} next
   */
  function stableOrder(previous, next) {
    if (!Array.isArray(previous) || !previous.length) return next.slice();
    var present = new Set(next), kept = previous.filter(function (k) { return present.has(k); }), seen = new Set(kept);
    return kept.concat(next.filter(function (k) { return !seen.has(k); }));
  }

  root.NikkiTaste.ranking = { scoreItem: scoreItem, rank: rank, stableOrder: stableOrder };
})(typeof window !== 'undefined' ? window : globalThis);
