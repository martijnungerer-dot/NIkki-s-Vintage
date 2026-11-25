(function () {
  // Option B, using only the existing public NikkiStore catalog.
  var ITEMS = [], ALL_ITEMS = [], SEARCH_IDS = null;
  // Personal order and lead photo per piece (docs/SMAAKPROFIEL.md, onderdeel 6); null = Nikki's order.
  var PERSONAL = { order: null, lead: {} };
  var CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function read(key) { try { var v=JSON.parse(localStorage.getItem(key)); return v && typeof v==='object' && !Array.isArray(v) ? v : {}; } catch { return {}; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function primary(it) {
    var role=PERSONAL.lead[it.key], personal=role ? it.images.findIndex(i=>i.role===role) : -1;
    return personal>=0 ? personal : Math.max(0, it.images.findIndex(i=>i.main));
  }
  // Pieces in the personal order first; anything else (new, over budget) keeps Nikki's order after them.
  function ordered(items) {
    if(!PERSONAL.order) return items;
    var rank=new Map(PERSONAL.order.map((k,i)=>[k,i])), at=it=>rank.has(it.key)?rank.get(it.key):Infinity;
    return items.map((it,i)=>[it,i]).sort((a,b)=>at(a[0])-at(b[0]) || a[1]-b[1]).map(x=>x[0]);
  }
  function face(it, image=it.images[primary(it)]) { return '<img src="' + esc(image.src) + '" alt="' + esc(image.role || it.title) + '">'; }

  var $ = function (id) { return document.getElementById(id); };
  var ph = $('ph'), N = ITEMS.length;
  var S = { item: 0, photo: 0, prev: N - 1, liked: read('gsf-liked'), cart: read('nikki-cart'), goneFromCart: 0, zoom: false, open: null };
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
  function render(fade, keepTrack) {
    var it = ITEMS[S.item];
    ph.dataset.catalogEmpty=String(!it);
    ph.querySelectorAll('#row button, #photo button, #prev-th').forEach(b=>{b.disabled=!it;});
    if(!it) {
      $('track').replaceChildren(); place(0);
      $('title').textContent='Geen beschikbare stukken'; $('price-text').textContent='';
      $('price').setAttribute('aria-pressed','false'); $('price').setAttribute('aria-label','Geen stuk beschikbaar');
      $('bag-empty').toggleAttribute('hidden',false); $('bag-full').toggleAttribute('hidden',true);
      $('prev-th').querySelector('.face').replaceChildren(); $('prev-th').setAttribute('aria-label','Vorig stuk');
      // The row keeps its four slots, empty when there is nothing to show.
      $('nexts').innerHTML=Array.from({length:3},()=>'<button type="button" class="th" disabled aria-label="Geen volgend stuk"><span class="face"></span></button>').join('');
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
    // With a single piece the slot stays, empty and disabled.
    $('prev-th').disabled=N<2;
    ph.querySelectorAll('[data-act="prev-photo"], [data-act="next-photo"]').forEach(b=>{b.disabled=it.images.length<2;});
    $('prev-th').querySelector('.face').innerHTML = N<2 ? '' : face(p);
    $('prev-th').setAttribute('aria-label', N<2 ? 'Geen vorig stuk' : 'Terug naar ' + p.title);
    var h = '';
    // Always three slots; a slot without a garment stays empty and disabled.
    for (var k=1; k<=3; k++) {
      var i=(S.item+k)%N, available=k<N;
      h+='<button type="button" class="th" data-act="go" data-idx="'+i+'"'+(available?'':' disabled')+' aria-label="'+(available?'Bekijk '+esc(ITEMS[i].title):'Geen volgend stuk')+'"><span class="face">'+(available?face(ITEMS[i]):'')+'</span></button>';
    }
    $('nexts').innerHTML = h;
    // keepTrack: same piece in view, so a zoom or swipe in progress is not interrupted (review MED-4).
    if (!keepTrack) renderTrack();
    if (fade) { var el = $('photo'); el.classList.remove('wissel'); void el.offsetWidth; el.classList.add('wissel'); }
  }
  function goItem(i) { if (!ITEMS[i] || i === S.item) return; S.prev = S.item; S.item = i; S.photo = primary(ITEMS[i]); S.zoom = false; closeAll(); render(true); window.dispatchEvent(new CustomEvent("nikki-browse")); }
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
  // Collection and saved pieces use the same public catalog and local hearts as the shop.
  var destination='', returnFocus=null, infoOrigin=null;
  var lists={
    'Collectie':{query:'',material:'',sort:'order',scroll:0},
    'Mijn favorieten':{query:'',material:'',sort:'order',scroll:0}
  };
  function fold(text) { return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('nl-NL'); }
  function searchWords(query) {
    var words=fold(query).trim().split(/\s+/).filter(Boolean);
    return ALL_ITEMS.filter(it=>words.every(word=>fold([it.title,it.description,it.material,['Ja','Alleen kraag of rand'].includes(it.furClass)?it.species:''].join(' ')).includes(word)));
  }
  function listItems() {
    var state=lists[destination];
    var items=searchWords(state.query).filter(it=>(destination!=='Mijn favorieten' || S.liked[it.displayId]) && (!state.material || it.material===state.material));
    if(state.sort==='price-up')items.sort((a,b)=>a.priceMinor-b.priceMinor);
    if(state.sort==='price-down')items.sort((a,b)=>b.priceMinor-a.priceMinor);
    if(state.sort==='name')items.sort((a,b)=>a.title.localeCompare(b.title,'nl-NL',{sensitivity:'base'}));
    return items;
  }
  function bagIcon(selected) {
    var icon=$(selected?'bag-full':'bag-empty').cloneNode(true);
    icon.removeAttribute('id');icon.removeAttribute('hidden');return icon.outerHTML;
  }
  function heartIcon(selected) {
    var icon=$('like').querySelector('svg').cloneNode(true);
    icon.setAttribute('stroke','currentColor');icon.setAttribute('fill',selected?'currentColor':'none');return icon.outerHTML;
  }
  function listFocus(key,act) {
    var target=Array.from($('cart').querySelectorAll('[data-key]')).find(b=>b.dataset.key===key && b.dataset.act===act);
    (target || $('catalog-search') || $('cart').querySelector('button')).focus({preventScroll:true});
  }
  function renderResults(resetScroll=false) {
    var state=lists[destination], results=$('catalog-results'), active=document.activeElement;
    var focused=results.contains(active), oldButtons=Array.from(results.querySelectorAll('button')).filter(b=>b.dataset.act===active.dataset.act);
    var position=oldButtons.indexOf(active), scroll=resetScroll?0:results.scrollTop, items=listItems();
    $('catalog-count').textContent=items.length+(items.length===1?' stuk':' stukken');
    $('catalog-reset').disabled=!state.query && !state.material && state.sort==='order';
    if(!items.length) {
      var message=state.query || state.material?'Geen stukken gevonden. Pas je zoekopdracht of filters aan.':
        destination==='Mijn favorieten'?'Er zijn nu geen beschikbare stukken met een hartje.':'Er zijn nu geen stukken beschikbaar.';
      results.innerHTML='<li class="catalog-empty muted">'+message+'</li>';
    } else results.innerHTML=items.map(it=>{
      var key=esc(it.key), selected=!!S.cart[it.key], liked=!!S.liked[it.displayId];
      return '<li class="line catalog-item" data-item-key="'+key+'">'+
        '<button type="button" class="face catalog-photo" data-act="list-photo" data-key="'+key+'" aria-label="Bekijk foto’s van '+esc(it.title)+'">'+face(it)+'</button>'+
        '<div class="txt"><button type="button" class="catalog-title" data-act="list-info" data-key="'+key+'" aria-label="Meer over '+esc(it.title)+'">'+esc(it.title)+'</button>'+
        '<div class="catalog-actions"><button type="button" class="chip price catalog-price" data-act="list-cart" data-key="'+key+'" aria-pressed="'+selected+'" aria-label="'+esc(it.price)+', '+esc(it.title)+(selected?', verwijder uit winkelmand':', toevoegen aan winkelmand')+'">'+esc(it.price)+bagIcon(selected)+'</button>'+
        '<button type="button" class="ic" data-act="list-like" data-key="'+key+'" aria-pressed="'+liked+'" aria-label="'+(liked?'Verwijder uit Mijn favorieten: ':'Bewaar in Mijn favorieten: ')+esc(it.title)+'">'+heartIcon(liked)+'</button></div></div></li>';
    }).join('');
    results.scrollTop=scroll;state.scroll=results.scrollTop;
    if(focused) {
      var buttons=Array.from(results.querySelectorAll('button')).filter(b=>b.dataset.act===active.dataset.act);
      var target=buttons.find(b=>b.dataset.key===active.dataset.key) || buttons[Math.min(Math.max(position,0),buttons.length-1)] || $('catalog-search');
      target.focus({preventScroll:true});
    }
  }
  function renderCart() {
    $('cart').setAttribute('aria-label',destination);
    $('cart').classList.toggle('catalog-window',!!lists[destination]);
    var header='<div class="head" style="padding-bottom:10px"><button type="button" class="ic" data-act="close" aria-label="Terug naar de winkel" style="margin-left:-8px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><span style="font-size:26px">'+esc(destination)+'</span><span style="width:44px"></span></div>';
    if(SCREENS[destination]) { $('cart').innerHTML=header+SCREENS[destination].render(api); return; }
    if(!lists[destination]) {
      $('cart').innerHTML=header+'<p class="muted" style="margin:48px 0 0;text-align:center;font-size:18px">Proefboetiek · bekijken en uitproberen, nog niet afrekenen.</p>';
      return;
    }
    var state=lists[destination], materials=Array.from(new Set(ALL_ITEMS.map(it=>it.material).concat(state.material).filter(v=>typeof v==='string' && v.trim()))).sort((a,b)=>a.localeCompare(b,'nl-NL'));
    $('cart').innerHTML=header+
      (destination==='Mijn favorieten'?'<p class="catalog-note muted">Je hartjes worden alleen in deze browser bewaard.</p>':'')+
      '<div class="catalog-tools"><div class="catalog-search"><input id="catalog-search" data-field="query" type="search" autocomplete="off" aria-label="Zoek in '+destination+'" placeholder="Zoek een stuk" value="'+esc(state.query)+'">'+
      '<button id="catalog-reset" type="button" class="ic" data-act="list-reset" aria-label="Wis zoekopdracht, filters en sortering">'+CLOSE+'</button></div>'+
      '<div class="catalog-filters"><select data-field="material" aria-label="Materiaal"><option value="">Elk materiaal</option>'+
      materials.map(m=>'<option value="'+esc(m)+'"'+(m===state.material?' selected':'')+'>'+esc(m)+'</option>').join('')+'</select>'+
      // The heading inside the list and the first option say that this choice is about the order.
      '<select data-field="sort" aria-label="Sorteer stukken"><optgroup label="Sorteren op">'+[['order','Onze volgorde'],['price-up','Prijs laag–hoog'],['price-down','Prijs hoog–laag'],['name','Naam A–Z']]
        .map(([value,label])=>'<option value="'+value+'"'+(state.sort===value?' selected':'')+'>'+label+'</option>').join('')+'</optgroup></select></div></div>'+
      '<p id="catalog-count" class="catalog-count muted" role="status"></p><ul id="catalog-results" class="catalog-results"></ul>';
    var scroll=state.scroll;renderResults();state.scroll=scroll;
  }
  function refreshList() {
    if(S.open==='cart' && SCREENS[destination]) {
      var act=document.activeElement.dataset.act, key=document.activeElement.dataset.key;
      renderCart();
      var same=act && Array.from($('cart').querySelectorAll('button')).find(b=>b.dataset.act===act && b.dataset.key===key);
      (same || $('cart').querySelector('button')).focus({preventScroll:true});
      return;
    }
    if(S.open!=='cart' || !lists[destination])return;
    var active=document.activeElement, field=active.dataset.field, key=active.dataset.key, act=active.dataset.act;
    var selection=field==='query'?[active.selectionStart,active.selectionEnd]:null;
    lists[destination].scroll=$('catalog-results').scrollTop;
    var scroll=lists[destination].scroll;
    renderCart();
    if(field) {
      var control=$('cart').querySelector('[data-field="'+field+'"]');control.focus({preventScroll:true});
      if(selection)control.setSelectionRange(...selection);
    } else if(key)listFocus(key,act);
    else ($('cart').querySelector('[data-act="'+act+'"]') || $('cart').querySelector('button')).focus({preventScroll:true});
    $('catalog-results').scrollTop=scroll;
  }
  function selectFromList(key,detail) {
    if(SEARCH_IDS && !ITEMS.some(it=>it.key===key)) { window.dispatchEvent(new CustomEvent("nikki-search-stop")); }
    var index=ITEMS.findIndex(it=>it.key===key);if(index<0)return;
    var origin={destination,key,act:detail?'list-info':'list-photo'};
    closeAll(false);goItem(index);
    if(detail){open('info');infoOrigin=origin;}
    else ph.querySelector('[data-act="info"]').focus();
  }

  var OPENER = { info: '[data-act="info"]', menu: '.shop' };
  function closeAll(restore=true) {
    var back=restore && S.open==='info'?infoOrigin:null;infoOrigin=null;
    if(S.open==='cart' && lists[destination])lists[destination].scroll=$('catalog-results').scrollTop;
    ['info', 'menu', 'cart'].forEach(function (k) { $(k).hidden = true; if (OPENER[k]) ph.querySelector(OPENER[k]).setAttribute('aria-expanded', 'false'); });
    S.open = null;
    if(back){destination=back.destination;open('cart');listFocus(back.key,back.act);return;}
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
    if(k==='cart' && lists[destination])$('catalog-results').scrollTop=lists[destination].scroll;
    if (OPENER[k]) ph.querySelector(OPENER[k]).setAttribute('aria-expanded', 'true');
  }

  // Every menu line opens a shop screen, except the last one: the entrance for Nikki and the staff.
  Array.from($('menu').children).forEach(b=>{if(b.dataset.act==='staff')return;b.dataset.act='destination';b.dataset.screen=b.textContent;});
  ph.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-act');
    if (a === 'prev-photo') goPhoto(-1, true);
    else if (a === 'next-photo') goPhoto(1, true);
    else if (a === 'like') { var it=ITEMS[S.item]; S.liked[it.displayId] = !S.liked[it.displayId]; save('gsf-liked',S.liked); render(false, true); emit(S.liked[it.displayId]?'like':'unlike',it); }
    else if (a === 'info' || a === 'menu') open(a);
    else if (a === 'destination') { destination=b.dataset.screen; open('cart'); }
    else if (a === 'staff') { closeAll(); window.parent.NikkiApp.openAccount(); }
    else if (a === 'list-photo' || a === 'list-info') selectFromList(b.dataset.key,a==='list-info');
    else if (a === 'list-like' || a === 'list-cart') {
      var item=ALL_ITEMS.find(it=>it.key===b.dataset.key);if(!item)return;
      if(a==='list-like'){S.liked[item.displayId]=!S.liked[item.displayId];save('gsf-liked',S.liked);emit(S.liked[item.displayId]?'like':'unlike',item);}
      else toggleCart(item.key);
      render(false);renderResults();
    }
    else if (a === 'list-reset') {
      var state=lists[destination];state.query='';state.material='';state.sort='order';state.scroll=0;
      renderCart();$('catalog-search').focus();
    }
    else if (a === 'cart-toggle') toggleCart(ITEMS[S.item].key);
    else if (a === 'close') closeAll();
    else if (a === 'go') goItem(Number(b.getAttribute('data-idx')));
    else if (a === 'go-prev') goItem(S.prev);
    else if (S.open==='cart' && SCREENS[destination]?.action) SCREENS[destination].action(a, b, api);
  });
  ph.addEventListener('input',function(e){
    if(e.target.dataset.field!=='query')return;
    lists[destination].query=e.target.value;renderResults(true);
  });
  ph.addEventListener('change',function(e){
    var field=e.target.dataset.field;if(field!=='material' && field!=='sort')return;
    lists[destination][field]=e.target.value;renderResults(true);
  });
  ph.addEventListener('keydown', function (e) {
    if(e.key==='Escape' && S.open)closeAll();
    if(e.key==='Tab' && S.open) {
      var buttons=Array.from($(S.open).querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')), first=buttons[0], last=buttons.at(-1);
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
        clearTimeout(g.viewerTimer);
        g.lastTap = 0; S.zoom = !S.zoom;
        var slide = $('track').children[S.photo], pic = slide.firstElementChild, r = photo.getBoundingClientRect();
        pic.style.transformOrigin = Math.round((e.clientX - r.left) / r.width * 100) + '% ' + Math.round((e.clientY - r.top) / r.height * 100) + '%';
        slide.classList.toggle('zoomed', S.zoom);
      } else {
        g.lastTap = now;
        // One tap: the photo full screen, where Nikki and visitors can zoom in (Martijn, 25 November 2026).
        clearTimeout(g.viewerTimer); g.viewerTimer = setTimeout(function () { if (!S.zoom) openViewer(S.photo); }, 320);
      }
      place(0); return;
    }
    if (S.zoom) { place(0); return; }
    if (axis === 'x' && Math.abs(dx) > 60) goPhoto(dx < 0 ? 1 : -1, false);
    else if (axis === 'y' && Math.abs(dy) > 50) goItem((S.item + (dy < 0 ? 1 : -1) + N) % N);
    else place(0);
  });
  // ---- Photo full screen with zoom: pinch or double tap to zoom, drag to look around, swipe for the next photo. ----
  var viewer = null;
  function openViewer(at) {
    var it = ITEMS[S.item]; if (!it || !it.images.length || S.open) return;
    var v = { at: at, scale: 1, x: 0, y: 0, pointers: new Map(), pinch: null, drag: null, lastTap: 0, opener: document.activeElement };
    var el = document.createElement('div');
    el.className = 'viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Foto’s van ' + it.title);
    el.innerHTML = '<div class="viewer-top"><button type="button" class="ic" data-viewer="close" aria-label="Sluiten">' + CLOSE + '</button></div>' +
      '<div class="viewer-stage"><img alt="" draggable="false"></div>' +
      '<div class="viewer-bar"><button type="button" class="ic" data-viewer="prev" aria-label="Vorige foto"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<div class="dots viewer-dots" role="img"></div>' +
      '<button type="button" class="ic" data-viewer="next" aria-label="Volgende foto"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>';
    ph.appendChild(el); viewer = v; v.el = el; v.img = el.querySelector('img'); v.stage = el.querySelector('.viewer-stage');
    function apply() { v.img.style.transform = 'translate(' + v.x + 'px,' + v.y + 'px) scale(' + v.scale + ')'; }
    function clamp() {
      var r = v.stage.getBoundingClientRect(), mx = r.width * (v.scale - 1) / 2, my = r.height * (v.scale - 1) / 2;
      v.x = Math.max(-mx, Math.min(mx, v.x)); v.y = Math.max(-my, Math.min(my, v.y));
    }
    function show(i) {
      var n = it.images.length; v.at = (i + n) % n; v.scale = 1; v.x = 0; v.y = 0;
      v.img.src = it.images[v.at].src; v.img.alt = (it.images[v.at].role || it.title) + ', foto ' + (v.at + 1) + ' van ' + n; apply();
      var d = ''; for (var k = 0; k < n; k++) d += '<i' + (k === v.at ? ' class="on"' : '') + '></i>';
      var dots = el.querySelector('.viewer-dots'); dots.innerHTML = d; dots.setAttribute('aria-label', 'Foto ' + (v.at + 1) + ' van ' + n);
      el.querySelectorAll('[data-viewer=prev],[data-viewer=next]').forEach(function (b) { b.disabled = n < 2; });
    }
    function zoomAt(scale, cx, cy) {
      var r = v.stage.getBoundingClientRect(), ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2), k = scale / v.scale;
      v.x = ox - (ox - v.x) * k; v.y = oy - (oy - v.y) * k; v.scale = scale; clamp(); apply();
    }
    v.close = function () {
      el.remove(); viewer = null; document.removeEventListener('keydown', v.key);
      if (v.opener && v.opener.focus) v.opener.focus({ preventScroll: true });
      if (S.photo !== v.at) { S.photo = v.at; place(0); }
    };
    v.key = function (e) { if (e.key === 'Escape') v.close(); else if (e.key === 'ArrowLeft') show(v.at - 1); else if (e.key === 'ArrowRight') show(v.at + 1); };
    document.addEventListener('keydown', v.key);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-viewer]'); if (!b) return;
      var a = b.getAttribute('data-viewer');
      if (a === 'close') v.close(); else if (a === 'prev') show(v.at - 1); else if (a === 'next') show(v.at + 1);
    });
    v.stage.addEventListener('pointerdown', function (e) {
      v.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { v.stage.setPointerCapture(e.pointerId); } catch (err) {}
      if (v.pointers.size === 2) {
        var p = Array.from(v.pointers.values());
        v.pinch = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), scale: v.scale }; v.drag = null;
      } else v.drag = { x: e.clientX, y: e.clientY, ox: v.x, oy: v.y, moved: false };
    });
    v.stage.addEventListener('pointermove', function (e) {
      if (!v.pointers.has(e.pointerId)) return;
      v.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (v.pinch && v.pointers.size === 2) {
        var p = Array.from(v.pointers.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        zoomAt(Math.max(1, Math.min(4, v.pinch.scale * d / v.pinch.d)), (p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
      } else if (v.drag) {
        var dx = e.clientX - v.drag.x, dy = e.clientY - v.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) v.drag.moved = true;
        if (v.scale > 1) { v.x = v.drag.ox + dx; v.y = v.drag.oy + dy; clamp(); apply(); }
      }
    });
    function up(e) {
      if (!v.pointers.has(e.pointerId)) return;
      v.pointers.delete(e.pointerId);
      if (v.pinch) { if (v.pointers.size < 2) v.pinch = null; v.drag = null; return; }
      var d = v.drag; v.drag = null; if (!d) return;
      var dx = e.clientX - d.x;
      if (!d.moved) {
        var now = Date.now();
        if (now - v.lastTap < 320) { v.lastTap = 0; if (v.scale > 1) { v.scale = 1; v.x = 0; v.y = 0; apply(); } else zoomAt(2.5, e.clientX, e.clientY); }
        else v.lastTap = now;
      } else if (v.scale === 1 && Math.abs(dx) > 60) show(v.at + (dx < 0 ? 1 : -1));
    }
    v.stage.addEventListener('pointerup', up); v.stage.addEventListener('pointercancel', up);
    show(at); el.querySelector('[data-viewer=close]').focus({ preventScroll: true });
  }

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
      ITEMS=records.filter(r=>r.images?.length).map((r,boutique)=>({boutique,
        key:r.key, displayId:r.displayId, title:r.title, description:r.description, priceMinor:r.priceMinor,
        material:r.material, species:r.species, furClass:r.furClass,
        // Public, human-checked characteristics for the taste profile (docs/SMAAKPROFIEL.md).
        model:r.model, colour:r.colour, length:r.length, fit:r.fit, era:r.era, details:Array.isArray(r.details)?r.details.slice(0,30):[],
        price:new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',minimumFractionDigits:r.priceMinor%100?2:0}).format(r.priceMinor/100),
        measurements:r.measurements, images:r.images.map(i=>({src:i.src,path:i.path,role:i.role,main:i.main}))
      }));
      ALL_ITEMS=ordered(ITEMS);
      ITEMS=SEARCH_IDS ? ALL_ITEMS.filter(it=>SEARCH_IDS.has(it.key)) : ALL_ITEMS.slice();
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
        var published=new Set(publishedIds), before=Object.keys(S.cart).length;
        S.cart=Object.fromEntries(Object.keys(S.cart).filter(key=>published.has(key)).map(key=>[key,true]));
        // Unique pieces: if one left the collection (sold), say so once in the basket.
        var gone=before-Object.keys(S.cart).length;
        S.goneFromCart+=gone;
        // Only write when something was removed, so another tab's newer basket is not overwritten.
        if(gone)save('nikki-cart',S.cart);
      }
      var infoScroll=$('info').scrollTop, infoFocused=$('info').contains(document.activeElement); render(false);
      if(S.open==='info'){renderInfo();$('info').scrollTop=infoScroll;if(infoFocused)$('info').querySelector('button').focus();}
      refreshList();
      catalogListeners.forEach(fn=>fn(api));
    },
    put(record,reveal=true) {
      // Rebuild in Nikki's order, not the personal one, so that her order survives (review MED-4).
      this.replace([...ALL_ITEMS.slice().sort((a,b)=>a.boutique-b.boutique).filter(it=>it.key!==record.key),record]);
      if(reveal)goItem(ITEMS.findIndex(it=>it.key===record.key));
    },
    status(message, state='success') {
      $('catalog-status').textContent=message; $('catalog-status').title=message;
      $('catalog-status').hidden=state!=='loading' && state!=='error';
    }
  };
  // Screens in app/store-screens/ plug in here, so each piece can be built in its own file.
  // Contract and ownership: docs/FRONTEND-PLAN.md. Only public catalog fields are exposed.
  var SCREENS={}, catalogListeners=[], signalListeners=[];
  function toggleCart(key, value=!S.cart[key]) {
    var was=!!S.cart[key]; if(value)S.cart[key]=true; else delete S.cart[key]; save('nikki-cart',S.cart); render(false, true);
    var it=ALL_ITEMS.find(x=>x.key===key); if(it && was!==!!value)emit(value?'cart':'uncart',it);
  }
  // Signals for the taste profile: only a copy of public fields, never photos or links.
  function publicCopy(it) { return {key:it.key,priceMinor:it.priceMinor,material:it.material,model:it.model,colour:it.colour,length:it.length,fit:it.fit,era:it.era,details:it.details.slice(),furClass:it.furClass}; }
  function emitSignal(signal) { signalListeners.forEach(fn=>{try{fn(signal,api);}catch(e){}}); }
  function emit(type,it) { emitSignal({type,item:publicCopy(it)}); }
  var api={
    esc, face, CLOSE, bagIcon, heartIcon,
    items:()=>ALL_ITEMS.slice(),
    searchWords,
    closePanels:()=>closeAll(false),
    visibleItems:()=>ITEMS.slice(),
    filterSearch(ids, refresh=false) {
      var current=ITEMS[S.item], previous=ITEMS[S.prev]?.key, selected=current?.images[S.photo]?.path;
      SEARCH_IDS=Array.isArray(ids)?new Set(ids):null;
      ITEMS=SEARCH_IDS?ALL_ITEMS.filter(it=>SEARCH_IDS.has(it.key)):ALL_ITEMS.slice();N=ITEMS.length;
      var index=ITEMS.findIndex(it=>it.key===current?.key), same=index>=0;
      S.item=same?index:0;S.prev=ITEMS.findIndex(it=>it.key===previous);
      if(S.prev<0 || S.prev===S.item)S.prev=N>1?(S.item+N-1)%N:0;
      var photoIndex=refresh&&same?ITEMS[S.item].images.findIndex(i=>i.path===selected):-1;
      S.photo=photoIndex>=0?photoIndex:N?primary(ITEMS[S.item]):0;
      S.zoom=refresh&&same&&photoIndex>=0&&S.zoom;
      // A signed-link/catalog refresh is not a navigation: preserve open screens and photos.
      if(!refresh || (!same&&S.open==='info'))closeAll(false);
      render(false, refresh&&same&&photoIndex>=0);
    },
    publicCopy,
    current:()=>ITEMS[S.item] || null,
    cartKeys:()=>Object.keys(S.cart),
    // Number of basket pieces that left the collection since the last time the basket said so.
    takeGoneFromCart:()=>{var n=S.goneFromCart;S.goneFromCart=0;return n;},
    toggleCart,
    isLiked:it=>!!S.liked[it.displayId],
    show:key=>{var i=ITEMS.findIndex(it=>it.key===key);if(i<0)return false;closeAll(false);goItem(i);return true;},
    refresh:()=>{if(S.open==='cart' && SCREENS[destination])refreshList();},
    // Applies a personal order and lead photos without moving the piece in view or its photo.
    // order: garment keys (or null for Nikki's order); lead: {key: existing photo role};
    // fromStart: true only while the catalog is first drawn, to open on the best match.
    personalise(choice) {
      var order=Array.isArray(choice?.order)?choice.order.filter(k=>typeof k==='string').slice(0,1000):null;
      var lead={}; Object.entries(choice?.lead||{}).forEach(([k,v])=>{if(typeof v==='string' && v.length<=40)lead[k]=v;});
      var current=ITEMS[S.item]?.key, previous=ITEMS[S.prev]?.key;
      PERSONAL={order,lead};
      // Rebuild from Nikki's order so that switching personalisation off restores it exactly.
      ALL_ITEMS=ordered(ALL_ITEMS.slice().sort((a,b)=>a.boutique-b.boutique));
      ITEMS=SEARCH_IDS?ALL_ITEMS.filter(it=>SEARCH_IDS.has(it.key)):ALL_ITEMS.slice();N=ITEMS.length;
      if(!N)return;
      if(choice?.fromStart) { // only before anything is painted: start at the best match
        S.item=0;S.prev=N-1===0?0:N-1;S.photo=primary(ITEMS[0]);S.zoom=false;
      } else {
        S.item=Math.max(0,ITEMS.findIndex(it=>it.key===current));
        S.prev=ITEMS.findIndex(it=>it.key===previous);if(S.prev<0 || S.prev===S.item)S.prev=N-1===S.item?0:N-1;
      }
      // Without fromStart the piece in view, its photo and any zoom or swipe stay as they are.
      render(false, !choice?.fromStart && ITEMS[S.item]?.key===current);
      if(S.open==='cart')refreshList();
    },
    status:(message,state)=>window.NikkiStore.status(message,state)
  };
  window.NikkiShop={
    // render(api) returns the panel body below the shared header; action(act, button, api) handles its data-act clicks.
    registerScreen(name, screen) { SCREENS[name]=screen; },
    // Called with api after every catalog replacement (initial load and refresh).
    onCatalog(fn) { catalogListeners.push(fn); },
    // Called on like/unlike/cart/uncart with a public copy of the piece. Search filters are not taste.
    // A listener error never breaks the shop. Wiring to the taste profile: docs/SMAAKPROFIEL.md.
    onSignal(fn) { signalListeners.push(fn); },
    api
  };
  // Another tab changed the basket or hearts: take that over instead of writing an old copy back.
  window.addEventListener('storage', function (e) {
    if (e.key !== 'nikki-cart' && e.key !== 'gsf-liked') return;
    if (e.key === 'nikki-cart') S.cart = read('nikki-cart'); else S.liked = read('gsf-liked');
    render(false, true); refreshList();
  });
  // Do not clear the saved local basket until the catalog has actually loaded.
  render(false);
})();
