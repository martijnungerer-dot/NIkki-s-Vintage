(function () {
  // Delen en stuklinks (docs/FRONTEND-PLAN.md, onderdeel B). Eigenaar: Claude Code.
  // - Eén tik op het bestaande deelicoon in de foto: het deelmenu van de telefoon (navigator.share),
  //   anders de link kopiëren. Na kopiëren staat er twee seconden een vinkje in hetzelfde icoon
  //   (besluit Martijn, 10 november 2026); geen tekst over de foto.
  // - De link bevat alleen de permanente stuk-ID: <winkeladres>#stuk=<uuid>. Nooit een getekende
  //   fotolink, token of ander veld.
  // - Wie de link opent, komt op dat stuk uit. Een onbekend, verkocht of ongeldig stuk toont gewoon
  //   de winkel, zonder foutscherm. Daarna verdwijnt het #stuk-deel uit de adresbalk, zodat herladen
  //   niet terugspringt.
  // De winkel draait in een iframe (app/main.js); de link en het adres horen bij de buitenpagina.
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, HASH = /^#stuk=([0-9a-f-]{36})$/;
  var CHECK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var button = document.querySelector('#photo button[aria-label="Delen"]'), shop = null, timer = 0;
  if (!button) return;
  var icon = button.innerHTML;

  // Same-origin parent (the app shell); fall back to this window when opened on its own.
  function outer() { try { return window.parent.location.href && window.parent; } catch (e) { return window; } }
  function link(key) { var loc = outer().location; return loc.origin + loc.pathname + '#stuk=' + key; }

  function confirmCopied() {
    clearTimeout(timer);
    button.innerHTML = CHECK; button.setAttribute('aria-label', 'Link gekopieerd');
    timer = setTimeout(function () { button.innerHTML = icon; button.setAttribute('aria-label', 'Delen'); }, 2000);
  }
  function copyFallback(text) {
    var area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    area.remove(); button.focus({ preventScroll: true });
    return ok;
  }
  function failed() { shop.status('De link kon niet worden gekopieerd.', 'error'); setTimeout(function () { shop.status('', 'success'); }, 4000); }

  button.addEventListener('click', function () {
    var it = shop && shop.current(); if (!it || !UUID.test(it.key)) return;
    var url = link(it.key);
    if (typeof navigator.share === 'function') {
      // Only the public title and the link; the share sheet handles the rest. Cancelling is fine.
      navigator.share({ title: it.title, url: url }).catch(function (e) { if (e && e.name !== 'AbortError') copy(); });
      return;
    }
    copy();
    function copy() {
      var write = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(url) : Promise.reject();
      write.then(confirmCopied, function () { if (copyFallback(url)) confirmCopied(); else failed(); });
    }
  });

  // Opening a shared link: show that piece once the catalog is there, then tidy the address bar.
  window.NikkiShop.onCatalog(function (api) {
    if (shop || !api.items().length) return;
    shop = api;
    var win = outer(), match = HASH.exec(win.location.hash || '');
    if (!match) return;
    if (UUID.test(match[1])) api.show(match[1]); // unknown or sold: show() finds nothing, the shop stays as it is
    // Keep the app's history state, so the phone's back button keeps working after a shared link.
    try { win.history.replaceState(win.history.state, '', win.location.pathname + win.location.search); } catch (e) {}
  });
})();
