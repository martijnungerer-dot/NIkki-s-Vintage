(function () {
  // Persoonlijke volgorde en hoofdfoto (docs/SMAAKPROFIEL.md, onderdeel 6). Eigenaar: Claude Code.
  // Bij sessiestart, alleen als de bezoeker een smaakprofiel heeft:
  //   1. meteen de lokale rangschikking (geen wachten, geen verspringen bij het eerste beeld);
  //   2. één AI-aanroep via de server; het antwoord wordt toegepast op alles ná het stuk in beeld.
  // Tijdens de sessie blijft de volgorde staan (sessionStorage), ook na herladen. Een nieuwe volgorde
  // komt pas bij een nieuwe sessie of via NikkiPersonalise.refresh() na een expliciete keuze in
  // "Mijn smaak" (onderdeel 4). Zonder profiel of met personalisatie uit: Nikki's volgorde.
  var T = window.NikkiTaste, SESSION_KEY = 'nikki-taste-order', UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var shop = null, request = 0;

  function summary() { var now = Date.now(); return T.aggregate.summarize(T.profile.load(localStorage, now), now); }
  function hasTaste(s) { return !!s && (Object.keys(s.prefer).length > 0 || Object.keys(s.avoid).length > 0 || !!s.budget_max_minor); }
  function readSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function writeSession(value) { try { if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); else sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }

  // Only well-formed answers are used; anything else leaves the current order in place.
  function parse(res) {
    if (!res || !Array.isArray(res.ranking)) return null;
    var order = [], lead = {};
    res.ranking.slice(0, 1000).forEach(function (r) {
      if (!r || typeof r.id !== 'string' || !UUID.test(r.id) || order.indexOf(r.id) >= 0) return;
      order.push(r.id);
      if (typeof r.photoRole === 'string' && r.photoRole.length <= 40) lead[r.id] = r.photoRole;
    });
    return order.length ? { order: order, lead: lead } : null;
  }

  // The piece in view and everything before it stay put; the rest follows the new order.
  function keepSeen(next) {
    var now = shop.items().map(function (it) { return it.key; }), current = shop.current();
    var head = current ? now.slice(0, now.indexOf(current.key) + 1) : [];
    return head.concat(next.filter(function (k) { return head.indexOf(k) < 0; }));
  }

  // first: called while the catalog is first drawn (same task, nothing painted yet), so even the
  // first piece may change. Later calls keep what the visitor has already seen.
  function start(first) {
    var s = summary(), id = ++request, place = first ? function (o) { return o; } : keepSeen;
    if (!hasTaste(s)) { writeSession(null); if (!first) shop.personalise({ order: null, lead: {} }); return; }
    var profile = JSON.stringify(s), cached = readSession();
    if (cached && cached.profile === profile && Array.isArray(cached.order)) { shop.personalise({ order: place(cached.order), lead: cached.lead || {}, fromStart: !!first }); return; }
    shop.personalise({ order: place(T.ranking.rank(shop.items(), s).order), lead: {}, fromStart: !!first });
    var ask = window.parent.NikkiApp && window.parent.NikkiApp.personalise;
    if (typeof ask !== 'function') return;
    Promise.resolve().then(function () { return ask(s); }).then(function (res) {
      var choice = parse(res);
      if (!choice || id !== request) return; // a newer request or no usable answer
      var order = keepSeen(choice.order);
      writeSession({ profile: profile, order: order, lead: choice.lead });
      shop.personalise({ order: order, lead: choice.lead });
    }).catch(function () { /* local order stays; the shop keeps working */ });
  }

  window.NikkiShop.onCatalog(function (api) { if (!shop && api.items().length) { shop = api; start(true); } });
  // For "Mijn smaak" (onderdeel 4): call after an explicit change, or after switching personalisation on/off.
  window.NikkiPersonalise = { refresh: function () { writeSession(null); if (shop) start(false); } };
})();
