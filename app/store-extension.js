(function () {
  // Option B, using only the existing public NikkiStore catalog.
  var ITEMS = [];
  var CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function read(key) { try { var v=JSON.parse(localStorage.getItem(key)); return v && typeof v==='object' && !Array.isArray(v) ? v : {}; } catch { return {}; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function primary(it) { return Math.max(0, it.images.findIndex(i=>i.main)); }
  function face(it, image=it.images[primary(it)]) { return '<img src="' + esc(image.src) + '" alt="' + esc(image.role || it.title) + '">'; }

  var $ = function (id) { return document.getElementById(id); };
  var ph = $('ph'), N = ITEMS.length;
  var S = { item: 0, photo: 0, prev: N - 1, liked: read('gsf-liked'), cart: read('nikki-cart'), zoom: false, open: null };
  var g = { start: null, axis: null, lastTap: 0, lastWheel: 0 };

  function renderTrack() {
    var it=ITEMS[S.item];
    $('track').innerHTML=it.images.map((image,i)=>'<div class="slide'+(S.zoom && i===S.photo?' zoomed':'')+'">'+face(it,image)+'</div>').join('');
    place(0);
  }
  function place(dx) {
    $('track').style.transform = 'translateX(calc(' + (-S.photo * 100) + '% + ' + dx + 'px))';
    var d = ''; for (var k = 0; k < (ITEMS[S.item]?.images.length || 0); k++) d += '<i' + (k === S.photo ? ' class="on"' : '') + '></i>';
    $('dots').innerHTML = d; $('dots').setAttribute('aria-label', ITEMS.length ? 'Foto ' + (S.photo + 1) + ' van ' + ITEMS[S.item].images.length : 'Geen foto’s');
  }
  function render(fade) {
    var it = ITEMS[S.item];
    ph.dataset.catalogEmpty=String(!it);
    ph.querySelectorAll('#row button, #photo button, #prev-th').forEach(b=>{b.disabled=!it;});
    if(!it) {
      $('track').replaceChildren(); place(0);
      $('title').textContent='Geen beschikbare stukken'; $('price-text').textContent='';
      $('price').setAttribute('aria-pressed','false'); $('price').setAttribute('aria-label','Geen stuk beschikbaar');
      $('bag-empty').toggleAttribute('hidden',false); $('bag-full').toggleAttribute('hidden',true);
      $('prev-th').querySelector('.face').replaceChildren(); $('prev-th').setAttribute('aria-label','Vorig stuk');
      // No pieces: no empty placeholders, only the menu remains.
      $('prev-th').hidden=true; $('nexts').replaceChildren();
      return;
    }
    var inCart=!!S.cart[it.key], liked=!!S.liked[it.displayId];
    $('title').textContent = it.title;
    $('price-text').textContent = it.price;
    $('price').setAttribute('aria-pressed', String(inCart));
    $('price').setAttribute('aria-label', it.price + (inCart ? ', in je winkelmand; tik om te verwijderen' : ', toevoegen aan winkelmand'));
    $('bag-empty').toggleAttribute('hidden', inCart); $('bag-full').toggleAttribute('hidden', !inCart);
    $('like').setAttribute('aria-pressed', String(liked));
    $('like').querySelector('svg').setAttribute('fill', liked ? '#FFFFFF' : 'none');
    var p = ITEMS[S.prev] || it;
    // With a single piece there is nothing to go back or forward to.
    $('prev-th').disabled=N<2; $('prev-th').hidden=N<2;
    ph.querySelectorAll('[data-act="prev-photo"], [data-act="next-photo"]').forEach(b=>{b.disabled=it.images.length<2;});
    $('prev-th').querySelector('.face').innerHTML = face(p);
    $('prev-th').setAttribute('aria-label', 'Terug naar ' + p.title);
    var h = '';
    // Show only pieces that exist; never an empty slot.
    for (var k=1; k<=3 && k<N; k++) {
      var i=(S.item+k)%N;
      h+='<button type="button" class="th" data-act="go" data-idx="'+i+'" aria-label="Bekijk '+esc(ITEMS[i].title)+'"><span class="face">'+face(ITEMS[i])+'</span></button>';
    }
    $('nexts').innerHTML = h;
    renderTrack();
    if (fade) { var el = $('photo'); el.classList.remove('wissel'); void el.offsetWidth; el.classList.add('wissel'); }
  }
  function goItem(i) { if (!ITEMS[i] || i === S.item) return; S.prev = S.item; S.item = i; S.photo = primary(ITEMS[i]); S.zoom = false; closeAll(); render(true); }
  function goPhoto(step, wrap) {
    var count=ITEMS[S.item]?.images.length || 0; if(!count)return;
    var p = S.photo + step; S.photo = wrap ? (p + count) % count : Math.max(0, Math.min(count-1, p)); S.zoom = false;
    ph.querySelectorAll('.slide').forEach(function (s) { s.classList.remove('zoomed'); }); place(0);
  }

  function renderInfo() {
    var it = ITEMS[S.item];
    var characteristics=[['Materiaal',it.material],['Bontsoort',['Ja','Alleen kraag of rand'].includes(it.furClass)?it.species:null]]
      .filter(([,value])=>typeof value==='string' && value.trim())
      .map(([label,value])=>'<div class="kv"><span>'+label+'</span><span>'+esc(value)+'</span></div>').join('');
    $('info').innerHTML = '<div class="head"><span></span><button type="button" class="ic" data-act="close" aria-label="Sluiten">' + CLOSE + '</button></div>' +
      '<div class="head" style="align-items:baseline;gap:16px"><span class="ptitle">' + esc(it.title) + '</span><span style="font-size:22px;white-space:nowrap">' + esc(it.price) + '</span></div>' +
      '<p style="margin:0;font-size:17px;line-height:1.55">' + esc(it.description || '') + '</p>' +
      '<div><div class="muted" style="font-size:16px;padding-bottom:4px">Maten, plat gemeten</div>' +
      [['Borstbreedte',0],['Ruglengte',3],['Schouderbreedte',1],['Mouwlengte',2]].map(function (s) {
        var value=it.measurements?.[s[1]];
        return '<div class="kv"><span>'+s[0]+'</span><span>'+(typeof value==='number' && Number.isFinite(value)?value.toLocaleString('nl-NL')+' cm':'')+'</span></div>';
      }).join('') + '</div>' + (characteristics?'<div>'+characteristics+'</div>':'');
  }
  // Destination screens remain placeholders. Cart changes only store public garment IDs locally.
  var placeholder='', returnFocus=null;
  function renderCart() {
    $('cart').setAttribute('aria-label',placeholder);
    var message=placeholder==='Winkelmand'?'Proefboetiek · bekijken en uitproberen, nog niet afrekenen.':'Binnenkort.';
    $('cart').innerHTML='<div class="head" style="padding-bottom:10px"><button type="button" class="ic" data-act="close" aria-label="Terug naar de winkel" style="margin-left:-8px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><span style="font-size:26px">'+esc(placeholder)+'</span><span style="width:44px"></span></div><p class="muted" style="margin:48px 0 0;text-align:center;font-size:18px">'+message+'</p>';
  }

  var OPENER = { info: '[data-act="info"]', menu: '.shop' };
  function closeAll(restore=true) {
    ['info', 'menu', 'cart'].forEach(function (k) { $(k).hidden = true; if (OPENER[k]) ph.querySelector(OPENER[k]).setAttribute('aria-expanded', 'false'); });
    S.open = null;
    if(restore && returnFocus?.isConnected)returnFocus.focus();
  }
  function open(k) {
    if(k==='info' && !N)return;
    var was = S.open, opener=document.activeElement; closeAll(false); if (was === k) return;
    returnFocus=k==='cart'?ph.querySelector('.shop'):opener;
    if (k === 'info') { renderInfo(); $('info').style.bottom = (ph.clientHeight - $('row').offsetTop + 8) + 'px'; }
    if (k === 'menu') $('menu').style.bottom = (ph.clientHeight - $('band').offsetTop + 8) + 'px';
    if (k === 'cart') renderCart();
    $(k).hidden = false; S.open = k;
    $(k).querySelector('button')?.focus();
    if (OPENER[k]) ph.querySelector(OPENER[k]).setAttribute('aria-expanded', 'true');
  }

  Array.from($('menu').children).forEach(b=>{b.dataset.act='placeholder';b.dataset.screen=b.textContent;});
  ph.querySelector('[aria-label="Mijn account"]').addEventListener('click',()=>window.parent.NikkiApp.openAccount());
  ph.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-act');
    if (a === 'prev-photo') goPhoto(-1, true);
    else if (a === 'next-photo') goPhoto(1, true);
    else if (a === 'like') { S.liked[ITEMS[S.item].displayId] = !S.liked[ITEMS[S.item].displayId]; save('gsf-liked',S.liked); render(false); }
    else if (a === 'info' || a === 'menu') open(a);
    else if (a === 'placeholder') { placeholder=b.dataset.screen; open('cart'); }
    else if (a === 'cart-toggle') { var key=ITEMS[S.item].key; if(S.cart[key])delete S.cart[key];else S.cart[key]=true; save('nikki-cart',S.cart); render(false); }
    else if (a === 'close') closeAll();
    else if (a === 'go') goItem(Number(b.getAttribute('data-idx')));
    else if (a === 'go-prev') goItem(S.prev);
  });
  ph.addEventListener('keydown', function (e) {
    if(e.key==='Escape' && S.open)closeAll();
    if(e.key==='Tab' && S.open) {
      var buttons=Array.from($(S.open).querySelectorAll('button:not([disabled])')), first=buttons[0], last=buttons.at(-1);
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
  });

  // Vegen: opzij = andere foto van dit stuk, omhoog/omlaag = ander stuk. Twee keer tikken = inzoomen.
  var photo = $('photo');
  photo.addEventListener('pointerdown', function (e) {
    if (!N || S.open || e.target.closest('button')) { g.start = null; return; }
    g.start = { x: e.clientX, y: e.clientY }; g.axis = null;
    try { photo.setPointerCapture(e.pointerId); } catch (err) {}
  });
  photo.addEventListener('pointermove', function (e) {
    if (!g.start) return;
    var dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
    if (!g.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (g.axis === 'x' && !S.zoom) { var edge = (S.photo === 0 && dx > 0) || (S.photo === ITEMS[S.item].images.length-1 && dx < 0); $('track').classList.add('dragging'); place(edge ? dx * 0.3 : dx); }
  });
  photo.addEventListener('pointercancel', function () { g.start = null; g.axis = null; $('track').classList.remove('dragging'); place(0); });
  photo.addEventListener('pointerup', function (e) {
    if (!g.start) return;
    var dx = e.clientX - g.start.x, dy = e.clientY - g.start.y, axis = g.axis;
    g.start = null; g.axis = null; $('track').classList.remove('dragging');
    if (!axis) {
      var now = Date.now();
      if (now - g.lastTap < 320) {
        g.lastTap = 0; S.zoom = !S.zoom;
        var slide = $('track').children[S.photo], pic = slide.firstElementChild, r = photo.getBoundingClientRect();
        pic.style.transformOrigin = Math.round((e.clientX - r.left) / r.width * 100) + '% ' + Math.round((e.clientY - r.top) / r.height * 100) + '%';
        slide.classList.toggle('zoomed', S.zoom);
      } else g.lastTap = now;
      place(0); return;
    }
    if (S.zoom) { place(0); return; }
    if (axis === 'x' && Math.abs(dx) > 60) goPhoto(dx < 0 ? 1 : -1, false);
    else if (axis === 'y' && Math.abs(dy) > 50) goItem((S.item + (dy < 0 ? 1 : -1) + N) % N);
    else place(0);
  });
  photo.addEventListener('wheel', function (e) {
    if (!N || S.open || Math.abs(e.deltaY) < 30) return;
    e.preventDefault();
    var now = Date.now(); if (now - g.lastWheel < 600) return; g.lastWheel = now;
    goItem((S.item + (e.deltaY > 0 ? 1 : -1) + N) % N);
  }, { passive: false });

  window.NikkiStore = {
    replace(records, publishedIds) {
      var current=ITEMS[S.item], previous=ITEMS[S.prev]?.key, selected=current?.images[S.photo]?.path;
      // Explicit public projection: no auth, raw model output or private notes.
      ITEMS=records.filter(r=>r.images?.length).map(r=>({
        key:r.key, displayId:r.displayId, title:r.title, description:r.description, priceMinor:r.priceMinor,
        material:r.material, species:r.species, furClass:r.furClass,
        price:new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',minimumFractionDigits:r.priceMinor%100?2:0}).format(r.priceMinor/100),
        measurements:r.measurements, images:r.images.map(i=>({src:i.src,path:i.path,role:i.role,main:i.main}))
      }));
      N=ITEMS.length;
      var index=ITEMS.findIndex(it=>it.key===current?.key), same=index>=0;
      S.item=same?index:0; S.prev=ITEMS.findIndex(it=>it.key===previous);
      if(S.prev<0 || S.prev===S.item)S.prev=N-1===S.item?0:N-1;
      var photoIndex=same?ITEMS[S.item].images.findIndex(i=>i.path===selected):-1;
      S.photo=photoIndex>=0?photoIndex:N?primary(ITEMS[S.item]):0; S.zoom=same && photoIndex>=0 && S.zoom;
      g.start=null;g.axis=null;$('track').classList.remove('dragging');
      if(!same && S.open==='info')closeAll();
      // Only an authoritative publication list can remove items; photo availability cannot.
      // put() or other partial updates do not supply that list.
      if(Array.isArray(publishedIds)) {
        var published=new Set(publishedIds);
        S.cart=Object.fromEntries(Object.keys(S.cart).filter(key=>published.has(key)).map(key=>[key,true]));
      }
      save('nikki-cart',S.cart);
      var infoScroll=$('info').scrollTop, infoFocused=$('info').contains(document.activeElement); render(false);
      if(S.open==='info'){renderInfo();$('info').scrollTop=infoScroll;if(infoFocused)$('info').querySelector('button').focus();}
    },
    put(record,reveal=true) {
      this.replace([...ITEMS.filter(it=>it.key!==record.key),record]);
      if(reveal)goItem(ITEMS.findIndex(it=>it.key===record.key));
    },
    status(message, state='success') {
      $('catalog-status').textContent=message; $('catalog-status').title=message;
      $('catalog-status').hidden=state!=='loading' && state!=='error';
    }
  };
  // Do not clear the saved local basket until the catalog has actually loaded.
  render(false);
})();
