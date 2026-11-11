(function () {
  // Mijn smaak: local learning and controls, using the existing taste and shop contracts.
  var shop = window.NikkiShop, api = shop.api;
  var P = window.NikkiTaste.profile, A = window.NikkiTaste.aggregate;
  var currentKey = null, pressed = null, storageFailed = false, scrollToRestore = null, rawCache = null, readFailed = false;
  // Resolve localStorage inside the profile module's try/catch, including a blocked getter.
  // After a failed read the cached copy is for display only: every write follows a read, and
  // a write after a failed read is refused so stale or empty data cannot overwrite newer preferences.
  var storage = {
    getItem: function (key) {
      try { rawCache = window.localStorage.getItem(key); readFailed = false; return rawCache; }
      catch (e) { readFailed = true; if (rawCache !== null) return rawCache; throw e; }
    },
    setItem: function (key, value) {
      if (readFailed) throw new Error('Profile read failed; not saving.');
      window.localStorage.setItem(key, value); rawCache = value;
    }
  };

  function load() { return P.load(storage, Date.now()); }
  function apply(signal) {
    var now = Date.now(), profile = P.load(storage, now);
    if (!profile.enabled && ['like', 'unlike', 'cart', 'uncart', 'more', 'less'].includes(signal.type)) return false;
    storageFailed = !P.save(storage, A.applySignal(profile, signal, now));
    return !storageFailed;
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
    var type = button.dataset.taste;
    // A failed or ignored save leaves the stored signal, and therefore the pressed state, unchanged.
    if (apply({ type: type, item: api.publicCopy(item) })) pressed = pressed !== (type === 'more' ? 'less' : 'more') ? type : null;
    syncPhoto();
  });
  // The core replaces the photo track when the visitor changes piece. Observe only that track,
  // so our own button attributes cannot trigger an observer loop. Photo changes keep the feedback.
  new MutationObserver(syncPhoto).observe(document.getElementById('track'), { childList: true });
  shop.onCatalog(syncPhoto);
  syncPhoto();

  function preferences(profile) {
    // summarize() caps the AI payload at 12 per list. The editor must expose every saved
    // feature so each one can be forgotten, including while personalisation is off.
    var entries = {};
    Object.keys(profile.features).forEach(function (key) {
      var feature = profile.features[key];
      entries[key] = { key: key, label: feature.label, weight: feature.w };
    });
    ['include', 'exclude'].forEach(function (mode) {
      Object.keys(profile.explicit[mode]).forEach(function (dimension) {
        profile.explicit[mode][dimension].forEach(function (label) {
          var key = A.key(dimension, label);
          if (key) entries[key] = { key: key, label: label, weight: mode === 'include' ? P.MAX_WEIGHT : -P.MAX_WEIGHT };
        });
      });
    });
    return Object.values(entries).sort(function (a, b) {
      return Math.abs(b.weight) - Math.abs(a.weight) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    });
  }
  shop.registerScreen('Mijn smaak', {
    render: function (api) {
      var profile = load(), esc = api.esc;
      // Both the immediate and the asynchronous personalisation answer can redraw this panel.
      // Keep one scroll position across synchronous redraws until the new DOM is installed.
      var previous = document.querySelector('.taste-window');
      if (scrollToRestore === null) scrollToRestore = previous && !document.getElementById('cart').hidden ? previous.scrollTop : 0;
      queueMicrotask(function () {
        if (scrollToRestore === null) return;
        var panel = document.querySelector('.taste-window');
        if (panel) panel.scrollTop = scrollToRestore;
        scrollToRestore = null;
      });
      var entries = preferences(profile);
      function section(title, sign) {
        var list = entries.filter(function (entry) { return entry.weight * sign > 0; });
        return list.length ? '<section class="taste-section"><h2>' + esc(title) + '</h2><ul>' + list.map(function (entry) {
          return '<li class="line"><span class="taste-label">' + esc(entry.label) + '</span><button type="button" class="ic" data-act="taste-forget" data-key="' + esc(entry.key) + '" aria-label="' + esc('Vergeet ' + entry.label) + '">' + api.CLOSE + '</button></li>';
        }).join('') + '</ul></section>' : '';
      }
      return '<div class="taste-window"><button type="button" class="taste-toggle line" role="switch" aria-checked="' + profile.enabled + '" data-act="taste-enable"><span>Persoonlijke volgorde</span><span class="taste-switch" aria-hidden="true"></span></button>' +
        '<p class="taste-note muted">Je voorkeuren blijven in deze browser.</p>' +
        (storageFailed ? '<p class="taste-note" role="status">Opslaan lukt niet. Controleer of browseropslag beschikbaar is.</p>' : '') +
        (entries.length ? section('Meer van', 1) + section('Minder van', -1) : '<p class="taste-empty muted">Nog geen voorkeuren. Hartjes, je winkelmand en meer/minder zoals dit vullen dit vanzelf.</p>') +
        '<button type="button" class="checkout taste-clear" data-act="taste-clear">Wis alles</button></div>';
    },
    action: function (act, button, api) {
      if (!['taste-clear', 'taste-forget', 'taste-enable'].includes(act)) return;
      var panel = document.querySelector('.taste-window'), scroll = panel.scrollTop;
      var buttons = Array.from(panel.querySelectorAll('[data-act="taste-forget"]')), index = buttons.indexOf(button);
      var neighbour = buttons[index + 1] || buttons[index - 1];
      if (act === 'taste-clear') {
        if (!window.confirm('Alle smaakvoorkeuren wissen? Je hartjes en winkelmand blijven bewaard.')) return;
        // clear() owns the one write; its return value does not report storage failure.
        var written = false;
        P.clear({ setItem: function (key, value) { storage.setItem(key, value); written = true; } }, Date.now(), load().enabled);
        storageFailed = !written;
      } else if (act === 'taste-forget') apply({ type: 'forget', key: button.dataset.key });
      else if (act === 'taste-enable') apply({ type: 'enable', on: !load().enabled });
      if (!storageFailed) {
        pressed = null;
        syncPhoto();
        if (act === 'taste-clear') scrollToRestore = 0;
        window.NikkiPersonalise.refresh();
      }
      api.refresh();
      panel = document.querySelector('.taste-window');
      if (!storageFailed && act === 'taste-forget') {
        var next = neighbour && Array.from(panel.querySelectorAll('[data-act="taste-forget"]')).find(function (b) { return b.dataset.key === neighbour.dataset.key; });
        (next || panel.querySelector('[data-act="taste-enable"]')).focus({ preventScroll: true });
      }
      panel.scrollTop = act === 'taste-clear' && !storageFailed ? 0 : scroll;
    }
  });
})();
