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
  async function refresh(){
    shopStatus('Collectie laden…','loading');
    const next=await api.list();
    const published=next.filter(r=>r.status==='published');
    const urls=await api.imageUrls(published.flatMap(r=>r.data.images.map(i=>i.path)));
    const publicRecords=[];let missing=0;
    for(const row of published){const record=withPhotos(row,urls);if(record)publicRecords.push(record);else missing++;}
    state.rows=next;state.skipped=missing;state.lastRefresh=Date.now();
    $('shop').contentWindow.NikkiStore.replace(publicRecords.reverse(),published.map(row=>row.id));
    shopStatus('');
    $('items').replaceChildren();$('empty').hidden=!state.staff||state.rows.length>0;
    if(state.staff)for(const row of state.rows){
      const item=document.createElement('li');const label=document.createElement('span');
      label.textContent=row.data.title+' — '+(row.status==='sold'?'Verkocht':'Beschikbaar');item.append(label);
      const edit=document.createElement('button');edit.textContent='Bewerken';
      edit.addEventListener('click',()=>action(async()=>{
        if(!confirm('Dit opent het opgeslagen stuk. Eventuele niet-opgeslagen invoer wordt vervangen. Doorgaan?'))return;
        await $('intake').contentWindow.NikkiIntake.load(await hydrate(row));state.editVersions.set(row.id,row.version);show('intake');say('Stuk geopend.');
      }));item.append(edit);
      if(row.status==='published'){
        const sold=document.createElement('button');sold.textContent='Markeer verkocht';
        sold.addEventListener('click',()=>action(async()=>{
          if(!confirm('Markeer “'+row.data.title+'” als verkocht? Het verdwijnt uit de beschikbare collectie.'))return;
          await api.sold(row.id,row.version);await refresh();say('Als verkocht opgeslagen.');
        }));item.append(sold);
      }
      $('items').append(item);
    }
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
