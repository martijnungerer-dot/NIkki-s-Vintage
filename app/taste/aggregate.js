// @ts-check
// Smaakprofiel: interacties -> kenmerkvoorkeuren -> compacte samenvatting. Pure functies, geen DOM/opslag.
// Vereist app/taste/profile.js. Contract: app/taste/types.d.ts. Plan: docs/SMAAKPROFIEL.md (onderdeel 2).
// De server heeft een eigen kopie van featuresOf (supabase/functions/personalise/prompt.mjs);
// tests/taste.test.mjs bewaakt dat beide dezelfde kenmerken geven.
(function (root) {
  /** @typedef {import('./types').TasteProfile} TasteProfile */
  /** @typedef {import('./types').TasteItem} TasteItem */
  /** @typedef {import('./types').Signal} Signal */
  /** @typedef {import('./types').TasteSummary} TasteSummary */
  var P = root.NikkiTaste.profile;

  // Signaalweging. Expliciete keuzes staan los (explicit) en tellen in summarize als ±1.
  var WEIGHTS = { more: 1, less: -1, like: 0.5, cart: 0.4, dwell: 0 };
  // Conditie is geen smaak: deze bijzonderheden tellen niet mee.
  var CONDITION = ['vlek', 'kale plek', 'reparatie', 'ontbrekende knoop', 'voering vernieuwd', 'geen'];
  var PRICE_BANDS = [[0, 10000, 'tot-100'], [10000, 20000, '100-200'], [20000, 35000, '200-350'], [35000, 60000, '350-600'], [60000, Infinity, '600-plus']];
  var EXPLICIT_SCORE = 1, LEARNED_SCALE = P.MAX_WEIGHT;

  function fold(value) {
    return String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  function key(dimension, value) { var f = fold(value); return f ? dimension + ':' + f : null; }
  function priceBand(minor) {
    if (!Number.isInteger(minor) || minor < 1) return null;
    var band = PRICE_BANDS.find(function (b) { return minor >= b[0] && minor < b[1]; });
    return band ? String(band[2]) : null;
  }

  /** Kenmerken van één stuk als [key, label]-paren. Alleen ingevulde publieke velden. @param {TasteItem} item */
  function featuresOf(item) {
    /** @type {Array<[string,string]>} */ var out = [];
    function add(dimension, value) {
      if (typeof value !== 'string' || !value.trim()) return;
      var k = key(dimension, value); if (k && !out.some(function (e) { return e[0] === k; })) out.push([k, value.trim().slice(0, 60)]);
    }
    add('material', item.material); add('model', item.model); add('colour', item.colour);
    add('length', item.length); add('fit', item.fit);
    if (item.era && fold(item.era) !== 'onbekend') add('era', item.era);
    (Array.isArray(item.details) ? item.details : []).slice(0, 30).forEach(function (d) { if (typeof d === 'string' && CONDITION.indexOf(fold(d)) < 0) add('detail', d); });
    add('fur', item.furClass);
    var band = priceBand(item.priceMinor); if (band) out.push(['price:' + band, band]);
    return out;
  }

  function learn(profile, item, weight, now, floorAtZero) {
    var features = Object.assign({}, profile.features);
    featuresOf(item).forEach(function (pair) {
      var old = features[pair[0]], before = old ? P.decayed(old, now) : 0, w = before + weight;
      // Een hartje of mand terugdraaien haalt alleen een bonus weg: nooit (meer) afkeer (review MED-3).
      if (floorAtZero) w = before > 0 ? Math.max(0, w) : before;
      features[pair[0]] = { w: Math.max(-P.MAX_WEIGHT, Math.min(P.MAX_WEIGHT, w)), t: now, label: pair[1] };
    });
    return Object.assign({}, profile, { features: features });
  }
  function bump(profile, name, step) {
    var counts = Object.assign({}, profile.counts); counts[name] = Math.max(0, counts[name] + step);
    return Object.assign({}, profile, { counts: counts });
  }

  /**
   * Verwerkt één interactie. Geeft een nieuw profiel terug; het oude blijft ongewijzigd.
   * Staat personalisatie uit, dan wordt er niets geleerd (expliciete instellingen mogen wel).
   * @param {TasteProfile} profile @param {Signal} signal @param {number} now
   * @returns {TasteProfile}
   */
  function applySignal(profile, signal, now) {
    var p = P.sanitize(profile, now), s = signal;
    if (!s || typeof s !== 'object') return p;
    if (s.type === 'enable') return Object.assign({}, p, { enabled: !!s.on, updatedAt: now });
    if (s.type === 'budget') { var m = s.maxPriceMinor; p.explicit = Object.assign({}, p.explicit, { maxPriceMinor: Number.isInteger(m) && m >= 1 && m <= 100000000 ? m : null }); }
    else if (s.type === 'filter') {
      if (P.DIMENSIONS.indexOf(s.dimension) < 0 || s.dimension === 'price' || typeof s.value !== 'string' || !s.value.trim()) return p;
      var value = s.value.trim().slice(0, 60), other = s.mode === 'include' ? 'exclude' : 'include';
      if (s.mode !== 'include' && s.mode !== 'exclude') return p;
      var explicit = { include: Object.assign({}, p.explicit.include), exclude: Object.assign({}, p.explicit.exclude), maxPriceMinor: p.explicit.maxPriceMinor };
      var same = (explicit[s.mode][s.dimension] || []).filter(function (v) { return fold(v) !== fold(value); });
      if (s.on) same.push(value);
      explicit[s.mode][s.dimension] = same;
      // Hetzelfde kenmerk kan niet tegelijk gewild en ongewild zijn.
      if (s.on) explicit[other][s.dimension] = (explicit[other][s.dimension] || []).filter(function (v) { return fold(v) !== fold(value); });
      p.explicit = P.sanitize({ version: 1, explicit: explicit }, now).explicit;
    }
    else if (s.type === 'forget') {
      // Wist een kenmerk overal: geleerd én expliciet, zodat het echt uit "Mijn smaak" verdwijnt (review MED-1).
      if (typeof s.key !== 'string') return p;
      var f = Object.assign({}, p.features); delete f[s.key];
      var dim = s.key.slice(0, s.key.indexOf(':')), value = s.key.slice(s.key.indexOf(':') + 1), cleared = { version: 1, explicit: { include: {}, exclude: {}, maxPriceMinor: p.explicit.maxPriceMinor } };
      ['include', 'exclude'].forEach(function (mode) {
        Object.keys(p.explicit[mode]).forEach(function (d) {
          cleared.explicit[mode][d] = d === dim ? p.explicit[mode][d].filter(function (v) { return fold(v) !== value; }) : p.explicit[mode][d];
        });
      });
      p = Object.assign({}, p, { features: f, explicit: P.sanitize(cleared, now).explicit });
    }
    else if (!s.item || typeof s.item !== 'object') return p;
    else if (!p.enabled) return p;
    else if (s.type === 'dwell') { if (!WEIGHTS.dwell) return p; p = learn(p, s.item, WEIGHTS.dwell, now, false); }
    else if (s.type === 'like' || s.type === 'cart' || s.type === 'more' || s.type === 'less') { p = bump(learn(p, s.item, WEIGHTS[s.type], now, false), s.type, 1); }
    else if (s.type === 'unlike') p = bump(learn(p, s.item, -WEIGHTS.like, now, true), 'like', -1);
    else if (s.type === 'uncart') p = bump(learn(p, s.item, -WEIGHTS.cart, now, true), 'cart', -1);
    else return p;
    return P.prune(Object.assign({}, p, { updatedAt: now }), now);
  }

  /**
   * Compacte, genormaliseerde samenvatting voor rangschikking en server. null als personalisatie uit staat.
   * @param {TasteProfile} profile @param {number} now @param {{limit?:number}} [options]
   * @returns {TasteSummary|null}
   */
  function summarize(profile, now, options) {
    var p = P.sanitize(profile, now), limit = Math.min(12, (options && options.limit) || 12);
    if (!p.enabled) return null;
    /** @type {Record<string,number>} */ var scores = {};
    Object.keys(p.features).forEach(function (k) { scores[k] = Math.max(-1, Math.min(1, p.features[k].w / LEARNED_SCALE)); });
    ['include', 'exclude'].forEach(function (mode) {
      Object.keys(p.explicit[mode]).forEach(function (d) {
        p.explicit[mode][d].forEach(function (v) { var k = key(d, v); if (k) scores[k] = mode === 'include' ? EXPLICIT_SCORE : -EXPLICIT_SCORE; });
      });
    });
    function top(sign) {
      /** @type {Record<string,number>} */ var out = {};
      Object.keys(scores).filter(function (k) { return sign > 0 ? scores[k] >= 0.01 : scores[k] <= -0.01; })
        .sort(function (a, b) { return Math.abs(scores[b]) - Math.abs(scores[a]) || (a < b ? -1 : 1); })
        .slice(0, limit).forEach(function (k) { out[k] = Math.round(scores[k] * 100) / 100; });
      return out;
    }
    return { v: 1, budget_max_minor: p.explicit.maxPriceMinor, prefer: top(1), avoid: top(-1) };
  }

  root.NikkiTaste.aggregate = { WEIGHTS: WEIGHTS, PRICE_BANDS: PRICE_BANDS, CONDITION: CONDITION, fold: fold, key: key, priceBand: priceBand, featuresOf: featuresOf, applySignal: applySignal, summarize: summarize };
})(typeof window !== 'undefined' ? window : globalThis);
