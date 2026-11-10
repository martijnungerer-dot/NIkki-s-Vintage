(function () {
  // Winkelmand: the basket overview from concept/ontdekken-optie-b.html (lines, remove, total),
  // filled with the local selection in localStorage.nikki-cart. Owner: see docs/FRONTEND-PLAN.md.
  // No checkout exists yet, so the design's "Afrekenen" button is replaced by the existing pilot note.
  // Nothing is reserved or written to Supabase.
  var NOTE = '<p class="muted cart-note">Proefboetiek · bekijken en uitproberen, nog niet afrekenen.</p>';
  function euro(minor) {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
  }
  window.NikkiShop.registerScreen('Winkelmand', {
    render: function (api) {
      var esc = api.esc, keys = api.cartKeys();
      var lines = keys.map(function (key) { return api.items().find(function (it) { return it.key === key; }); }).filter(Boolean);
      // A published piece whose photos are temporarily unavailable stays selected but cannot be shown.
      var hidden = keys.length - lines.length;
      var hiddenNote = hidden ? '<p class="muted cart-note">' + (hidden === 1 ? '1 stuk in je winkelmand is' : hidden + ' stukken in je winkelmand zijn') + ' tijdelijk niet te zien.</p>' : '';
      if (!lines.length) return '<p class="muted" style="margin:48px 0 0;text-align:center;font-size:18px">Je winkelmand is leeg.</p>' + hiddenNote + NOTE;
      var total = lines.reduce(function (sum, it) { return sum + it.priceMinor; }, 0);
      return '<ul class="cart-lines">' + lines.map(function (it) {
        return '<li class="line" data-item-key="' + esc(it.key) + '"><span class="face">' + api.face(it) + '</span><div class="txt"><span>' + esc(it.title) + '</span><span>' + esc(it.price) + '</span></div>' +
          '<button type="button" class="ic" data-act="cart-remove" data-key="' + esc(it.key) + '" aria-label="Verwijder ' + esc(it.title) + '">' + api.CLOSE + '</button></li>';
      }).join('') + '</ul>' +
        '<div class="cart-foot">' + hiddenNote +
        '<div class="kv" style="border:0;font-size:20px"><span>Totaal</span><span id="cart-total">' + esc(euro(total)) + '</span></div>' + NOTE + '</div>';
    },
    action: function (act, button, api) {
      if (act !== 'cart-remove') return;
      var keys = api.cartKeys(), next = keys[keys.indexOf(button.dataset.key) + 1];
      api.toggleCart(button.dataset.key, false);
      api.refresh();
      // Keep keyboard focus in the list: the next remove button, otherwise the back button.
      var target = next && Array.from(document.querySelectorAll('#cart [data-act="cart-remove"]')).find(function (b) { return b.dataset.key === next; });
      (target || document.querySelector('#cart [data-act="cart-remove"]') || document.querySelector('#cart [data-act="close"]')).focus({ preventScroll: true });
    }
  });
})();
