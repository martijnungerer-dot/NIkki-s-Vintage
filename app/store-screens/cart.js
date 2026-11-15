(function () {
  // Winkelmand: the basket overview from concept/ontdekken-optie-b.html (lines, remove, total),
  // filled with the local selection in localStorage.nikki-cart. Owner: see docs/FRONTEND-PLAN.md.
  // "Betalen" (Martijn, 10 november 2026: Betalen instead of Afrekenen) runs a sample payment only:
  // nothing is paid, reserved or written to Supabase, and the basket stays as it is.
  var NOTE = '<p class="muted cart-note">Proefboetiek · betalen is een voorbeeld; er wordt niets afgeschreven of gereserveerd.</p>';
  var step = 'cart'; // 'cart' | 'pay' | 'done'
  function euro(minor) {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
  }
  function focus(selector) { var el = document.querySelector('#cart ' + selector); if (el) el.focus({ preventScroll: true }); }
  window.NikkiShop.registerScreen('Winkelmand', {
    render: function (api) {
      // A fresh opening of the panel always starts at the basket; a catalog refresh keeps the step.
      if (document.getElementById('cart').hidden) step = 'cart';
      var esc = api.esc, keys = api.cartKeys();
      var lines = keys.map(function (key) { return api.items().find(function (it) { return it.key === key; }); }).filter(Boolean);
      // A published piece whose photos are temporarily unavailable stays selected but cannot be shown.
      var hidden = keys.length - lines.length;
      var hiddenNote = hidden ? '<p class="muted cart-note">' + (hidden === 1 ? '1 stuk in je winkelmand is' : hidden + ' stukken in je winkelmand zijn') + ' tijdelijk niet te zien.</p>' : '';
      // Every piece is unique: say so when one in the basket has meanwhile been sold.
      var gone = api.takeGoneFromCart ? api.takeGoneFromCart() : 0;
      if (gone) hiddenNote = '<p class="muted cart-note" role="status">' + (gone === 1 ? 'Eén stuk uit je winkelmand is inmiddels verkocht en weggehaald.' : gone + ' stukken uit je winkelmand zijn inmiddels verkocht en weggehaald.') + '</p>' + hiddenNote;
      if (!lines.length) { step = 'cart'; return (hidden ? '' : '<p class="muted" style="margin:48px 0 0;text-align:center;font-size:18px">Je winkelmand is leeg.</p>') + hiddenNote + NOTE; }
      var total = euro(lines.reduce(function (sum, it) { return sum + it.priceMinor; }, 0));
      var totalRow = '<div class="kv" style="border:0;font-size:20px"><span>Totaal</span><span id="cart-total">' + esc(total) + '</span></div>';
      if (step === 'pay') return '<div class="cart-step"><p class="cart-step-title">Voorbeeldbetaling</p>' +
        '<p class="cart-step-text">' + lines.length + (lines.length === 1 ? ' stuk' : ' stukken') + '. Dit is een proef: er wordt niets betaald of gereserveerd.</p></div>' +
        '<div class="cart-foot">' + totalRow + '<button type="button" class="checkout" data-act="cart-pay-confirm">Betalen</button>' +
        '<button type="button" class="checkout cart-secondary" data-act="cart-pay-back">Terug naar winkelmand</button></div>';
      if (step === 'done') return '<div class="cart-step" role="status"><p class="cart-step-title">Voorbeeldbetaling afgerond</p>' +
        '<p class="cart-step-text">Er is niets betaald of gereserveerd. Je stukken blijven in je winkelmand.</p></div>' +
        '<div class="cart-foot"><button type="button" class="checkout" data-act="cart-pay-back">Terug naar winkelmand</button></div>';
      return '<ul class="cart-lines">' + lines.map(function (it) {
        return '<li class="line" data-item-key="' + esc(it.key) + '"><span class="face">' + api.face(it) + '</span><div class="txt"><span>' + esc(it.title) + '</span><span>' + esc(it.price) + '</span></div>' +
          '<button type="button" class="ic" data-act="cart-remove" data-key="' + esc(it.key) + '" aria-label="Verwijder ' + esc(it.title) + '">' + api.CLOSE + '</button></li>';
      }).join('') + '</ul>' +
        '<div class="cart-foot">' + hiddenNote + totalRow + '<button type="button" class="checkout" data-act="cart-pay">Betalen</button>' + NOTE + '</div>';
    },
    action: function (act, button, api) {
      if (act === 'cart-pay' || act === 'cart-pay-confirm' || act === 'cart-pay-back') {
        step = act === 'cart-pay' ? 'pay' : act === 'cart-pay-confirm' ? 'done' : 'cart';
        api.refresh();
        focus(step === 'pay' ? '[data-act="cart-pay-confirm"]' : step === 'done' ? '[data-act="cart-pay-back"]' : '[data-act="cart-pay"]');
        return;
      }
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
