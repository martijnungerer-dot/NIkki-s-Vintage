// Replace the sample collection with the current published catalog.
// A refresh keeps the visitor where they are: same view, same piece in the carousel, same scroll position.
for(const view of ['home','browse']) {
  const empty=document.createElement('section');empty.className='collection-empty';
  empty.innerHTML='<div class="empty-mark" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M50 38a10 10 0 0 1 20 0c0 8-10 8-10 17v5L22 82q-6 4 0 7h76q6-3 0-7L60 60"/></svg></div><div class="empty-copy"><p class="eyebrow">Nikki’s Boetiek</p><h1>De collectie krijgt vorm.</h1><p>Hier verschijnen straks de kledingstukken, met foto’s en hun eigen verhaal. Er zijn op dit moment nog geen stukken te bekijken.</p><a href="#materials">Ontdek de materialen →</a></div>';
  document.querySelector('[data-view-panel="'+view+'"]').prepend(empty);
}
document.querySelector('footer .wrap').firstElementChild.textContent='Nikki’s Boetiek · proefversie';
window.NikkiStore.replace = function(records) {
  document.documentElement.dataset.catalogEmpty=String(records.length===0);
  const track = $('hero-track');
  const view = (location.hash || '#home').slice(1);
  const visible = track.children[Math.round(track.scrollLeft / (track.clientWidth || 1))];
  const pressed = visible && visible.querySelector('[data-press]');
  const shownId = pressed ? Number(pressed.getAttribute('data-press')) : null;
  const pageY = window.scrollY, previous = current;
  const galleryTrack = $('gal-track'), photoX = galleryTrack.scrollLeft;
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
  if(view === 'product') {
    if(exists(previous)) {
      renderProduct();
      galleryTrack.scrollTo({left: photoX, behavior: 'instant'});
      gallery.paint();
    } else { location.hash = 'home'; return; }
  }
  if(shownId !== null && exists(shownId)) track.scrollTo({left: PIECES.findIndex(p => p.id === shownId) * track.clientWidth, behavior: 'instant'});
  window.scrollTo({top: pageY, behavior: 'instant'});
};
window.NikkiStore.replace([]);
$('p-buy').hidden=true;
$('open-photos') && ($('open-photos').hidden=true);
$('photo-dialog').hidden=true;
