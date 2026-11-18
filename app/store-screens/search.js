(function () {
  // The conversation is ephemeral; only the chosen help mode is retained.
  var shop=window.NikkiShop.api, $=id=>document.getElementById(id), esc=shop.esc;
  var MODES=[['uit','Uit','Alleen zoeken, zonder gesprek.'],['zakelijk','Zakelijk','Korte antwoorden, knoppen om te verfijnen.'],['gewoon','Gewoon','Korte zinnen en soms één vraag.'],['meer','Meer uitleg','Zegt ook waarom, en helpt bij twijfel.']];
  var KEY='gsf-zoekhulp', mode='gewoon';
  try { var saved=localStorage.getItem(KEY);if(MODES.some(m=>m[0]===saved))mode=saved; } catch {}
  var state={query:'',filters:{},turns:[],ids:null,busy:false,small:false,open:null,fallback:false};
  var request=0, controller=null, historyOpen=false, historyBackPending=false, pendingOpen=null;
  var desktop=matchMedia('(min-width:900px)');
  var stage=document.createElement('div');stage.className='search-stage';
  $('ph').before(stage);var side=document.createElement('aside');side.id='side';side.className='search-side';side.setAttribute('aria-label','Gesprek');stage.append(side,$('ph'));
  var shrink='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/></svg>';
  var arrow='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  function currentItems(ids) { var keys=new Set(ids||[]);return shop.items().filter(it=>keys.has(it.key)); }
  function count(ids) { var n=currentItems(ids).length;return n?n+' gevonden.':'Niets gevonden voor “'+state.query+'”.'; }
  function last() { return state.turns.at(-1); }
  function chips(buttons) { return (buttons||[]).map(t=>'<button type="button" class="search-chip" data-search-chip="'+esc(t)+'">'+esc(t)+'</button>').join(''); }
  function links(turn) {
    var items=currentItems(turn.ids); if(!items.length || items.length>2)return '';
    return '<p class="search-reply">'+items.map(it=>'<button type="button" class="search-named" data-search-item="'+esc(it.key)+'">'+esc(it.title)+'</button>').join(' en ')+'</p><div class="search-links">'+items.map(it=>'<button type="button" class="search-link" data-search-item="'+esc(it.key)+'">'+esc(it.title)+' · '+esc(it.price)+' →</button>').join('')+'</div>';
  }
  function grid(ids) { return '<div class="hits">'+currentItems(ids).map(it=>'<button type="button" data-search-item="'+esc(it.key)+'" aria-label="Bekijk '+esc(it.title)+'">'+shop.face(it)+'<span>'+esc(it.price)+'</span></button>').join('')+'</div>'; }
  function full(big) {
    var html=big?'<div class="head"><h2>Het gesprek</h2><button type="button" class="ic" data-search-close aria-label="Gesprek verkleinen">'+shrink+'</button></div>':'<h2>Wat zoek je?</h2>';
    if(!state.turns.length)html+='<p class="search-reply muted">Zeg het in je eigen woorden in de zoekbalk, bijvoorbeeld “een warme jas voor de winter, tot € 300”. Ik zoek alleen in wat Nikki nu heeft.</p>';
    state.turns.forEach((t,i)=>{
      html+='<div class="search-turn"><div class="search-me">'+esc(t.text)+'</div>';
      if(t.reaction)html+='<p class="search-reply">'+esc(t.reaction)+'</p>'+links(t);
      // Earlier follow-up questions remain part of the conversation when answered.
      if(t.question&&mode!=='zakelijk')html+='<p class="search-reply">'+esc(t.question)+'</p>';
      if(i===state.turns.length-1 && !state.busy)html+=grid(t.ids)+'<div class="chips">'+chips(t.buttons)+'</div>';
      html+='</div>';
    });
    if(state.busy)html+='<p class="search-reply" role="status">Even zoeken…</p>';
    html+='<form class="search-follow"><input type="text" maxlength="300" aria-label="Verder zoeken" placeholder="Verder zoeken…" autocomplete="off" enterkeyhint="send"><button type="submit" class="ic" aria-label="Verstuur vraag">'+arrow+'</button></form>';
    return html;
  }
  function updateFull(el,big) {
    var active=document.activeElement, input=el.querySelector('input'), value=input?.value||'', focused=active===input, selection=focused?[input.selectionStart,input.selectionEnd]:null;
    el.innerHTML=full(big);if(value)el.querySelector('input').value=value;
    if(focused){el.querySelector('input').focus({preventScroll:true});if(selection)el.querySelector('input').setSelectionRange(...selection);}
  }
  function render() {
    document.body.classList.toggle('search-off',mode==='uit');document.body.classList.toggle('search-active',!!state.query);
    $('search').setAttribute('aria-busy',String(state.busy));$('clear').hidden=!state.query;
    $('setbtn').setAttribute('aria-label','Hulp bij zoeken: '+MODES.find(m=>m[0]===mode)[1]);
    var focusedMode=$('modes').contains(document.activeElement)?document.activeElement.dataset.mode:null;
    $('modes').innerHTML=MODES.map(m=>'<button type="button" class="search-mode" role="radio" data-mode="'+m[0]+'" aria-checked="'+(m[0]===mode)+'"><i aria-hidden="true"></i><span><b>'+m[1]+'</b><small>'+m[2]+'</small></span></button>').join('');
    if(focusedMode)$('modes').querySelector('[data-mode="'+focusedMode+'"]')?.focus({preventScroll:true});
    $('strip').hidden=!state.query;$('strip').classList.toggle('small',state.small);
    var summary=state.busy?'Even zoeken…':(last()?.reaction||count(state.ids));
    $('search-summary').querySelector('span').textContent=summary.split(/(?<=[.!?])\s/)[0];
    $('search-summary').disabled=mode==='uit';$('search-summary').querySelector('svg').hidden=mode==='uit';
    $('strip').querySelector('.chips').innerHTML=mode==='uit'||state.busy?'':chips(last()?.buttons);
    updateFull(side,false);if(state.open==='big')updateFull($('big'),true);
  }
  function inertBackground(active) {
    Array.from($('ph').children).forEach(el=>{if(el.id!=='big'&&el.id!=='set')el.inert=active;});side.inert=active;
  }
  function close(fromBack=false) {
    var was=state.open;if(!was)return;state.open=null;$('set').hidden=true;$('big').hidden=true;
    $('setbtn').setAttribute('aria-expanded','false');$('search-summary').setAttribute('aria-expanded','false');inertBackground(false);
    if(historyOpen){historyOpen=false;if(!fromBack && history.state?.nikkiSearchPanel){historyBackPending=true;history.back();}}
    (was==='big'?$('search-summary'):$('setbtn')).focus({preventScroll:true});
  }
  function open(kind) {
    // history.back is asynchronous; do not push a new panel before that traversal finishes.
    if(historyBackPending){pendingOpen=kind;return;}
    if(kind==='big'&&(mode==='uit'||desktop.matches))return;
    if(state.open===kind){close();return;}
    if(state.open){close();if(historyBackPending){pendingOpen=kind;return;}}shop.closePanels();state.open=kind;
    if(kind==='big'){$('big').style.top=Math.max(0,$('strip').offsetTop-4)+'px';updateFull($('big'),true);$('search-summary').setAttribute('aria-expanded','true');}
    else $('setbtn').setAttribute('aria-expanded','true');
    $(kind).hidden=false;inertBackground(true);$(kind).querySelector(kind==='set'?'[aria-checked=true]':'button').focus();
    try { history.pushState({nikkiSearchPanel:true},'');historyOpen=true; } catch {}
  }
  window.addEventListener('popstate',()=>{
    if(historyBackPending){historyBackPending=false;var next=pendingOpen;pendingOpen=null;if(next)open(next);return;}
    if(state.open)close(true);
  });
  desktop.addEventListener('change',()=>{if(state.open==='big')close();});
  function cancel() { request++;controller?.abort();controller=null;state.busy=false; }
  function stop() {
    pendingOpen=null;cancel();close();state={query:'',filters:{},turns:[],ids:null,busy:false,small:false,open:null,fallback:false};
    $('q').value='';shop.filterSearch(null);render();$('q').focus({preventScroll:true});
  }
  function local(text,failed) {
    state.ids=shop.searchWords(text).map(it=>it.key);state.filters={};state.fallback=true;
    return {ids:state.ids, reaction:(failed?'De zoekhulp is even niet beschikbaar; je zoekt nu op woorden. ':'')+count(state.ids),question:null,buttons:[]};
  }
  async function ask(text) {
    text=String(text||'').trim().slice(0,300);if(!text)return;
    cancel();var token=request;state.query=text;state.small=false;state.busy=true;$('q').value=text;
    var context=state.turns.flatMap(t=>[{role:'user',text:t.text},{role:'assistant',text:[t.question,t.reaction].filter(Boolean).join(' ')}]).filter(t=>t.text).slice(-6).map(t=>({...t,text:t.text.slice(0,300)}));
    var turn={text,ids:[]};state.turns.push(turn);render();
    var reply;
    if(mode==='uit')reply=local(text,false);
    else {
      var activeController=new AbortController();controller=activeController;
      var timer=setTimeout(()=>activeController.abort(),25000);
      try {
        var result=await window.parent.NikkiApp.search({question:text,mode,filters:state.filters,context},activeController.signal);
        if(token!==request)return;
        if(result?.source!=='ai'||!Array.isArray(result.ids)||typeof result.reaction!=='string'||!result.filters||typeof result.filters!=='object')throw Error('Invalid search response');
        var allowed=new Set(shop.items().map(it=>it.key));
        reply={ids:[...new Set(result.ids.filter(id=>allowed.has(id)))],reaction:result.reaction.slice(0,500),question:mode==='zakelijk'?null:typeof result.question==='string'?result.question.slice(0,300):null,buttons:Array.isArray(result.buttons)?result.buttons.filter(b=>typeof b==='string'&&b.length<=80).slice(0,4):[]};
        state.filters=result.filters;state.fallback=false;
      } catch { if(token!==request)return;reply=local(text,true); }
      finally { clearTimeout(timer); }
    }
    if(token!==request)return;
    state.busy=false;state.ids=reply.ids;Object.assign(turn,reply);shop.filterSearch(state.ids);render();
  }
  $('search').addEventListener('submit',e=>{e.preventDefault();ask($('q').value);$('q').blur();});
  $('q').addEventListener('input',()=>{if(!$('q').value.trim()&&state.query)stop();});
  $('clear').addEventListener('click',stop);$('setbtn').addEventListener('click',()=>open('set'));$('search-summary').addEventListener('click',()=>open('big'));
  document.addEventListener('submit',e=>{if(!e.target.matches('.search-follow'))return;e.preventDefault();var input=e.target.querySelector('input'),text=input.value;input.value='';ask(text);});
  document.addEventListener('click',e=>{
    var b=e.target.closest('[data-mode],[data-search-close],[data-search-chip],[data-search-item]');if(!b)return;
    if(b.hasAttribute('data-search-close'))return close();
    if(b.dataset.mode){mode=b.dataset.mode;try{localStorage.setItem(KEY,mode);}catch{}close();cancel();if(state.query){state.turns=[];state.filters={};ask(state.query);}else render();return;}
    if(b.dataset.searchChip){ask(b.dataset.searchChip);return;}
    if(b.dataset.searchItem){var key=b.dataset.searchItem;if(!shop.items().some(it=>it.key===key))return;
      if(!shop.visibleItems().some(it=>it.key===key)){state.ids=[key,...(state.ids||[])];shop.filterSearch(state.ids);}
      shop.show(key);state.small=true;close();render();
    }
  });
  document.addEventListener('keydown',e=>{
    if(!state.open)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
    if(e.key==='Tab'){
      var controls=Array.from($(state.open).querySelectorAll('button:not([disabled]),input:not([disabled])')),first=controls[0],end=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}
    }
    if(state.open==='set'&&['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
      e.preventDefault();var opts=Array.from($('modes').children),at=opts.indexOf(document.activeElement);opts[e.key==='Home'?0:e.key==='End'?3:(at+(e.key==='ArrowUp'?3:1))%4].focus();
    }
  },true);
  window.addEventListener('nikki-browse',()=>{if(state.query){state.small=true;render();}});
  window.addEventListener('nikki-search-stop',stop);
  window.NikkiShop.onCatalog(()=>{
    if(state.query){
      if(state.fallback){state.ids=shop.searchWords(state.query).map(it=>it.key);shop.filterSearch(state.ids,true);}
      // NikkiStore.replace already reapplies AI ids while preserving photo and open panels.
      render();
    }
  });
  render();
})();
