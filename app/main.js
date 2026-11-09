import {config} from './config.js';
import {Api} from './api.js';
import {prepareImage} from './images.js';
import {transferPhotos} from './photo-transfer.js';
import {shopSource,intakeSource} from './views.js';
const api=new Api(config);
const $=id=>document.getElementById(id);
document.body.dataset.screen='shop';
const editVersions=new Map(); let rows=[],staff=false,busy=false,lastRefresh=0,skipped=0;
const say=message=>{$('status').textContent=message;$('shop').contentWindow.NikkiStore?.status(message);};
function show(screen){
  if(screen==='intake'&&!staff)screen='manage';
  document.body.dataset.screen=screen;
  for(const name of ['shop','intake','manage'])$(name).hidden=name!==screen;
  document.querySelectorAll('button[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===screen)));
}
function controls(){ $('login').hidden=staff;$('new').hidden=!staff;$('logout').hidden=!api.session; }
function mount(frame,source){return new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.srcdoc=source;});}
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
const loaded=base=>base+(staff&&skipped?' '+skipped+(skipped===1?' stuk wordt':' stukken worden')+' niet getoond omdat de foto’s niet bereikbaar zijn.':'');
async function refresh(){
  const next=await api.list();
  const published=next.filter(r=>r.status==='published');
  const urls=await api.imageUrls(published.flatMap(r=>r.data.images.map(i=>i.path)));
  const publicRecords=[];let missing=0;
  for(const row of published){const record=withPhotos(row,urls);if(record)publicRecords.push(record);else missing++;}
  rows=next;skipped=missing;lastRefresh=Date.now();
  $('shop').contentWindow.NikkiStore.replace(publicRecords.reverse());
  $('items').replaceChildren();$('empty').hidden=!staff||rows.length>0;
  if(staff)for(const row of rows){
    const item=document.createElement('li');const label=document.createElement('span');
    label.textContent=row.data.title+' — '+(row.status==='sold'?'Verkocht':'Beschikbaar');item.append(label);
    const edit=document.createElement('button');edit.textContent='Bewerken';
    edit.addEventListener('click',()=>action(async()=>{
      if(!confirm('Dit opent het opgeslagen stuk. Eventuele niet-opgeslagen invoer wordt vervangen. Doorgaan?'))return;
      await $('intake').contentWindow.NikkiIntake.load(await hydrate(row));editVersions.set(row.id,row.version);show('intake');say('Stuk geopend.');
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
async function action(task){
  if(busy)return;busy=true;
  try{await task();}catch(error){say(error.message);}finally{busy=false;controls();}
}
window.NikkiApp={
  openAccount:()=>show('manage'),
  prepareImage,
  preparePhotos:(photos,primary)=>transferPhotos(photos,primary,{prepareImage}),
  async analyse(files,signal){
    if(!staff)throw Error('Log eerst in.');
    try{return await api.analyse(files,signal);}catch(e){if(e.name==='AbortError')throw Object.assign(new Error('Analyse gestopt.'),{code:'cancelled'});throw e;}
  },
  async publish(product){
    if(!staff)throw Error('Log eerst in.');
    const saved=await api.save(product,editVersions.get(product.key)||0);
    editVersions.set(product.key,saved.version);
    try{await refresh();show('shop');say(saved.status==='sold'?'Wijziging opgeslagen. Dit stuk blijft verkocht.':product.title+' is opgeslagen en staat in de boetiek.');}
    catch{say('Het stuk is opgeslagen. De collectie kon niet worden vernieuwd; probeer Collectie vernieuwen.');}
  }
};
document.querySelectorAll('button[data-screen]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
$('reload').addEventListener('click',()=>action(async()=>{await refresh();say(loaded('Collectie vernieuwd.'));}));
$('login').addEventListener('submit',event=>{event.preventDefault();action(async()=>{
  await api.login($('email').value,$('password').value);$('password').value='';staff=true;controls();await refresh();say('Ingelogd. Je kunt nu stukken invoeren.');
});});
$('logout').addEventListener('click',()=>action(async()=>{try{await api.logout();}finally{location.reload();}}));
await Promise.all([mount($('shop'),shopSource),mount($('intake'),intakeSource)]);
// The management shell uses the palette of the chosen storefront.
const shopRoot=$('shop').contentDocument.documentElement;
const syncStyle=()=>{
  const style=$('shop').contentWindow.getComputedStyle(shopRoot);
  for(const name of ['bg','fg','muted','line'])document.documentElement.style.setProperty('--'+name,style.getPropertyValue('--'+name));
  document.documentElement.style.colorScheme=style.colorScheme;
};
syncStyle();
if(!api.configured()){
  say('De boetiek wordt ingericht. Inloggen en opslaan zijn nog niet aangesloten.');$('login').querySelector('button').disabled=true;$('reload').disabled=true;
}else await action(async()=>{
  if(api.session){try{await api.request('/rest/v1/rpc/require_staff',{method:'POST',body:{}});staff=true;}catch{api.keep(null);}}
  controls();await refresh();say(loaded('Collectie geladen.'));
});
// Renew photo links (valid for one hour) before they expire; don't overwrite the in-progress intake form.
// A tab that was in the background longer than that is refreshed as soon as it is visible again.
const renew=()=>{if(api.configured()&&!document.hidden&&!busy&&Date.now()-lastRefresh>40*60*1000)action(refresh);};
setInterval(renew,5*60*1000);
document.addEventListener('visibilitychange',renew);
