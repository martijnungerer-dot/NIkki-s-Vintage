(function () {
  // Delen en stuklinks — NOG NIET GEBOUWD. Eigenaar: volgende Claude Code-sessie (docs/FRONTEND-PLAN.md, onderdeel B).
  // Dit bestand wordt al meegebouwd maar doet nog niets, zodat de winkel ongewijzigd blijft.
  //
  // Doel
  // - Het deelicoon in de foto (button[aria-label="Delen"], nu zonder handler) deelt een stabiele link
  //   naar het huidige stuk: navigator.share als die bestaat, anders kopiëren naar het klembord,
  //   met een korte melding via api.status(...).
  // - Een bezoeker die de link opent, komt op dat stuk uit (api.show(key) in NikkiShop.onCatalog).
  //
  // Regels
  // - Link bevat alleen de permanente stuk-ID (api.current().key), nooit een getekende fotolink,
  //   token of andere velden. Bijvoorbeeld de bestaande paginaroute met #stuk=<uuid>.
  // - Onbekend, verkocht of teruggetrokken stuk: gewoon de winkel tonen, geen foutscherm, geen
  //   voorbeeldstuk. Ongeldige ID's negeren (alleen UUID-formaat accepteren).
  // - De winkel draait in een iframe (app/main.js mount); lees/schrijf de hash van window.parent
  //   alleen als dat dezelfde origin is, en test dit expliciet.
  // - Geen nieuwe knoppen of tekst over de foto; het bestaande icoon blijft op dezelfde plek, 44 px.
  // - Tests toevoegen in tests/storefront-layout.cjs of een eigen tests/storefront-share.cjs.
  //
  // Beschikbaar via window.NikkiShop: api.current(), api.show(key), api.status(message, state),
  // NikkiShop.onCatalog(fn). Zie app/store-extension.js (onderaan) voor het volledige contract.
})();
