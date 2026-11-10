// @ts-check
// Smaakprofiel: opslag, schoonmaak en verval. Puur, behalve load/save/clear die een storage krijgen.
// Contract: app/taste/types.d.ts. Plan: docs/SMAAKPROFIEL.md (onderdeel 1).
(function (root) {
  /** @typedef {import('./types').TasteProfile} TasteProfile */
  /** @typedef {import('./types').Dimension} Dimension */
  var STORAGE_KEY = 'nikki-taste';
  var HALF_LIFE_DAYS = 30;    // geleerde voorkeuren halveren per 30 dagen
  var MAX_WEIGHT = 3;
  var MIN_WEIGHT = 0.05;      // kleiner dan dit wordt opgeruimd
  var MAX_FEATURES = 60;
  var MAX_VALUES = 12;        // per dimensie bij expliciete keuzes
  /** @type {Dimension[]} */
  var DIMENSIONS = ['material', 'model', 'colour', 'length', 'fit', 'era', 'detail', 'fur', 'price'];
  var KEY_PATTERN = /^(material|model|colour|length|fit|era|detail|fur|price):[^\u0000-\u001f]{1,72}$/;

  /** @returns {TasteProfile} */
  function empty(now) {
    return { version: 1, enabled: true, updatedAt: now || 0, explicit: { include: {}, exclude: {}, maxPriceMinor: null }, features: {}, counts: { like: 0, cart: 0, more: 0, less: 0 } };
  }
  function label(value) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60) : ''; }
  function count(n) { return Number.isInteger(n) && n >= 0 ? Math.min(n, 1e6) : 0; }
  function price(n) { return Number.isInteger(n) && n >= 1 && n <= 100000000 ? n : null; }
  function values(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function (v) { var l = label(v); if (l && out.indexOf(l) < 0 && out.length < MAX_VALUES) out.push(l); });
    return out;
  }
  function choices(raw) {
    /** @type {Partial<Record<Dimension,string[]>>} */ var out = {};
    if (!raw || typeof raw !== 'object') return out;
    DIMENSIONS.forEach(function (d) { if (d === 'price') return; var v = values(raw[d]); if (v.length) out[d] = v; });
    return out;
  }

  /** Accepts anything (old versions, tampered storage) and returns a valid profile. */
  function sanitize(raw, now) {
    var p = empty(now);
    if (!raw || typeof raw !== 'object' || raw.version !== 1) return p;
    p.enabled = raw.enabled !== false;
    p.updatedAt = Number.isFinite(raw.updatedAt) && raw.updatedAt > 0 ? raw.updatedAt : p.updatedAt;
    var e = raw.explicit || {};
    p.explicit = { include: choices(e.include), exclude: choices(e.exclude), maxPriceMinor: price(e.maxPriceMinor) };
    var c = raw.counts || {};
    p.counts = { like: count(c.like), cart: count(c.cart), more: count(c.more), less: count(c.less) };
    var f = raw.features && typeof raw.features === 'object' ? raw.features : {};
    Object.keys(f).forEach(function (k) {
      var v = f[k];
      if (!KEY_PATTERN.test(k) || !v || !Number.isFinite(v.w) || !Number.isFinite(v.t)) return;
      p.features[k] = { w: Math.max(-MAX_WEIGHT, Math.min(MAX_WEIGHT, v.w)), t: v.t, label: label(v.label) || k.slice(k.indexOf(':') + 1) };
    });
    return prune(p, now || p.updatedAt);
  }

  /** Weight of one learned feature at time `now`, after exponential decay. */
  function decayed(weight, now) {
    var days = Math.max(0, (now - weight.t) / 864e5);
    return weight.w * Math.pow(0.5, days / HALF_LIFE_DAYS);
  }

  /** Applies decay, drops tiny weights and keeps the strongest MAX_FEATURES. Returns a new profile. */
  function prune(profile, now) {
    /** @type {Array<[string, import('./types').FeatureWeight]>} */
    var entries = Object.keys(profile.features).map(function (k) {
      var f = profile.features[k];
      return /** @type {[string, import('./types').FeatureWeight]} */ ([k, { w: Math.round(decayed(f, now) * 1000) / 1000, t: now, label: f.label }]);
    }).filter(function (e) { return Math.abs(e[1].w) >= MIN_WEIGHT; });
    entries.sort(function (a, b) { return Math.abs(b[1].w) - Math.abs(a[1].w) || (a[0] < b[0] ? -1 : 1); });
    var out = Object.assign({}, profile, { features: {} });
    entries.slice(0, MAX_FEATURES).forEach(function (e) { out.features[e[0]] = e[1]; });
    return out;
  }

  /** @param {Pick<Storage,'getItem'>} storage */
  function load(storage, now) {
    try { return sanitize(JSON.parse(storage.getItem(STORAGE_KEY) || 'null'), now); } catch (e) { return empty(now); }
  }
  /** @param {Pick<Storage,'setItem'>} storage */
  function save(storage, profile) { try { storage.setItem(STORAGE_KEY, JSON.stringify(profile)); return true; } catch (e) { return false; } }
  /**
   * Wist alle voorkeuren. De aan/uit-keuze blijft staan: wie personalisatie uitzette, krijgt die
   * niet stilzwijgend terug door te wissen. @param {Pick<Storage,'setItem'>} storage
   */
  function clear(storage, now, enabled) { var p = empty(now); p.enabled = enabled !== false; save(storage, p); return p; }

  var api = { STORAGE_KEY: STORAGE_KEY, HALF_LIFE_DAYS: HALF_LIFE_DAYS, MAX_WEIGHT: MAX_WEIGHT, MAX_FEATURES: MAX_FEATURES, DIMENSIONS: DIMENSIONS, KEY_PATTERN: KEY_PATTERN,
    empty: empty, sanitize: sanitize, decayed: decayed, prune: prune, load: load, save: save, clear: clear };
  root.NikkiTaste = Object.assign(root.NikkiTaste || {}, { profile: api });
})(typeof window !== 'undefined' ? window : globalThis);
