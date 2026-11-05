// Replace the sample collection with the current published catalog.
// A refresh keeps the visitor where they are: same view, same piece in the carousel, same scroll position.
for(const view of ['home','browse']) {
  const empty=document.createElement('section');empty.className='collection-empty';
  empty.innerHTML='<div class="empty-mark" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M50 38a10 10 0 0 1 20 0c0 8-10 8-10 17v5L22 82q-6 4 0 7h76q6-3 0-7L60 60"/></svg></div><div class="empty-copy"><p class="eyebrow">Nikki’s Boetiek</p><h1>De collectie krijgt vorm.</h1><p>Hier verschijnen straks de kledingstukken, met foto’s en hun eigen verhaal. Er zijn op dit moment nog geen stukken te bekijken.</p><a href="#materials">Ontdek de materialen →</a></div>';
  document.querySelector('[data-view-panel="'+view+'"]').prepend(empty);
}
document.querySelector('footer .wrap').firstElementChild.textContent='Nikki’s Boetiek · proefversie';
// Piece navigation and photo selection have separate controls.
let visiblePhotoPiece = null, selectedPhoto = 0;
const thumbs = document.createElement('div');
thumbs.id = 'hero-thumbnails'; thumbs.className = 'photo-thumbnails';
thumbs.setAttribute('role', 'group');
thumbs.setAttribute('aria-label', 'Foto’s van dit kledingstuk');
const pieceCounter = document.createElement('span');
pieceCounter.id = 'hero-piece-count';
$('hero-track').parentElement.append(thumbs, pieceCounter);
function visiblePiece() {
  const track = $('hero-track');
  const slide = track.children[Math.round(track.scrollLeft / (track.clientWidth || 1))];
  return byId(Number(slide?.querySelector('[data-press]')?.dataset.press));
}
function paintPhotos(rebuild = false) {
  const p = visiblePiece();
  const changed = visiblePhotoPiece !== p?.id;
  const multiple = PIECES.length > 1;
  $('hero-prev').hidden = $('hero-next').hidden = !multiple;
  pieceCounter.hidden = !multiple;
  pieceCounter.textContent = p ? 'Stuk ' + (PIECES.indexOf(p) + 1) + ' van ' + PIECES.length : '';
  if(changed) {
    visiblePhotoPiece = p?.id;
    selectedPhoto = Math.max(0, p?.images?.findIndex(photo => photo.main) ?? 0);
  }
  if(!p?.images?.length) { thumbs.replaceChildren(); return; }
  selectedPhoto = Math.min(selectedPhoto, p.images.length - 1);
  const photo = p.images[selectedPhoto];
  const picture = $('hero-track').querySelector('[data-press="' + p.id + '"]');
  for(const image of picture.querySelectorAll('img.photo, img.photo-bg')) {
    if(image.getAttribute('src') !== photo.src) image.src = photo.src;
    if(image.classList.contains('photo')) image.alt = photo.role || p.title;
  }
  if(changed || rebuild) {
    thumbs.replaceChildren();
    p.images.forEach((photo, index) => {
      const button = document.createElement('button'); button.type = 'button';
      button.setAttribute('aria-label', 'Foto ' + (index + 1) + ': ' + (photo.role || p.title));
      const img = document.createElement('img'); img.src = photo.src; img.alt = ''; button.append(img);
      button.addEventListener('click', () => { selectedPhoto = index; paintPhotos(); });
      thumbs.append(button);
    });
    thumbs.scrollTop = thumbs.scrollLeft = 0;
  }
  Array.from(thumbs.children).forEach((button, index) => button.setAttribute('aria-pressed', String(index === selectedPhoto)));
}
const originalRenderHero = renderHero;
renderHero = function() { originalRenderHero(); paintPhotos(true); };
$('hero-track').addEventListener('scroll', () => requestAnimationFrame(() => paintPhotos()), {passive:true});
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
