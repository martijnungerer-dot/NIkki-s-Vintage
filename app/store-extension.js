// Replace the sample collection with the current published catalog.
// A refresh keeps the visitor where they are: same view, same piece in the carousel, same scroll position.
for(const view of ['home','browse']) {
  const empty=document.createElement('section');empty.className='collection-empty';
  empty.innerHTML='<div class="empty-mark" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M50 38a10 10 0 0 1 20 0c0 8-10 8-10 17v5L22 82q-6 4 0 7h76q6-3 0-7L60 60"/></svg></div><div class="empty-copy"><p class="eyebrow">Nikki’s Boetiek</p><h1>De collectie krijgt vorm.</h1><p>Hier verschijnen straks de kledingstukken, met foto’s en hun eigen verhaal. Er zijn op dit moment nog geen stukken te bekijken.</p><a href="#materials">Ontdek de materialen →</a></div>';
  document.querySelector('[data-view-panel="'+view+'"]').prepend(empty);
}
document.querySelector('footer .wrap').firstElementChild.textContent='Nikki’s Boetiek · proefversie';
// Keep all photographs reachable from the arrival carousel.
const photoPositions = new Map();
const thumbs = document.createElement('div');
thumbs.id = 'hero-thumbnails'; thumbs.className = 'photo-thumbnails';
thumbs.setAttribute('aria-label', 'Foto’s van dit kledingstuk');
$('hero-dots').after(thumbs);
function visiblePiece() {
  const track = $('hero-track');
  const slide = track.children[Math.round(track.scrollLeft / (track.clientWidth || 1))];
  return byId(Number(slide?.querySelector('[data-press]')?.dataset.press));
}
function paintPhotos() {
  const p = visiblePiece();
  thumbs.replaceChildren();
  if(!p?.images?.length) return;
  const selected = Math.min(photoPositions.get(p.id) || 0, p.images.length - 1);
  photoPositions.set(p.id, selected);
  const image = $('hero-track').querySelector('[data-press="' + p.id + '"] img.photo');
  if(image) { image.src = p.images[selected].src; image.alt = p.images[selected].role || p.title; }
  p.images.forEach((photo, index) => {
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-label', 'Foto ' + (index + 1) + ': ' + (photo.role || p.title));
    button.setAttribute('aria-pressed', String(index === selected));
    const img = document.createElement('img'); img.src = photo.src; img.alt = ''; button.append(img);
    button.addEventListener('click', () => { photoPositions.set(p.id, index); paintPhotos(); });
    thumbs.append(button);
  });
}
const originalRenderHero = renderHero;
renderHero = function() { originalRenderHero(); paintPhotos(); };
$('hero-track').addEventListener('scroll', () => requestAnimationFrame(paintPhotos), {passive:true});
for(const [id, direction] of [['hero-prev', -1], ['hero-next', 1]]) {
  $(id).addEventListener('click', event => {
    const p = visiblePiece();
    if(!p?.images?.length) return;
    const selected = photoPositions.get(p.id) || 0;
    const next = selected + direction;
    if(next >= 0 && next < p.images.length || PIECES.length === 1) {
      event.stopImmediatePropagation();
      photoPositions.set(p.id, (next + p.images.length) % p.images.length); paintPhotos();
    }
  }, true);
}
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
  paintPhotos();
  window.scrollTo({top: pageY, behavior: 'instant'});
};
window.NikkiStore.replace([]);
$('p-buy').hidden=true;
$('open-photos') && ($('open-photos').hidden=true);
$('photo-dialog').hidden=true;
