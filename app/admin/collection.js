import {icon} from './icons.js';
export function createCollection({api,$,state,show,say,shopStatus,action}) {
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
  // Pieces marked as sold but not saved yet: id -> timer. Until the timer ends, Ongedaan maken cancels it.
  const pendingSold=new Map();
  let thumbs=new Map();
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function card(row){
    const pending=pendingSold.has(row.id), sold=row.status==='sold';
    const item=el('li','piece');item.dataset.id=row.id;item.dataset.status=sold?'sold':pending?'pending':'published';
    const open=el('button','piece-open');open.type='button';open.setAttribute('aria-label','Bewerken: '+row.data.title);
    const photo=el('span','piece-photo'), main=row.data.images.find(i=>i.main)||row.data.images[0], src=main&&thumbs.get(main.path);
    // A photo that cannot be shown leaves an empty tile; the card itself keeps working.
    if(src){const img=el('img');img.alt='';img.loading='lazy';img.src=src;img.addEventListener('error',()=>img.remove());photo.append(img);}
    open.append(photo,el('span','piece-title',row.data.title),el('span','piece-price',euro(row.data.priceMinor)));
    open.addEventListener('click',()=>action(async()=>{
      const unsaved=(()=>{try{return $('intake').contentWindow.NikkiIntake.hasUnsavedInput();}catch{return true;}})();
      if(unsaved&&!confirm('Dit opent het opgeslagen stuk. Je niet-opgeslagen invoer wordt vervangen. Doorgaan?'))return;
      await $('intake').contentWindow.NikkiIntake.load(await hydrate(row));state.editVersions.set(row.id,row.version);show('intake');say('Stuk geopend.');
    }));
    const foot=el('div','piece-foot'), status=el('span','piece-status',sold?'Verkocht':pending?'Wordt verkocht…':'Beschikbaar');
    foot.append(status);
    if(pending){
      status.setAttribute('role','status');
      const undo=el('button','piece-undo','Ongedaan maken');undo.type='button';undo.setAttribute('aria-label','Ongedaan maken: '+row.data.title+' blijft beschikbaar');
      undo.addEventListener('click',()=>{clearTimeout(pendingSold.get(row.id));pendingSold.delete(row.id);redraw(row.id,'.piece-sold');});
      foot.append(undo);
    }else if(!sold){
      const mark=el('button','piece-sold');mark.type='button';mark.title='Markeer verkocht';mark.setAttribute('aria-label','Markeer verkocht: '+row.data.title);mark.append(icon('tag'));
      // Nothing is saved for five seconds, so a wrong tap can be undone. Sold itself can never be undone.
      mark.addEventListener('click',()=>{pendingSold.set(row.id,setTimeout(()=>commitSold(row.id),UNDO_MS));redraw(row.id,'.piece-undo');});
      foot.append(mark);
    }
    item.append(open,foot);return item;
  }
  function redraw(id,focus){
    const row=state.rows.find(r=>r.id===id), old=[...$('items').children].find(li=>li.dataset.id===id);
    if(!row||!old)return;
    const next=card(row);old.replaceWith(next);if(focus)next.querySelector(focus)?.focus();
  }
  function commitSold(id){
    if(!pendingSold.has(id))return;
    // Another action (a refresh, opening a piece) is running: save as soon as it is done.
    if(state.busy){pendingSold.set(id,setTimeout(()=>commitSold(id),300));return;}
    action(async()=>{
      const row=state.rows.find(r=>r.id===id);
      try{
        if(row&&row.status==='published'){
          const sold=await api.sold(row.id,row.version);if(state.editVersions.has(row.id)&&sold?.version)state.editVersions.set(row.id,sold.version);
        }
      }finally{pendingSold.delete(id);}
      await refresh();say('Als verkocht opgeslagen.');
    }).finally(()=>{if(!pendingSold.has(id))redraw(id);});
  }
  function render(){
    [...$('items').querySelectorAll('.piece')].forEach(li=>li.remove());
    $('empty').hidden=!state.staff||state.rows.length>0;
    if(state.staff)$('items').append(...state.rows.map(card));
  }
  async function refresh(){
    shopStatus('Collectie laden…','loading');
    const next=await api.list();
    const published=next.filter(r=>r.status==='published');
    // One batch: every photo of the available pieces, plus the main photo of sold pieces for the staff grid.
    const soldMain=next.filter(r=>r.status!=='published').map(r=>(r.data.images.find(i=>i.main)||r.data.images[0])?.path).filter(Boolean);
    const urls=await api.imageUrls([...published.flatMap(r=>r.data.images.map(i=>i.path)),...soldMain]);
    const publicRecords=[];let missing=0;
    for(const row of published){const record=withPhotos(row,urls);if(record)publicRecords.push(record);else missing++;}
    state.rows=next;state.skipped=missing;state.lastRefresh=Date.now();thumbs=urls;
    $('shop').contentWindow.NikkiStore.replace(publicRecords.reverse(),published.map(row=>row.id));
    shopStatus('');
    render();
  }
  function startRenewal(){
  // Renew photo links (valid for one hour) before they expire; don't overwrite the in-progress intake form.
  // A tab that was in the background longer than that is refreshed as soon as it is visible again.
  const renew=()=>{if(api.configured()&&!document.hidden&&!state.busy&&Date.now()-state.lastRefresh>40*60*1000)action(refresh);};
  setInterval(renew,5*60*1000);
  document.addEventListener('visibilitychange',renew);
  }
  return {refresh,hydrate,startRenewal};
}
