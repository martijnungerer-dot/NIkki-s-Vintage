// Replace the sample collection with the current published catalog.
// A refresh keeps the visitor where they are: same view, same piece in the carousel, same scroll position.
window.NikkiStore.replace = function(records) {
  const track = $('hero-track');
  const view = (location.hash || '#home').slice(1);
  const visible = track.children[Math.round(track.scrollLeft / (track.clientWidth || 1))];
  const pressed = visible && visible.querySelector('[data-press]');
  const shownId = pressed ? Number(pressed.getAttribute('data-press')) : null;
  const pageY = window.scrollY, previous = current;
  PIECES.splice(0); Object.keys(PHOTOS).forEach(k=>delete PHOTOS[k]);
  records.forEach(p=>window.NikkiStore.put(p,false));
  const exists = id => PIECES.some(p => p.id === id);
  current = exists(previous) ? previous : (PIECES.length ? PIECES[0].id : 0);
  renderHero(); renderAlsoNew(); renderBrowse();
  if(!records.length) {
    $('hero-track').textContent='Er staan nog geen beschikbare stukken in de collectie.';
    if(view === 'product') location.hash = 'home';
    return;
  }
  // A product page whose piece is gone (sold) falls back to the start page.
  if(view === 'product') { if(exists(previous)) renderProduct(); else { location.hash = 'home'; return; } }
  if(shownId !== null && exists(shownId)) track.scrollTo({left: PIECES.findIndex(p => p.id === shownId) * track.clientWidth, behavior: 'instant'});
  window.scrollTo({top: pageY, behavior: 'instant'});
};
window.NikkiStore.replace([]);
$('p-buy').hidden=true;
$('open-photos') && ($('open-photos').hidden=true);
$('photo-dialog').hidden=true;
