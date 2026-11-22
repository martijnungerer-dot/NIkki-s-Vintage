import {icon} from './icons.js';
export function createCollection({api,$,state,show,say,shopStatus,action,controls}) {
  function withPhotos(row,urls){
    const images=row.data.images.filter(i=>urls.has(i.path)).map(i=>({...i,src:urls.get(i.path)}));
    if(!images.length)return null;
    // If only the main photo is unreachable, show the first reachable one instead of hiding the piece.
    if(!images.some(i=>i.main))images[0]={...images[0],main:true};
    return {...row.data,key:row.id,displayId:row.display_id,images};
  }
  // Editing needs every photo, otherwise saving would silently drop the missing ones.
  async function hydrate(row){
    const record=withPhotos(row,await api.imageUrls(row.data.images.map(i=>i.path)));
    if(!record||record.images.length!==row.data.images.length)throw Error('Niet alle foto’s van dit stuk konden worden geopend. Probeer het later opnieuw.');
    return record;
  }
  // Jouw collectie: a grid of photo cards (docs/BEHEER-ONTWERPBRIEF.md). The first card (+) is
  // fixed in app/index.html; the cards of the pieces are rebuilt here.
  const euro=minor=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',minimumFractionDigits:minor%100?2:0}).format(minor/100);
  const UNDO_MS=5000;
  // Capture the version at confirmation; undo only cancels a request that has not started.
  const pendingSold=new Map();
  const errors=new Map();
  // Pieces being marked as sold: id -> {value: what is typed so far, editing: the amount field is open}. Survives a refresh of the grid.
  const asking=new Map();
  // What sold pieces went for (staff only): id -> cents.
  let sales=new Map();
  // "120", "120,50" or "€ 120" -> cents; null when it is not a usable amount.
  function cents(text){
    const clean=String(text).replace(/[€\s]/g,'').replace(',','.');
    if(!/^\d+(\.\d{1,2})?$/.test(clean))return null;
    const value=Math.round(Number(clean)*100);return value<=100000000?value:null;
  }
  let thumbs=new Map();
  const intake=()=>$('intake').contentWindow.NikkiIntake;
  // Unfinished new pieces (concepten) from this device: a red card each, before the saved pieces.
  let concepts=[],conceptUrls=[];
  async function loadConcepts(){
    let list=[];
    if(state.staff){try{list=await intake().concepts();}catch{list=[];}}
    conceptUrls.forEach(u=>URL.revokeObjectURL(u));conceptUrls=[];
    concepts=list.map(c=>{const src=c.photo?URL.createObjectURL(c.photo):null;if(src)conceptUrls.push(src);return {...c,src};});
  }
  function conceptCard(c){
    const item=el('li','piece');item.dataset.status='concept';item.dataset.concept=c.id;
    const title=c.title||'Nog geen titel';
    const open=el('button','piece-open');open.type='button';const left=c.open>0?'Nog '+c.open+(c.open===1?' stap':' stappen'):'Klaar om op te slaan';
    open.setAttribute('aria-label','Verder met: '+title+'. Niet af, nog niet in de boetiek. '+left);
    const photo=el('span','piece-photo');
    if(c.src){const img=el('img');img.alt='';img.width=400;img.height=500;img.src=c.src;photo.append(img);}
    open.append(photo,el('span','piece-title',title),el('span','piece-price',c.priceMinor?euro(c.priceMinor):'Nog geen prijs'));
    open.addEventListener('click',()=>action(async()=>{await intake().openConcept(c.id);show('intake');say('Verder met je concept.');}));
    // Red frame plus the number of steps still needed (Martijn, 22 Nov 2026); never text on the photo.
    const foot=el('div','piece-foot');foot.append(el('span','piece-status',left));
    item.append(open,foot);return item;
  }
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function card(row){
    const entry=pendingSold.get(row.id), pending=!!entry, sold=row.status==='sold';
    const item=el('li','piece');item.dataset.id=row.id;item.dataset.status=sold?'sold':pending?'pending':'published';
    const open=el('button','piece-open');open.type='button';open.setAttribute('aria-label','Bewerken: '+row.data.title);
    const photo=el('span','piece-photo'), main=row.data.images.find(i=>i.main)||row.data.images[0], src=main&&thumbs.get(main.path);
    // A photo that cannot be shown leaves an empty tile; the card itself keeps working.
    if(src){const img=el('img');img.alt='';img.loading='lazy';img.width=400;img.height=500;img.src=src;img.addEventListener('error',()=>img.remove());photo.append(img);}
    open.dataset.locked=String(pending);
    open.append(photo,el('span','piece-title',row.data.title),el('span','piece-price',euro(row.data.priceMinor)));
    open.addEventListener('click',()=>action(async()=>{
      if(pendingSold.has(row.id))return;
      // An unfinished piece stays on this device as a concept (red card); only if this device cannot store it, ask first.
      const lost=(()=>{try{return !!intake().cannotKeep();}catch{return true;}})();
      if(lost&&!confirm('Bewaren op dit toestel lukt niet: je niet-opgeslagen invoer gaat verloren. Toch dit stuk openen?'))return;
      const version=row.version;
      await intake().load(await hydrate(row),{version});
      state.editVersions.set(row.id,version);
      show('intake');say('Stuk geopend.');
    }));
    const foot=el('div','piece-foot'), status=el('span','piece-status',sold?'Verkocht':pending?'Wordt verkocht voor '+euro(entry.price)+'…':'In de boetiek');
    foot.append(status);
    if(sold&&sales.has(row.id))foot.append(el('span','piece-soldfor','voor '+euro(sales.get(row.id))));
    if(pending){
      status.setAttribute('role','status');
      if(!entry.saving){
        const undo=el('button','piece-undo','Ongedaan maken');undo.type='button';undo.setAttribute('aria-label','Ongedaan maken: '+row.data.title+' blijft beschikbaar');
        undo.addEventListener('click',()=>{cancel(row.id);redraw(row.id,'.piece-sold');});
        foot.append(undo);
      }
    }else if(!sold&&asking.has(row.id)){
      const ask=asking.get(row.id);
      // Nothing is saved for five seconds, so a wrong tap can be undone. Sold itself can never be undone.
      const begin=price=>{
        if(state.busy||pendingSold.has(row.id)||row.status!=='published')return;
        asking.delete(row.id);errors.delete(row.id);
        const entry={price,version:row.version,saving:false};pendingSold.set(row.id,entry);
        entry.timer=setTimeout(()=>commitSold(row.id,entry),UNDO_MS);redraw(row.id,'.piece-undo');
      };
      const cancelAsk=el('button','piece-cancel','Annuleer');cancelAsk.type='button';
      cancelAsk.addEventListener('click',()=>{asking.delete(row.id);redraw(row.id,'.piece-sold');});
      if(!ask.editing){
        // First question: sold for the asking price? One tap. A different amount opens the field.
        const box=el('div','piece-ask piece-ask-quick');box.setAttribute('role','group');box.setAttribute('aria-label','Verkocht: '+row.data.title);
        const direct=el('button','piece-confirm piece-direct','Verkocht voor '+euro(row.data.priceMinor));direct.type='button';
        direct.addEventListener('click',()=>begin(row.data.priceMinor));
        const other=el('button','piece-other','Ander bedrag');other.type='button';
        other.addEventListener('click',()=>{ask.editing=true;ask.value=String(row.data.priceMinor/100).replace('.',',');redraw(row.id,'.piece-euro input');});
        box.append(direct,other,cancelAsk);foot.append(box);
      }else{
        const form=el('form','piece-ask');form.noValidate=true;
        const label=el('label',null,'Verkocht voor');label.htmlFor='sold-price-'+row.id;
        const field=el('span','piece-euro','€ '), input=el('input');input.id='sold-price-'+row.id;input.inputMode='decimal';input.autocomplete='off';input.value=ask.value;
        input.setAttribute('aria-describedby','sold-error-'+row.id);input.addEventListener('input',()=>{ask.value=input.value;});field.append(input);
        const error=el('p','piece-error');error.id='sold-error-'+row.id;error.setAttribute('role','alert');
        const confirm=el('button','piece-confirm','Verkocht');confirm.type='submit';
        form.addEventListener('submit',event=>{
          event.preventDefault();
          const price=cents(input.value);
          if(price===null){error.textContent='Vul een bedrag in, bijvoorbeeld 120.';input.focus();return;}
          begin(price);
        });
        form.append(label,field,error,confirm,cancelAsk);foot.append(form);
      }
    }else if(!sold){
      const mark=el('button','piece-sold');mark.type='button';mark.title='Markeer verkocht';mark.setAttribute('aria-label','Markeer verkocht: '+row.data.title);mark.append(icon('tag'));
      mark.addEventListener('click',()=>{if(state.busy||pendingSold.has(row.id))return;errors.delete(row.id);asking.set(row.id,{value:String(row.data.priceMinor/100).replace('.',','),editing:false});redraw(row.id,'.piece-direct');});
      foot.append(mark);
    }
    item.append(open,foot);
    if(errors.has(row.id)){const error=el('p','piece-error',errors.get(row.id));error.setAttribute('role','alert');item.append(error);}
    return item;
  }
  function redraw(id,focus){
    const row=state.rows.find(r=>r.id===id), old=[...$('items').children].find(li=>li.dataset.id===id);
    if(!row||!old)return;
    const next=card(row);old.replaceWith(next);controls();if(focus)next.querySelector(focus)?.focus({preventScroll:true});
  }
  function cancel(id){
    const entry=pendingSold.get(id);if(!entry||entry.saving)return;
    clearTimeout(entry.timer);pendingSold.delete(id);
  }
  function cancelWaiting(){
    if(!pendingSold.size)return;
    for(const id of pendingSold.keys())cancel(id);
    render();
  }
  function updateShop(){
    const published=state.rows.filter(r=>r.status==='published'),records=[];let missing=0;
    for(const row of published){const record=withPhotos(row,thumbs);if(record)records.push(record);else missing++;}
    state.skipped=missing;
    $('shop').contentWindow.NikkiStore.replace(records.reverse(),published.map(row=>row.id));
  }
  async function commitSold(id,entry){
    if(pendingSold.get(id)!==entry)return;
    const row=state.rows.find(r=>r.id===id);
    if(!state.staff||!api.session||document.hidden||document.body.dataset.screen!=='manage'||!row||row.status!=='published'||row.version!==entry.version){cancel(id);redraw(id);return;}
    // Another action (a refresh, opening a piece) is running: save as soon as it is done.
    if(state.busy){entry.timer=setTimeout(()=>commitSold(id,entry),300);return;}
    const hadFocus=document.activeElement?.closest('.piece')?.dataset.id===id;
    await action(async()=>{
      entry.saving=true;redraw(id);
      try{
        const saved=await api.sold(id,entry.version,entry.price);
        row.status='sold';if(saved?.version)row.version=saved.version;
        if(state.editVersions.has(id)&&saved?.version)state.editVersions.set(id,saved.version);
      }catch(error){pendingSold.delete(id);errors.set(id,error.message);redraw(id);throw error;}
      pendingSold.delete(id);sales.set(id,entry.price);updateShop();redraw(id);
      // A confirmed sale stays sold even if the subsequent refresh is unavailable.
      try{await refresh();say('Als verkocht opgeslagen.');}
      catch{say('Verkocht opgeslagen. Vernieuw de collectie om de laatste gegevens te laden.','error');}
    });
    if(hadFocus&&document.body.dataset.screen==='manage'&&document.activeElement===document.body){
      [...$('items').children].find(li=>li.dataset.id===id)?.querySelector('.piece-open')?.focus({preventScroll:true});
    }
  }
  function render(){
    const active=document.activeElement,id=active?.closest('.piece')?.dataset.id,cls=active?.className,selection=active?.selectionStart;
    const scroll=$('manage').scrollTop;
    [...$('items').querySelectorAll('.piece')].forEach(li=>li.remove());
    $('empty').hidden=!state.staff||state.rows.length+concepts.length>0;
    if(state.staff)$('items').append(...concepts.map(conceptCard),...state.rows.map(card));
    controls();$('manage').scrollTop=scroll;
    const replacement=id&&[...$('items').children].find(li=>li.dataset.id===id);
    const focus=replacement&&[...replacement.querySelectorAll('button,input')].find(e=>e.className===cls);
    if(focus&&!focus.disabled){focus.focus({preventScroll:true});if(selection!=null&&typeof focus.setSelectionRange==='function')focus.setSelectionRange(selection,selection);}
  }
  // Back on Jouw collectie: show the concepts as they are now on this device.
  new MutationObserver(()=>{if(document.body.dataset.screen!=='manage')cancelWaiting();else loadConcepts().then(render);}).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
  window.addEventListener('pagehide',cancelWaiting);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelWaiting();});
  async function refresh(){
    shopStatus('Collectie laden…','loading');
    const next=await api.list();
    const published=next.filter(r=>r.status==='published');
    // One batch: every photo of the available pieces, plus the main photo of sold pieces for the staff grid.
    const soldMain=state.staff?next.filter(r=>r.status==='sold').map(r=>(r.data.images.find(i=>i.main)||r.data.images[0])?.path).filter(Boolean):[];
    const urls=await api.imageUrls([...new Set([...published.flatMap(r=>r.data.images.map(i=>i.path)),...soldMain])]);
    // Sale prices are an extra for the staff grid; if they cannot be read the collection still loads.
    if(state.staff){try{sales=new Map((await api.sales()).map(row=>[row.id,row.sold_price_minor]));}catch{}}
    state.rows=next;state.lastRefresh=Date.now();thumbs=urls;
    for(const [id,entry] of pendingSold){
      const row=next.find(r=>r.id===id);
      if(!row||row.status!=='published'||row.version!==entry.version)cancel(id);
    }
    for(const id of asking.keys())if(!next.some(r=>r.id===id&&r.status==='published'))asking.delete(id);
    updateShop();
    shopStatus('');
    await loadConcepts();
    render();
  }
  function startRenewal(){
  // Renew photo links (valid for one hour) before they expire; don't overwrite the in-progress intake form.
  // A tab that was in the background longer than that is refreshed as soon as it is visible again.
  const renew=()=>{if(api.configured()&&!document.hidden&&!state.busy&&Date.now()-state.lastRefresh>40*60*1000)action(refresh);};
  setInterval(renew,5*60*1000);
  document.addEventListener('visibilitychange',renew);
  }
  // Nieuw stuk always starts empty; whatever was open stays on this device as a concept.
  $('new').addEventListener('click',()=>{try{intake().newPiece();}catch{}},{capture:true});
  return {refresh,hydrate,startRenewal,conceptCount:async()=>{try{return (await intake().concepts()).length;}catch{return 0;}}};
}
