(function () {
  // Mijn smaak: local learning and controls, using the existing taste and shop contracts.
  var shop = window.NikkiShop, api = shop.api;
  var P = window.NikkiTaste.profile, A = window.NikkiTaste.aggregate;
  var currentKey = null, pressed = null, storageFailed = false;

  function load() { return P.load(localStorage, Date.now()); }
  function apply(signal) {
    var now = Date.now(), profile = P.load(localStorage, now);
    if (!profile.enabled && ['like', 'unlike', 'cart', 'uncart', 'more', 'less'].includes(signal.type)) return;
    storageFailed = !P.save(localStorage, A.applySignal(profile, signal, now));
  }
  shop.onSignal(function (signal) {
    if (['like', 'unlike', 'cart', 'uncart'].includes(signal.type)) apply(signal);
  });

  var group = document.createElement('div');
  group.className = 'taste-photo-acts';
  group.innerHTML = ['more', 'less'].map(function (type) {
    var label = type === 'more' ? 'Meer zoals dit' : 'Minder zoals dit';
    return '<button type="button" class="on-photo" data-taste="' + type + '" aria-label="' + api.esc(label) + '" aria-pressed="false">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M7 12h10' + (type === 'more' ? 'M12 7v10' : '') + '"/></svg></button>';
  }).join('');
  document.getElementById('photo').appendChild(group);
  function syncPhoto() {
    var item = api.current(), key = item ? item.key : null;
    if (key !== currentKey) { currentKey = key; pressed = null; }
    group.hidden = !item;
    Array.from(group.children).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.taste === pressed)); });
  }
  group.addEventListener('click', function (event) {
    var button = event.target.closest('button'), item = api.current();
    if (!button || !item) return;
    apply({ type: button.dataset.taste, item: api.publicCopy(item) });
    pressed = load().enabled && !storageFailed ? button.dataset.taste : null;
    syncPhoto();
  });
  // The core replaces the photo track when the visitor changes piece. Observe only that track,
  // so our own button attributes cannot trigger an observer loop. Photo changes keep the feedback.
  new MutationObserver(syncPhoto).observe(document.getElementById('track'), { childList: true });
  shop.onCatalog(syncPhoto);
  syncPhoto();

  function labelFor(profile, key) {
    if (profile.features[key]) return profile.features[key].label;
    var dim = key.slice(0, key.indexOf(':')), values = [];
    ['include', 'exclude'].forEach(function (mode) { values = values.concat(profile.explicit[mode][dim] || []); });
    return values.find(function (value) { return A.key(dim, value) === key; }) || key.slice(key.indexOf(':') + 1);
  }
  shop.registerScreen('Mijn smaak', {
    render: function (api) {
      var profile = load(), esc = api.esc;
      // Switching off pauses learning and ranking, but leaves the saved preferences visible/removable.
      var summary = A.summarize(Object.assign({}, profile, { enabled: true }), Date.now());
      function section(title, scores) {
        return '<section class="taste-section"><h2>' + esc(title) + '</h2><ul>' + Object.keys(scores).map(function (key) {
          var label = labelFor(profile, key);
          return '<li class="line"><span class="taste-label">' + esc(label) + '</span><button type="button" class="ic" data-act="taste-forget" data-key="' + esc(key) + '" aria-label="' + esc('Vergeet ' + label) + '">' + api.CLOSE + '</button></li>';
        }).join('') + '</ul></section>';
      }
      var hasTaste = Object.keys(summary.prefer).length + Object.keys(summary.avoid).length > 0;
      return '<div class="taste-window"><button type="button" class="taste-toggle line" role="switch" aria-checked="' + profile.enabled + '" data-act="taste-enable"><span>Persoonlijke volgorde</span><span class="taste-switch" aria-hidden="true"></span></button>' +
        '<p class="taste-note muted">Je voorkeuren blijven in deze browser.</p>' +
        (storageFailed ? '<p class="taste-note" role="status">Opslaan lukt niet. Controleer of browseropslag beschikbaar is.</p>' : '') +
        (hasTaste ? section('Meer van', summary.prefer) + section('Minder van', summary.avoid) : '<p class="taste-empty muted">Nog geen voorkeuren. Hartjes, je winkelmand en meer/minder zoals dit vullen dit vanzelf.</p>') +
        '<button type="button" class="checkout taste-clear" data-act="taste-clear">Wis alles</button></div>';
    },
    action: function (act, button, api) {
      if (act === 'taste-clear') {
        if (!window.confirm('Alle smaakvoorkeuren wissen? Je hartjes en winkelmand blijven bewaard.')) return;
        var profile = load();
        var cleared = P.clear(localStorage, Date.now(), profile.enabled);
        storageFailed = !P.save(localStorage, cleared);
      } else if (act === 'taste-forget') apply({ type: 'forget', key: button.dataset.key });
      else if (act === 'taste-enable') apply({ type: 'enable', on: !load().enabled });
      else return;
      pressed = null;
      syncPhoto();
      window.NikkiPersonalise.refresh();
      api.refresh();
    }
  });
})();
