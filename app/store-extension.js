// Replace the sample collection with the current published catalog.
window.NikkiStore.replace = function(records) {
  PIECES.splice(0); Object.keys(PHOTOS).forEach(k=>delete PHOTOS[k]);
  records.forEach(p=>window.NikkiStore.put(p,false));
  current=PIECES.length?PIECES[0].id:0;
  renderHero();renderAlsoNew();renderBrowse();
  location.hash='home';route();
  if(!records.length) $('hero-track').textContent='Er staan nog geen beschikbare stukken in de collectie.';
};
window.NikkiStore.replace([]);
$('p-buy').hidden=true;
$('open-photos') && ($('open-photos').hidden=true);
$('photo-dialog').hidden=true;
